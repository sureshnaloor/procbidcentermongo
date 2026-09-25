import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser, requireCompanyProfile, requireVerifiedCompanyProfile } from '@/lib/auth-helpers';
import { saveTenderDocumentFile } from '@/lib/tender-files';
import { normalizeTenderClauses } from '@/lib/clauses';
import { DOCUMENT_CATEGORY_VALUES, getPublishBlockers, getPublishDateIssues } from '@/lib/procurement';
import { ensureInviteAccessToken, isVendorBlacklisted } from '@/lib/offer-link';
import { INCOTERM_CODES } from '@/lib/incoterms';
import type { ITenderBoqItem } from '@/lib/types';

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

const tenderBoqItemInput = z.object({
  lineCode: z.string().max(40).optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(40),
  groupId: z.string().optional(),
  itemId: z.string().optional(),
});

function normalizeBoqItems(items: z.infer<typeof tenderBoqItemInput>[]): ITenderBoqItem[] {
  return items.map((item, i) => ({
    lineCode: item.lineCode?.trim() || `BOQ-${String(i + 1).padStart(3, '0')}`,
    description: item.description.trim(),
    quantity: item.quantity,
    unit: item.unit.trim(),
    groupId: item.groupId && ObjectId.isValid(item.groupId) ? new ObjectId(item.groupId) : undefined,
    itemId: item.itemId && ObjectId.isValid(item.itemId) ? new ObjectId(item.itemId) : undefined,
  }));
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

  const { materialServiceGroups, materialServiceTypes, tenderInvites, bids } = await collections();
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
  const myBid = isVendor && profile?._id
    ? await bids.find({ tenderId: tender._id!, vendorProfileId: profile._id }).sort({ createdAt: -1 }).limit(1).next()
    : null;
  const blacklisted = isVendor && profile?._id
    ? await isVendorBlacklisted(tender.companyProfileId, profile._id)
    : false;
  const canPrepareOffer = isVendor && !isBiddingClosed(tender) && !blacklisted && !myBid && (myInvite?.status === 'invited' || myInvite?.status === 'accepted');
  const canModifyOffer = isVendor && !isBiddingClosed(tender) && myBid?.status === 'draft';
  let offerAccessPath: string | null = null;
  if (myInvite && (myInvite.status === 'invited' || myInvite.status === 'accepted')) {
    const token = await ensureInviteAccessToken(myInvite);
    offerAccessPath = `/offer/${token}`;
  }

  const canEdit = isOwner && tender.status === 'draft';
  const publishBlockers = [
    ...getPublishBlockers({
      type: tender.type,
      documents: tender.documents,
      boqItems: tender.boqItems,
    }),
    ...getPublishDateIssues(tender.bidDeadline, tender.deliveryDeadline).blockers,
  ];
  const publishWarnings = isOwner
    ? getPublishDateIssues(tender.bidDeadline, tender.deliveryDeadline).warnings
    : [];

  return NextResponse.json({
    ...tender,
    categories: groups.filter(Boolean),
    company,
    biddingClosed: isBiddingClosed(tender),
    canEdit,
    canPublish: isOwner && tender.status === 'draft' && publishBlockers.length === 0,
    publishBlockers: isOwner ? publishBlockers : [],
    publishWarnings,
    canExtendDeadline: isOwner,
    canDelete: isOwner,
    participation: myInvite
      ? { status: myInvite.status, inviteId: myInvite._id, canPrepareOffer, canModifyOffer, offerAccessPath }
      : { status: null, inviteId: null, canPrepareOffer: false, canModifyOffer: false, offerAccessPath: null },
    myBid: myBid ? { _id: myBid._id, status: myBid.status } : null,
    blacklisted,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireVerifiedCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tender.companyProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only edit your own tenders' }, { status: 403 });
  }

  const body = await req.json();
  const data = z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(['rfp', 'rfq', 'tender']).optional(),
    bidDeadline: z.string().optional(),
    deliveryDeadline: z.string().optional(),
    estimatedValue: z.number().optional(),
    currency: z.string().optional(),
    incoterm: z.enum(INCOTERM_CODES).nullable().optional(),
    incotermPlace: z.string().max(200).optional(),
    location: z.string().optional(),
    requirements: z.string().optional(),
    termsConditions: z.string().optional(),
    status: z.enum(['draft','published','closed','awarded','cancelled']).optional(),
    statusRemarks: z.string().max(2000).optional(),
    awardedToVendorId: z.string().optional(),
    awardedVendorName: z.string().optional(),
    awardedBidId: z.string().optional(),
    awardedAmount: z.number().optional(),
    awardedCurrency: z.string().optional(),
    groupIds: z.array(z.string()).optional(),
    clauses: z.array(z.object({
      kind: z.enum(['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal', 'custom']),
      slug: z.string().optional(),
      title: z.string().min(1).max(200),
      body: z.string().min(1),
      required: z.boolean().default(true),
    })).optional(),
    boqItems: z.array(tenderBoqItemInput).optional(),
    documents: z.array(z.object({
      category: z.enum(DOCUMENT_CATEGORY_VALUES),
      fileName: z.string(),
      fileType: z.string().optional(),
      fileBase64: z.string(),
    })).optional(),
  }).parse(body);

  if (tender.status !== 'draft' && data.status === 'draft') {
    return NextResponse.json({ error: 'A published package cannot be reverted to draft' }, { status: 400 });
  }

  const allowedPostPublishKeys = new Set([
    'status',
    'statusRemarks',
    'awardedToVendorId',
    'awardedVendorName',
    'awardedBidId',
    'awardedAmount',
    'awardedCurrency',
    'bidDeadline',
  ]);
  const publishing = data.status === 'published' && tender.status !== 'published';
  if (tender.status !== 'draft' && !publishing) {
    const extras = Object.keys(data).filter(
      (k) => !allowedPostPublishKeys.has(k) && data[k as keyof typeof data] !== undefined
    );
    if (extras.length > 0) {
      return NextResponse.json({ error: 'This package is published and core fields can no longer be edited' }, { status: 400 });
    }
  }

  const nextDeadline = data.bidDeadline ? parseDateEndOfDay(data.bidDeadline) : tender.bidDeadline;
  const nextDelivery = data.deliveryDeadline ? parseDateEndOfDay(data.deliveryDeadline) : tender.deliveryDeadline;

  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title) setFields.title = data.title;
  if (data.description !== undefined) setFields.description = data.description;
  if (data.type) setFields.type = data.type;
  if (data.bidDeadline) setFields.bidDeadline = parseDateEndOfDay(data.bidDeadline);
  if (data.deliveryDeadline) setFields.deliveryDeadline = parseDateEndOfDay(data.deliveryDeadline);
  if (data.estimatedValue !== undefined) setFields.estimatedValue = data.estimatedValue;
  if (data.currency) setFields.currency = data.currency;
  if (data.incoterm !== undefined) {
    setFields.incoterm = data.incoterm ?? undefined;
    setFields.incotermPlace = data.incoterm ? data.incotermPlace : undefined;
  } else if (data.incotermPlace !== undefined) {
    setFields.incotermPlace = data.incotermPlace;
  }
  if (data.location !== undefined) setFields.location = data.location;
  if (data.requirements !== undefined) setFields.requirements = data.requirements;
  if (data.termsConditions !== undefined) setFields.termsConditions = data.termsConditions;
  if (data.status) {
    setFields.status = data.status;
    if (data.status === 'awarded') setFields.awardedAt = new Date();
    if (data.status === 'closed') setFields.closedAt = new Date();
    if (data.status === 'cancelled') setFields.cancelledAt = new Date();
  }
  if (data.statusRemarks !== undefined) setFields.statusRemarks = data.statusRemarks;
  if (data.awardedToVendorId !== undefined) {
    setFields.awardedToVendorId = data.awardedToVendorId && ObjectId.isValid(data.awardedToVendorId) ? new ObjectId(data.awardedToVendorId) : undefined;
  }
  if (data.awardedVendorName !== undefined) setFields.awardedVendorName = data.awardedVendorName;
  if (data.awardedBidId !== undefined) {
    setFields.awardedBidId = data.awardedBidId && ObjectId.isValid(data.awardedBidId) ? new ObjectId(data.awardedBidId) : undefined;
  }
  if (data.awardedAmount !== undefined) setFields.awardedAmount = data.awardedAmount;
  if (data.awardedCurrency !== undefined) setFields.awardedCurrency = data.awardedCurrency;

  if (data.status === 'awarded' && data.awardedBidId && ObjectId.isValid(data.awardedBidId)) {
    const { bids } = await collections();
    await bids.updateOne(
      { _id: new ObjectId(data.awardedBidId), tenderId: new ObjectId(id) },
      { $set: { status: 'accepted', updatedAt: new Date() } }
    );
  }

  if (data.groupIds) setFields.groupIds = data.groupIds.map((gid) => new ObjectId(gid));
  if (data.clauses) setFields.clauses = normalizeTenderClauses(data.clauses);
  if (data.boqItems) setFields.boqItems = normalizeBoqItems(data.boqItems);

  const nextType = (data.type ?? tender.type) as typeof tender.type;
  const nextBoqItems = data.boqItems ? normalizeBoqItems(data.boqItems) : (tender.boqItems ?? []);
  const pendingDocs = (data.documents ?? []).map((doc) => ({ category: doc.category }));
  const nextDocuments = [...(tender.documents ?? []), ...pendingDocs];
  const typeChangedWhileLive = Boolean(data.type) && data.type !== tender.type && tender.status !== 'draft';
  if (publishing || typeChangedWhileLive) {
    const blockers = [
      ...getPublishBlockers({
        type: nextType,
        documents: nextDocuments,
        boqItems: nextBoqItems,
      }),
      ...getPublishDateIssues(nextDeadline, nextDelivery).blockers,
    ];
    if (blockers.length > 0) {
      return NextResponse.json({ error: blockers[0], blockers }, { status: 400 });
    }
  }

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
