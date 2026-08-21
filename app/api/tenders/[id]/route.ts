import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser, requireCompanyProfile } from '@/lib/auth-helpers';
import { saveTenderDocumentFile } from '@/lib/tender-files';
import { normalizeTenderClauses } from '@/lib/clauses';

function parseDateEndOfDay(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59`);
  return new Date(value);
}

function isBidDeadlineOpen(deadline?: Date | null): boolean {
  if (!deadline) return true;
  return deadline.getTime() >= Date.now();
}

function isBiddingClosed(tender: { status: string; bidDeadline?: Date | null }): boolean {
  if (['closed','awarded','cancelled'].includes(tender.status)) return true;
  return !isBidDeadlineOpen(tender.bidDeadline);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json(null);

  const { tenders, profiles } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) });
  if (!tender) return NextResponse.json(null);

  // Auth check
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = auth.user.role !== 'admin' ? await getProfileForUser(auth.user.id) : null;

  const isAdmin = auth.user.role === 'admin';
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  const isVendor = profile?.userType === 'vendor';

  if (!isAdmin && !isOwner && !(isVendor && tender.status !== 'draft')) {
    return NextResponse.json(null);
  }

  const { materialServiceGroups, materialServiceTypes, tenderInvites } = await collections();
  const company = await profiles.findOne({ _id: tender.companyProfileId });
  const groups = await Promise.all(
    tender.groupIds.map(async (gid) => {
      const g = await materialServiceGroups.findOne({ _id: gid });
      const t = g ? await materialServiceTypes.findOne({ _id: g.typeId }) : null;
      return g ? { id: g._id, name: g.name, typeName: t?.name } : null;
    })
  );

  const myInvite = isVendor && profile?._id
    ? await tenderInvites.findOne({ tenderId: tender._id!, vendorProfileId: profile._id })
    : null;
  const canPrepareOffer = isVendor && !isBiddingClosed(tender) && (myInvite?.status === 'invited' || myInvite?.status === 'accepted');

  return NextResponse.json({
    ...tender,
    categories: groups.filter(Boolean),
    company,
    biddingClosed: isBiddingClosed(tender),
    canEdit: isOwner && isBidDeadlineOpen(tender.bidDeadline),
    canExtendDeadline: isOwner,
    canDelete: isOwner,
    participation: myInvite
      ? { status: myInvite.status, inviteId: myInvite._id, canPrepareOffer }
      : { status: null, inviteId: null, canPrepareOffer: false },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tender.companyProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only edit your own tenders' }, { status: 403 });
  }

  const deadlineOpen = isBidDeadlineOpen(tender.bidDeadline);
  const body = await req.json();
  const data = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(['rfp', 'rfq', 'tender']).optional(),
    bidDeadline: z.string().optional(),
    deliveryDeadline: z.string().optional(),
    estimatedValue: z.number().optional(),
    currency: z.string().optional(),
    location: z.string().optional(),
    requirements: z.string().optional(),
    termsConditions: z.string().optional(),
    status: z.enum(['draft','published','closed','awarded','cancelled']).optional(),
    groupIds: z.array(z.string()).optional(),
    clauses: z.array(z.object({
      kind: z.enum(['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal', 'custom']),
      slug: z.string().optional(),
      title: z.string().min(1).max(200),
      body: z.string().min(1),
      required: z.boolean().default(true),
    })).optional(),
    documents: z.array(z.object({
      category: z.enum(['drawing','terms','other']),
      fileName: z.string(),
      fileType: z.string().optional(),
      fileBase64: z.string(),
    })).optional(),
  }).parse(body);

  const nextDeadline = data.bidDeadline ? parseDateEndOfDay(data.bidDeadline) : undefined;
  const isExtending = nextDeadline && nextDeadline.getTime() >= Date.now();
  if (!deadlineOpen && !isExtending && data.bidDeadline === undefined) {
    if (Object.keys(data).some(k => !['bidDeadline','deliveryDeadline','status'].includes(k) && data[k as keyof typeof data] !== undefined)) {
      return NextResponse.json({ error: 'Tender can no longer be edited — extend the deadline first' }, { status: 400 });
    }
  }

  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title) setFields.title = data.title;
  if (data.description !== undefined) setFields.description = data.description;
  if (data.type) setFields.type = data.type;
  if (data.bidDeadline) setFields.bidDeadline = parseDateEndOfDay(data.bidDeadline);
  if (data.deliveryDeadline) setFields.deliveryDeadline = parseDateEndOfDay(data.deliveryDeadline);
  if (data.estimatedValue !== undefined) setFields.estimatedValue = data.estimatedValue;
  if (data.currency) setFields.currency = data.currency;
  if (data.location !== undefined) setFields.location = data.location;
  if (data.requirements !== undefined) setFields.requirements = data.requirements;
  if (data.termsConditions !== undefined) setFields.termsConditions = data.termsConditions;
  if (data.status) setFields.status = data.status;
  if (data.groupIds) setFields.groupIds = data.groupIds.map((gid) => new ObjectId(gid));
  if (data.clauses) setFields.clauses = normalizeTenderClauses(data.clauses);

  if (data.documents && data.documents.length > 0) {
    const newDocs = [];
    for (const doc of data.documents) {
      const stored = await saveTenderDocumentFile(doc.fileName, doc.fileBase64);
      newDocs.push({
        category: doc.category, name: doc.fileName, fileUrl: stored.fileUrl,
        storedName: stored.storedName, fileType: doc.fileType || stored.ext,
        fileSize: stored.fileSize, createdAt: new Date(),
      });
    }
    // Push new documents into existing array
    await tenders.updateOne({ _id: new ObjectId(id) }, { $push: { documents: { $each: newDocs } } });
  }

  await tenders.updateOne({ _id: new ObjectId(id) }, { $set: setFields });
  return NextResponse.json(await tenders.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tender.companyProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only delete your own tenders' }, { status: 403 });
  }

  // Delete document files
  const { deleteTenderDocumentFile } = await import('@/lib/tender-files');
  await Promise.all(tender.documents.map((d) => deleteTenderDocumentFile(d.storedName)));

  await tenders.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
