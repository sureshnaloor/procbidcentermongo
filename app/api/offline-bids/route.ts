import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { resolvedBidTotal } from '@/lib/bid-line';

// List the company's packages that have offline bids or offline invites.
export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenders, bids, offlineInvites } = await collections();

  const isAdmin = auth.user.role === 'admin';
  const profile = await getProfileForUser(auth.user.id);
  if (!isAdmin && profile?.userType !== 'company') {
    return NextResponse.json({ error: 'EPC Company access required' }, { status: 403 });
  }

  const [offlineBids, invites] = await Promise.all([
    bids.find({ isOffline: true, status: { $ne: 'draft' } }).sort({ createdAt: -1 }).toArray(),
    offlineInvites.find({}).sort({ createdAt: -1 }).toArray(),
  ]);
  if (offlineBids.length === 0 && invites.length === 0) return NextResponse.json([]);

  const tenderIds = [
    ...new Set([
      ...offlineBids.map((b) => b.tenderId.toString()),
      ...invites.map((i) => i.tenderId.toString()),
    ]),
  ].map((id) => new ObjectId(id));
  const tenderDocs = await tenders.find({ _id: { $in: tenderIds } }).toArray();
  const owned = tenderDocs.filter(
    (t) => t.status !== 'draft' && (isAdmin || (profile?._id && t.companyProfileId.toString() === profile._id.toString()))
  );

  const result = owned
    .map((tender) => {
      const tid = tender._id!.toString();
      const rows = offlineBids.filter((b) => b.tenderId.toString() === tid);
      const tenderInvites = invites.filter((i) => i.tenderId.toString() === tid);
      return {
        tender: {
          _id: tender._id,
          title: tender.title,
          type: tender.type,
          status: tender.status,
          currency: tender.currency,
          bidDeadline: tender.bidDeadline,
        },
        offlineCount: rows.length,
        invites: tenderInvites,
        bids: rows.map((b) => ({
          _id: b._id,
          status: b.status,
          totalPrice: resolvedBidTotal(b),
          currency: b.currency,
          supplier: b.offlineSupplier ?? null,
          submittedAt: b.submittedAt ?? b.createdAt,
          signedPdf: b.signedOffers?.length ? b.signedOffers[b.signedOffers.length - 1] : null,
          workbook: b.offlineWorkbook ?? null,
        })),
      };
    })
    .filter((row) => row.offlineCount > 0 || row.invites.length > 0);

  return NextResponse.json(result);
}
