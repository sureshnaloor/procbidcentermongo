import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;

  const { tenders, bids, profiles } = await collections();
  const myTenders = await tenders.find({ companyProfileId: profile._id! }).sort({ bidDeadline: -1 }).toArray();

  const closed = myTenders.filter((t) => {
    if (['closed','awarded','cancelled'].includes(t.status)) return true;
    if (!t.bidDeadline) return false;
    return t.bidDeadline.getTime() < Date.now();
  });

  if (closed.length === 0) return NextResponse.json([]);

  const tenderIds = closed.map((t) => t._id!);
  const allBids = await bids.find({ tenderId: { $in: tenderIds } }).sort({ createdAt: -1 }).toArray();

  const vendorProfileIds = [...new Set(allBids.map((b) => b.vendorProfileId.toString()))];
  const vendors = vendorProfileIds.length > 0
    ? await profiles.find({ _id: { $in: vendorProfileIds.map((id) => { const { ObjectId } = require('mongodb'); return new ObjectId(id); }) } }).toArray()
    : [];
  const vendorById = new Map(vendors.map((v) => [v._id!.toString(), v]));

  return NextResponse.json(closed.map((tender) => {
    const tenderBids = allBids
      .filter((b) => b.tenderId.toString() === tender._id!.toString())
      .map((b) => ({ ...b, vendor: vendorById.get(b.vendorProfileId.toString()) ?? null }));
    return { ...tender, biddingClosed: true, offerCount: tenderBids.length, offers: tenderBids };
  }));
}
