import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { isBidDeadlineOpen } from '@/lib/tender-access';
import { decodeBase64File } from '@/lib/boq-sheet';
import { parseOfflineBidWorkbook } from '@/lib/offline-bid';
import { lineItemsTotal, normalizeStoredLineItem } from '@/lib/bid-line';
import { deleteBidSignatureFile, saveBidOfferDocumentFile, saveBidWorkbookFile } from '@/lib/bid-files';
import type { IOfflineSupplier } from '@/lib/types';

const uploadSchema = z.object({
  supplier: z.object({
    name: z.string().max(200).optional(),
    email: z.string().max(200).optional(),
    contactPerson: z.string().max(200).optional(),
    phone: z.string().max(60).optional(),
    city: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
  }).optional(),
  workbook: z.object({ name: z.string().min(1), base64: z.string().min(1) }),
  signedPdf: z.object({ name: z.string().min(1), base64: z.string().min(1) }).optional(),
});

function sameSupplier(a: IOfflineSupplier | undefined, email?: string, name?: string): boolean {
  if (!a) return false;
  if (email && a.email && a.email.trim().toLowerCase() === email.trim().toLowerCase()) return true;
  return Boolean(name && a.name.trim().toLowerCase() === name.trim().toLowerCase());
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId } = await params;
  if (!ObjectId.isValid(tenderId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders, bids, bidHistory } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = auth.user.role === 'admin';
  const profile = await getProfileForUser(auth.user.id);
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  if (tender.status !== 'published') {
    return NextResponse.json({ error: 'Offline offers can be uploaded only while the package is published' }, { status: 400 });
  }
  if (!isBidDeadlineOpen(tender.bidDeadline)) {
    return NextResponse.json({ error: 'The bid deadline has passed; offline offers can no longer be uploaded' }, { status: 400 });
  }

  const body = uploadSchema.parse(await req.json());

  let parsed: ReturnType<typeof parseOfflineBidWorkbook>;
  try {
    parsed = parseOfflineBidWorkbook(decodeBase64File(body.workbook.base64), tender);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read the workbook' },
      { status: 400 }
    );
  }

  const form = body.supplier ?? {};
  const supplier: IOfflineSupplier = {
    name: (parsed.supplier.name || form.name || '').trim(),
    email: (parsed.supplier.email || form.email || '').trim() || undefined,
    contactPerson: (parsed.supplier.contactPerson || form.contactPerson || '').trim() || undefined,
    phone: (parsed.supplier.phone || form.phone || '').trim() || undefined,
    city: (parsed.supplier.city || form.city || '').trim() || undefined,
    country: (parsed.supplier.country || form.country || '').trim() || undefined,
  };
  if (!supplier.name) {
    return NextResponse.json({ error: 'Supplier company name is required (Summary sheet or the form)' }, { status: 400 });
  }

  // Store the uploaded files.
  let workbookFile;
  try {
    workbookFile = await saveBidWorkbookFile(body.workbook.name, body.workbook.base64);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not store the workbook' }, { status: 400 });
  }
  let signedOffer = null;
  if (body.signedPdf) {
    try {
      const saved = await saveBidOfferDocumentFile(body.signedPdf.name, body.signedPdf.base64);
      signedOffer = saved;
    } catch (error) {
      await deleteBidSignatureFile(workbookFile.storedName);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not store the signed PDF' }, { status: 400 });
    }
  }

  const now = new Date();
  const storedLines = parsed.lineItems.map((item) => normalizeStoredLineItem(item));
  const workbookDoc = {
    name: body.workbook.name,
    fileUrl: workbookFile.fileUrl,
    storedName: workbookFile.storedName,
    fileType: workbookFile.ext,
    fileSize: workbookFile.fileSize,
    uploadedAt: now,
    uploadedBy: auth.user.displayName,
  };
  const signedDoc = signedOffer
    ? [{
        name: body.signedPdf!.name,
        fileUrl: signedOffer.fileUrl,
        storedName: signedOffer.storedName,
        fileType: signedOffer.ext,
        fileSize: signedOffer.fileSize,
        uploadedAt: now,
        uploadedBy: auth.user.displayName,
      }]
    : [];

  // Duplicate supplier on this package → update the existing offline bid and replace its files.
  const offlineBids = await bids.find({ tenderId: tender._id!, isOffline: true }).toArray();
  const existing = offlineBids.find((b) => sameSupplier(b.offlineSupplier, supplier.email, supplier.name));

  const fields = {
    status: 'submitted' as const,
    isOffline: true,
    offlineSupplier: supplier,
    offlineWorkbook: workbookDoc,
    signedOffers: signedDoc,
    totalPrice: storedLines.length > 0 ? lineItemsTotal(storedLines) : undefined,
    currency: parsed.offer.currency || tender.currency || 'USD',
    validityDays: parsed.offer.validityDays ?? 90,
    discountType: parsed.offer.discountType,
    discountValue: parsed.offer.discountValue,
    vatPercent: parsed.offer.vatPercent,
    otherCharges: parsed.offer.otherCharges,
    technicalProposal: parsed.offer.technicalProposal,
    commercialProposal: parsed.offer.commercialProposal,
    notes: parsed.offer.notes,
    lineItems: storedLines,
    clauseResponses: parsed.clauseResponses,
    submittedAt: now,
    updatedAt: now,
  };

  let bidId: ObjectId;
  let updated = false;
  if (existing) {
    updated = true;
    bidId = existing._id!;
    const oldFiles = [
      existing.offlineWorkbook?.storedName,
      ...(existing.signedOffers ?? []).map((o) => o.storedName),
    ].filter((n): n is string => Boolean(n));
    await bids.updateOne({ _id: bidId }, { $set: fields });
    await Promise.all(oldFiles.map((name) => deleteBidSignatureFile(name)));
  } else {
    const result = await bids.insertOne({
      ...fields,
      tenderId: tender._id!,
      vendorProfileId: new ObjectId(),
      createdAt: now,
    });
    bidId = result.insertedId;
  }

  await bidHistory.insertOne({
    bidId,
    fieldName: 'offlineUpload',
    newValue: `${supplier.name} (${body.workbook.name})`,
    changedBy: auth.user.displayName,
    createdAt: now,
  });

  const bid = await bids.findOne({ _id: bidId });
  return NextResponse.json({ bid, warnings: parsed.warnings, updated }, { status: updated ? 200 : 201 });
}
