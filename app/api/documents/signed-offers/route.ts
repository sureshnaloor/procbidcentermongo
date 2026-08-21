import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile?._id) return NextResponse.json({ tenders: [] });

  const { bids, tenders, profiles } = await collections();
  const isAdmin = auth.user.role === 'admin';
  const filter = profile.userType === 'vendor' && !isAdmin
    ? { vendorProfileId: profile._id, 'signedOffers.0': { $exists: true } }
    : { 'signedOffers.0': { $exists: true } };

  const bidRows = await bids.find(filter).sort({ updatedAt: -1 }).toArray();
  const uniqueTenderIds = [...new Map(bidRows.map((b) => [b.tenderId.toString(), b.tenderId])).values()];
  const uniqueVendorIds = [...new Map(bidRows.map((b) => [b.vendorProfileId.toString(), b.vendorProfileId])).values()];
  const [tenderRows, vendorRows] = await Promise.all([
    uniqueTenderIds.length ? tenders.find({ _id: { $in: uniqueTenderIds } }).toArray() : Promise.resolve([]),
    uniqueVendorIds.length ? profiles.find({ _id: { $in: uniqueVendorIds } }).toArray() : Promise.resolve([]),
  ]);
  const tenderById = new Map(tenderRows.map((t) => [t._id!.toString(), t]));
  const vendorById = new Map(vendorRows.map((v) => [v._id!.toString(), v]));

  const visible = bidRows.filter((b) => {
    if (isAdmin) return true;
    if (profile.userType === 'vendor') return b.vendorProfileId.toString() === profile._id!.toString();
    const tender = tenderById.get(b.tenderId.toString());
    return tender?.companyProfileId.toString() === profile._id!.toString();
  });

  const grouped = new Map<string, {
    tenderId: string;
    title: string;
    bidders: { bidId: string; vendorName: string; files: typeof visible[number]['signedOffers'] }[];
  }>();
  for (const bid of visible) {
    const tender = tenderById.get(bid.tenderId.toString());
    const key = bid.tenderId.toString();
    const group = grouped.get(key) ?? {
      tenderId: key,
      title: tender?.title || 'Package',
      bidders: [],
    };
    group.bidders.push({
      bidId: bid._id!.toString(),
      vendorName: vendorById.get(bid.vendorProfileId.toString())?.companyName || 'Supplier',
      files: bid.signedOffers ?? [],
    });
    grouped.set(key, group);
  }

  return NextResponse.json({ tenders: [...grouped.values()] });
}
