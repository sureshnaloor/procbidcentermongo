import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, tenders, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tender = await tenders.findOne({ _id: bid.tenderId });
  if (!tender || tender.companyProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only review bids on your own tenders' }, { status: 403 });
  }

  const body = await req.json();
  const data = z.object({
    status: z.enum(['under_review','shortlisted','accepted','rejected']),
  }).parse(body);

  const now = new Date();
  await bids.updateOne({ _id: new ObjectId(id) }, { $set: { status: data.status, updatedAt: now } });
  await bidHistory.insertOne({ bidId: bid._id!, fieldName: 'status', oldValue: bid.status, newValue: data.status, changedBy: auth.user.displayName, createdAt: now });
  return NextResponse.json(await bids.findOne({ _id: new ObjectId(id) }));
}
