import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { isBidDeadlineOpen } from '@/lib/tender-access';

const WITHDRAWABLE = new Set(['draft', 'submitted', 'under_review', 'shortlisted']);

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, bidHistory, tenders } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  if (!profile || bid.vendorProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only withdraw your own bids' }, { status: 403 });
  }
  if (!WITHDRAWABLE.has(bid.status)) {
    return NextResponse.json({ error: 'This offer can no longer be withdrawn' }, { status: 400 });
  }

  const tender = await tenders.findOne({ _id: bid.tenderId });
  if (tender && !isBidDeadlineOpen(tender.bidDeadline)) {
    return NextResponse.json({ error: 'The bid deadline has passed. Offers can no longer be withdrawn.' }, { status: 400 });
  }

  const now = new Date();
  await bids.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'withdrawn', withdrawnAt: now, updatedAt: now } }
  );
  await bidHistory.insertOne({
    bidId: bid._id!,
    fieldName: 'status',
    oldValue: bid.status,
    newValue: 'withdrawn',
    changedBy: auth.user.displayName,
    createdAt: now,
  });
  return NextResponse.json(await bids.findOne({ _id: new ObjectId(id) }));
}
