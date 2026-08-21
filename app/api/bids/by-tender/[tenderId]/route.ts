import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId } = await params;
  if (!ObjectId.isValid(tenderId)) return NextResponse.json([]);

  const { tenders, bids, profiles } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json([]);

  const profile = await getProfileForUser(auth.user.id);
  const isAdmin = auth.user.role === 'admin';

  if (isAdmin) {
    const allBids = await bids.find({ tenderId: tender._id! }).sort({ createdAt: -1 }).toArray();
    const withVendors = await Promise.all(allBids.map(async (b) => ({
      ...b, vendor: await profiles.findOne({ _id: b.vendorProfileId }),
    })));
    return NextResponse.json(withVendors);
  }

  if (profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString()) {
    const allBids = await bids.find({ tenderId: tender._id!, status: { $ne: 'draft' } }).sort({ createdAt: -1 }).toArray();
    const withVendors = await Promise.all(allBids.map(async (b) => ({
      ...b, vendor: await profiles.findOne({ _id: b.vendorProfileId }),
    })));
    return NextResponse.json(withVendors);
  }

  if (profile?.userType === 'vendor') {
    const ownBids = await bids.find({ tenderId: tender._id!, vendorProfileId: profile._id! }).sort({ createdAt: -1 }).toArray();
    return NextResponse.json(ownBids);
  }

  return NextResponse.json([]);
}
