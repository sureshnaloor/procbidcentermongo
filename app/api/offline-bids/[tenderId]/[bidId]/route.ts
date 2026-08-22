import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { deleteBidSignatureFile } from '@/lib/bid-files';

// Remove an offline bid and its uploaded files.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tenderId: string; bidId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId, bidId } = await params;
  if (!ObjectId.isValid(tenderId) || !ObjectId.isValid(bidId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const { tenders, bids, bidHistory } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = auth.user.role === 'admin';
  const profile = await getProfileForUser(auth.user.id);
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const bid = await bids.findOne({ _id: new ObjectId(bidId), tenderId: tender._id!, isOffline: true });
  if (!bid) return NextResponse.json({ error: 'Offline bid not found' }, { status: 404 });

  const files = [
    bid.offlineWorkbook?.storedName,
    ...(bid.signedOffers ?? []).map((o) => o.storedName),
  ].filter((n): n is string => Boolean(n));

  await bids.deleteOne({ _id: bid._id! });
  await bidHistory.deleteMany({ bidId: bid._id! });
  await Promise.all(files.map((name) => deleteBidSignatureFile(name)));

  return NextResponse.json({ ok: true });
}
