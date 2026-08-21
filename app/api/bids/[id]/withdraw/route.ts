import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  if (!profile || bid.vendorProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only withdraw your own bids' }, { status: 403 });
  }
  if (!['draft','submitted'].includes(bid.status)) return NextResponse.json({ error: 'Bid cannot be withdrawn' }, { status: 400 });

  const now = new Date();
  await bids.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'withdrawn', updatedAt: now } });
  await bidHistory.insertOne({ bidId: bid._id!, fieldName: 'status', oldValue: bid.status, newValue: 'withdrawn', changedBy: auth.user.displayName, createdAt: now });
  return NextResponse.json(await bids.findOne({ _id: new ObjectId(id) }));
}
