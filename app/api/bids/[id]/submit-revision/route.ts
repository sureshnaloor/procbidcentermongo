import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { applyRevisionDraft, revisedSnapshot } from '@/lib/bid-revision';
import { resolvedBidTotal } from '@/lib/bid-line';
import { matchesClause } from '@/lib/clauses';
import { hasRegisteredDsc, dscIsValidOn } from '@/lib/dsc';
import { hashBidDocument } from '@/lib/bid-hash';
import { saveBidSignatureFile } from '@/lib/bid-files';
import { postOfferThreadSystemMessage, systemMessageText } from '@/lib/offer-thread-system';
import type { IBidSignature } from '@/lib/types';

const submitBody = z.object({
  signWithDsc: z.boolean().optional(),
  signedPdfName: z.string().max(200).optional(),
  signedPdfBase64: z.string().optional(),
}).optional();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, tenders, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tender = await tenders.findOne({ _id: bid.tenderId });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  const isVendorOwner = profile?.userType === 'vendor' && bid.vendorProfileId.toString() === profile._id!.toString();
  const isCompanyOwner = profile?.userType === 'company' && tender.companyProfileId.toString() === profile._id!.toString();
  const request = bid.revisionRequest;
  if (!request?.open) return NextResponse.json({ error: 'No open revision on this offer' }, { status: 400 });
  if (request.source === 'vendor_invite' && !isVendorOwner) {
    return NextResponse.json({ error: 'Only the invited supplier can submit this revised offer' }, { status: 403 });
  }
  if (request.source === 'company_verbal' && !isCompanyOwner) {
    return NextResponse.json({ error: 'Only the company can save a verbal-agreement revision' }, { status: 403 });
  }

  const applied = applyRevisionDraft(bid, bid.revisionDraft);
  const requiredClauses = (tender.clauses ?? []).filter((c) => c.required);
  for (const clause of requiredClauses) {
    const response = (applied.clauseResponses ?? []).find((r) => matchesClause(clause, r));
    if (!response?.accepted) {
      return NextResponse.json({ error: `Accept or accept with conditions: ${clause.title}` }, { status: 400 });
    }
  }

  let payload: z.infer<typeof submitBody> = {};
  try {
    payload = submitBody.parse(await req.json()) ?? {};
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Invalid submit payload' }, { status: 400 });
    }
  }

  const now = new Date();
  const nextStatus = 'under_review' as const;
  const live = {
    ...applied,
    status: nextStatus,
    submittedAt: now,
    revisedAt: now,
  };
  const versions = [...(bid.versions ?? []), revisedSnapshot(live, auth.user.displayName, request.source)];
  const setFields: Record<string, unknown> = {
    totalPrice: live.totalPrice,
    currency: live.currency,
    validityDays: live.validityDays,
    technicalProposal: live.technicalProposal,
    commercialProposal: live.commercialProposal,
    notes: live.notes,
    lineItems: live.lineItems,
    clauseResponses: live.clauseResponses,
    status: nextStatus,
    submittedAt: now,
    revisedAt: now,
    versions,
    revisionRequest: { ...request, open: false },
    updatedAt: now,
  };

  if (isVendorOwner && hasRegisteredDsc(profile?.dsc)) {
    if (!payload?.signWithDsc) {
      return NextResponse.json({ error: 'This revised offer must be digitally signed with your registered DSC' }, { status: 400 });
    }
    if (!dscIsValidOn(profile!.dsc, now)) {
      return NextResponse.json({ error: 'Your registered DSC is outside its validity period' }, { status: 400 });
    }
    const signature: IBidSignature = {
      method: 'dsc',
      signedAt: now,
      holderName: profile!.dsc!.holderName!.trim(),
      serialNumber: profile!.dsc!.serialNumber!.trim(),
      issuer: profile!.dsc?.issuer?.trim() || undefined,
      documentHash: hashBidDocument(live),
    };
    if (payload.signedPdfBase64 && payload.signedPdfName) {
      const saved = await saveBidSignatureFile(payload.signedPdfName, payload.signedPdfBase64);
      signature.signedPdfName = payload.signedPdfName;
      signature.signedPdfUrl = saved.fileUrl;
    }
    setFields.signature = signature;
  }

  await bids.updateOne({ _id: bid._id! }, { $set: setFields, $unset: { revisionDraft: '' } });
  await bidHistory.insertOne({
    bidId: bid._id!,
    fieldName: 'revision_submitted',
    oldValue: String(resolvedBidTotal(bid) ?? bid.totalPrice ?? ''),
    newValue: String(live.totalPrice ?? ''),
    changedBy: auth.user.displayName,
    createdAt: now,
  });
  if (profile?._id) {
    try {
      await postOfferThreadSystemMessage({
        tenderId: tender._id!,
        companyProfileId: tender.companyProfileId,
        vendorProfileId: bid.vendorProfileId,
        actorProfileId: profile._id,
        bidId: bid._id!,
        event: 'revision_submitted',
        content: systemMessageText('revision_submitted'),
      });
    } catch { /* ignore */ }
  }
  return NextResponse.json(await bids.findOne({ _id: bid._id! }));
}
