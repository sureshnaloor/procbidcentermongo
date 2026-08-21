import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireVendorProfile } from '@/lib/auth-helpers';
import { assertVendorCanOffer } from '@/lib/tender-access';

function isBidDeadlineOpen(deadline?: Date | null): boolean {
  if (!deadline) return true;
  return deadline.getTime() >= Date.now();
}

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { bids, tenders } = await collections();
  if (auth.user.role === 'admin') {
    return NextResponse.json(await bids.find({}).sort({ createdAt: -1 }).toArray());
  }
  const { profiles } = await collections();
  const profile = await profiles.findOne({ userId: new ObjectId(auth.user.id) });
  if (!profile) return NextResponse.json([]);
  if (profile.userType === 'vendor') {
    return NextResponse.json(await bids.find({ vendorProfileId: profile._id! }).sort({ createdAt: -1 }).toArray());
  }
  if (profile.userType === 'company') {
    const myTenders = await tenders.find({ companyProfileId: profile._id! }).project({ _id: 1 }).toArray();
    const ids = myTenders.map((t) => t._id!);
    if (ids.length === 0) return NextResponse.json([]);
    return NextResponse.json(await bids.find({ tenderId: { $in: ids } }).sort({ createdAt: -1 }).toArray());
  }
  return NextResponse.json([]);
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
    technicalProposal: z.string().optional(),
    commercialProposal: z.string().optional(),
    notes: z.string().optional(),
    clauseResponses: z.array(z.object({
      kind: z.enum(['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal', 'custom']),
      slug: z.string().optional(),
      accepted: z.boolean(),
      comments: z.string().optional(),
    })).default([]),
    lineItems: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number(),
      deliveryDays: z.number().optional(),
      notes: z.string().optional(),
    })).optional(),
  }).parse(body);

  const { tenders, bids, bidHistory } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(data.tenderId) });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  if (tender.status !== 'published') return NextResponse.json({ error: 'Offers can only be submitted on published tenders' }, { status: 400 });
  if (!isBidDeadlineOpen(tender.bidDeadline)) return NextResponse.json({ error: 'Bid deadline has passed' }, { status: 400 });

  const allowed = await assertVendorCanOffer(tender._id!, vendor._id!);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: 403 });

  const now = new Date();
  const result = await bids.insertOne({
    tenderId: tender._id!,
    vendorProfileId: vendor._id!,
    status: 'draft',
    totalPrice: data.totalPrice,
    currency: data.currency,
    validityDays: data.validityDays,
    technicalProposal: data.technicalProposal,
    commercialProposal: data.commercialProposal,
    notes: data.notes,
    clauseResponses: data.clauseResponses,
    lineItems: (data.lineItems ?? []).map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      deliveryDays: item.deliveryDays,
      notes: item.notes,
    })),
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
