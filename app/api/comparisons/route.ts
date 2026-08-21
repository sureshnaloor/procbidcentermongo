import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { QUOTED_BID_STATUSES } from '@/lib/comparison';
import { isOfferAuthorized } from '@/lib/tender-access';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  const isAdmin = auth.user.role === 'admin';
  if (!isAdmin && profile?.userType !== 'company') {
    return NextResponse.json({ error: 'Company access required' }, { status: 403 });
  }

  const { tenders, tenderInvites, bids } = await collections();
  const filter = isAdmin || !profile ? { status: { $ne: 'draft' as const } } : {
    companyProfileId: profile._id!,
    status: { $ne: 'draft' as const },
  };

  const items = await tenders
    .find(filter)
    .project({
      title: 1,
      type: 1,
      status: 1,
      bidDeadline: 1,
      currency: 1,
      location: 1,
      createdAt: 1,
      companyProfileId: 1,
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const tenderIds = items.map((t) => t._id!);
  if (tenderIds.length === 0) return NextResponse.json({ items: [] });

  const [invites, offerRows] = await Promise.all([
    tenderInvites.find({ tenderId: { $in: tenderIds } }).toArray(),
    bids.find({
      tenderId: { $in: tenderIds },
      status: { $in: [...QUOTED_BID_STATUSES] },
    }).project({ tenderId: 1, vendorProfileId: 1, status: 1 }).toArray(),
  ]);

  const invitesByTender = new Map<string, typeof invites>();
  for (const invite of invites) {
    const key = invite.tenderId.toString();
    const list = invitesByTender.get(key) ?? [];
    list.push(invite);
    invitesByTender.set(key, list);
  }
  const bidsByTender = new Map<string, typeof offerRows>();
  for (const bid of offerRows) {
    const key = bid.tenderId.toString();
    const list = bidsByTender.get(key) ?? [];
    list.push(bid);
    bidsByTender.set(key, list);
  }

  return NextResponse.json({
    items: items.map((tender) => {
      const tenderInv = invitesByTender.get(tender._id!.toString()) ?? [];
      const tenderBids = bidsByTender.get(tender._id!.toString()) ?? [];
      const invited = tenderInv.filter((i) => isOfferAuthorized(i.status));
      const quotedVendorIds = new Set(tenderBids.map((b) => b.vendorProfileId.toString()));
      const notQuoted = invited.filter((i) => !quotedVendorIds.has(i.vendorProfileId.toString()));
      return {
        _id: tender._id,
        title: tender.title,
        type: tender.type,
        status: tender.status,
        bidDeadline: tender.bidDeadline,
        currency: tender.currency,
        location: tender.location,
        createdAt: tender.createdAt,
        invitedCount: invited.length,
        quotedCount: tenderBids.length,
        notQuotedCount: notQuoted.length,
        rejectedCount: tenderBids.filter((b) => b.status === 'rejected').length,
      };
    }),
  });
}
