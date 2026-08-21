import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { isOfferAuthorized } from '@/lib/tender-access';
import { findInviteByAccessToken } from '@/lib/offer-link';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { token } = await params;
  const invite = await findInviteByAccessToken(token);
  const profile = await getProfileForUser(auth.user.id);

  if (
    !invite ||
    !profile ||
    profile.userType !== 'vendor' ||
    profile._id!.toString() !== invite.vendorProfileId.toString() ||
    !isOfferAuthorized(invite.status)
  ) {
    return NextResponse.json(null);
  }

  const { tenders, bids } = await collections();
  const tender = await tenders.findOne({ _id: invite.tenderId });
  if (!tender || tender.status === 'draft') return NextResponse.json(null);

  const myBid = await bids.find({ tenderId: tender._id!, vendorProfileId: profile._id! }).sort({ createdAt: -1 }).limit(1).next();
  return NextResponse.json({
    tenderId: tender._id,
    inviteId: invite._id,
    myBid: myBid ? { _id: myBid._id, status: myBid.status } : null,
  });
}
