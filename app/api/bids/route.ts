import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireVendorProfile } from '@/lib/auth-helpers';
import { assertVendorCanOffer, isBidDeadlineOpen } from '@/lib/tender-access';
import { bidLineItemInput, lineItemsTotal, normalizeStoredLineItem, resolvedBidTotal } from '@/lib/bid-line';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { bids, tenders, profiles } = await collections();

  let rows;
  if (auth.user.role === 'admin') {
    rows = await bids.find({}).sort({ createdAt: -1 }).toArray();
  } else {
    const profile = await profiles.findOne({ userId: new ObjectId(auth.user.id) });
    if (!profile) return NextResponse.json([]);
    if (profile.userType === 'vendor') {
      rows = await bids.find({ vendorProfileId: profile._id! }).sort({ createdAt: -1 }).toArray();
    } else if (profile.userType === 'company') {
      const myTenders = await tenders.find({ companyProfileId: profile._id! }).project({ _id: 1 }).toArray();
      const ids = myTenders.map((t) => t._id!);
      if (ids.length === 0) return NextResponse.json([]);
      rows = await bids.find({ tenderId: { $in: ids }, status: { $ne: 'draft' } }).sort({ createdAt: -1 }).toArray();
    } else {
      return NextResponse.json([]);
    }
  }

  const vendorIds = [...new Set(rows.map((b) => b.vendorProfileId.toString()))].map((id) => new ObjectId(id));
  const tenderIds = [...new Set(rows.map((b) => b.tenderId.toString()))].map((id) => new ObjectId(id));
  const [vendorDocs, tenderDocs] = await Promise.all([
    vendorIds.length ? profiles.find({ _id: { $in: vendorIds } }).toArray() : Promise.resolve([]),
    tenderIds.length ? tenders.find({ _id: { $in: tenderIds } }).toArray() : Promise.resolve([]),
  ]);
  const vendorById = new Map(vendorDocs.map((v) => [v._id!.toString(), {
    _id: v._id,
    companyName: v.companyName,
    contactPerson: v.contactPerson,
    phone: v.phone,
    city: v.city,
    country: v.country,
    registrationNumber: v.registrationNumber,
  }]));
  const tenderById = new Map(tenderDocs.map((t) => [t._id!.toString(), {
    _id: t._id,
    title: t.title,
    type: t.type,
    status: t.status,
    bidDeadline: t.bidDeadline,
    currency: t.currency,
  }]));

  return NextResponse.json(rows.map((b) => ({
    ...b,
    totalPrice: resolvedBidTotal(b),
    vendor: vendorById.get(b.vendorProfileId.toString())
      ?? (b.isOffline && b.offlineSupplier
        ? {
            companyName: b.offlineSupplier.name,
            contactPerson: b.offlineSupplier.contactPerson,
            phone: b.offlineSupplier.phone,
            city: b.offlineSupplier.city,
            country: b.offlineSupplier.country,
          }
        : null),
    tender: tenderById.get(b.tenderId.toString()) ?? null,
  })));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const vendor = await requireVendorProfile(auth);
  if (isNextResponse(vendor)) return vendor;

  const body = await req.json();
  const data = z.object({
    tenderId: z.string(),
    totalPrice: z.number().optional(),
    currency: z.string().default('USD'),
    validityDays: z.number().default(90),
    discountType: z.enum(['percent', 'amount']).nullable().optional(),
    discountValue: z.number().min(0).nullable().optional(),
    vatPercent: z.number().min(0).max(100).nullable().optional(),
    otherCharges: z.array(z.object({
      label: z.string().min(1).max(80),
      type: z.enum(['value', 'percent']).optional(),
      amount: z.number().min(0),
    })).max(12).optional(),
    technicalProposal: z.string().optional(),
    commercialProposal: z.string().optional(),
    notes: z.string().optional(),
    clauseResponses: z.array(z.object({
      kind: z.enum(['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal', 'custom']),
      slug: z.string().optional(),
      accepted: z.boolean(),
      comments: z.string().optional(),
      originalBody: z.string().optional(),
      proposedBody: z.string().optional(),
    })).default([]),
    lineItems: z.array(bidLineItemInput).optional(),
  }).parse(body);

  const { tenders, bids, bidHistory } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(data.tenderId) });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  if (tender.status !== 'published') return NextResponse.json({ error: 'Offers can only be submitted on published tenders' }, { status: 400 });
  if (!isBidDeadlineOpen(tender.bidDeadline)) return NextResponse.json({ error: 'Bid deadline has passed' }, { status: 400 });

  const allowed = await assertVendorCanOffer(tender._id!, vendor._id!);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: 403 });

  const existing = await bids.findOne({ tenderId: tender._id!, vendorProfileId: vendor._id! });
  if (existing) {
    if (existing.status === 'draft') {
      return NextResponse.json({ error: 'A draft offer already exists', bidId: existing._id }, { status: 409 });
    }
    return NextResponse.json({ error: 'You already have an offer on this package' }, { status: 400 });
  }

  const storedLines = (data.lineItems ?? []).map((item) => normalizeStoredLineItem(item));
  const now = new Date();
  const result = await bids.insertOne({
    tenderId: tender._id!,
    vendorProfileId: vendor._id!,
    status: 'draft',
    totalPrice: storedLines.length > 0 ? lineItemsTotal(storedLines) : data.totalPrice,
    currency: data.currency,
    validityDays: data.validityDays,
    discountType: data.discountType ?? undefined,
    discountValue: data.discountValue ?? undefined,
    vatPercent: data.vatPercent ?? undefined,
    otherCharges: data.otherCharges,
    technicalProposal: data.technicalProposal,
    commercialProposal: data.commercialProposal,
    notes: data.notes,
    clauseResponses: data.clauseResponses,
    lineItems: storedLines,
    createdAt: now,
    updatedAt: now,
  });

  await bidHistory.insertOne({
    bidId: result.insertedId,
    fieldName: 'status',
    oldValue: undefined,
    newValue: 'draft',
    changedBy: auth.user.displayName,
    createdAt: now,
  });

  return NextResponse.json(await bids.findOne({ _id: result.insertedId }), { status: 201 });
}
