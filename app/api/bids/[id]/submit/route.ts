import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { assertVendorCanOffer } from '@/lib/tender-access';
import { matchesClause } from '@/lib/clauses';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, bidHistory, tenders } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  if (!profile || profile.userType !== 'vendor' || bid.vendorProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only submit your own offers' }, { status: 403 });
  }
  if (bid.status !== 'draft') return NextResponse.json({ error: 'Only draft offers can be submitted' }, { status: 400 });

  const allowed = await assertVendorCanOffer(bid.tenderId, profile._id!);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: 403 });

  const tender = await tenders.findOne({ _id: bid.tenderId });
  const requiredClauses = (tender?.clauses ?? []).filter((c) => c.required);
  for (const clause of requiredClauses) {
    const response = (bid.clauseResponses ?? []).find((r) => matchesClause(clause, r));
    if (!response?.accepted) {
      return NextResponse.json({ error: `You must accept the ${clause.title} terms to submit an offer` }, { status: 400 });
    }
  }

  const now = new Date();
  await bids.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'submitted', submittedAt: now, updatedAt: now } });
  await bidHistory.insertOne({ bidId: bid._id!, fieldName: 'status', oldValue: bid.status, newValue: 'submitted', changedBy: auth.user.displayName, createdAt: now });
  return NextResponse.json(await bids.findOne({ _id: new ObjectId(id) }));
}
