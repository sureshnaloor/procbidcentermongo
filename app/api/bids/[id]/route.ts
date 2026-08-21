import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json(null);

  const { bids, tenders, profiles, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json(null);

  const profile = await getProfileForUser(auth.user.id);
  const tender = await tenders.findOne({ _id: bid.tenderId });

  const isAdmin = auth.user.role === 'admin';
  const isVendorOwner = profile?.userType === 'vendor' && bid.vendorProfileId.toString() === profile._id!.toString();
  const isCompanyOwner = profile?.userType === 'company' && tender?.companyProfileId.toString() === profile._id!.toString();

  if (!isAdmin && !isVendorOwner && !isCompanyOwner) return NextResponse.json(null);

  const history = await bidHistory.find({ bidId: bid._id! }).sort({ createdAt: -1 }).toArray();
  const vendor = await profiles.findOne({ _id: bid.vendorProfileId });

  return NextResponse.json({ ...bid, history, vendor, tender });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  if (!profile || bid.vendorProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only edit your own bids' }, { status: 403 });
  }
  if (bid.status !== 'draft') return NextResponse.json({ error: 'Only draft bids can be edited' }, { status: 400 });

  const body = await req.json();
  const data = z.object({
    totalPrice: z.number().optional(),
    currency: z.string().optional(),
    validityDays: z.number().optional(),
    technicalProposal: z.string().optional(),
    commercialProposal: z.string().optional(),
    notes: z.string().optional(),
    lineItems: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unit: z.string(),
      unitPrice: z.number(),
      deliveryDays: z.number().optional(),
      notes: z.string().optional(),
    })).optional(),
  }).parse(body);

  const { lineItems, totalPrice, ...rest } = data;
  const setFields: Record<string, unknown> = { ...rest, updatedAt: new Date() };
  if (totalPrice !== undefined) {
    if (String(totalPrice) !== String(bid.totalPrice)) {
      await bidHistory.insertOne({
        bidId: bid._id!,
        fieldName: 'totalPrice',
        oldValue: String(bid.totalPrice),
        newValue: String(totalPrice),
        changedBy: auth.user.displayName,
        createdAt: new Date(),
      });
    }
    setFields.totalPrice = totalPrice;
  }
  if (lineItems !== undefined) {
    setFields.lineItems = lineItems.map((item) => ({
      description: item.description, quantity: item.quantity, unit: item.unit,
      unitPrice: item.unitPrice, totalPrice: item.quantity * item.unitPrice,
      deliveryDays: item.deliveryDays, notes: item.notes,
    }));
  }

  await bids.updateOne({ _id: new ObjectId(id) }, { $set: setFields });
  return NextResponse.json(await bids.findOne({ _id: new ObjectId(id) }));
}
