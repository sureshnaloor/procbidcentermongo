import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { QUOTED_BID_STATUSES, vendorPublic } from '@/lib/comparison';
import { originalVersion } from '@/lib/bid-revision';
import { resolvedBidTotal } from '@/lib/bid-line';
import { isOfferAuthorized } from '@/lib/tender-access';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId } = await params;
  if (!ObjectId.isValid(tenderId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders, bids, tenderInvites, profiles } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  const isAdmin = auth.user.role === 'admin';
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [inviteRows, bidRows, company] = await Promise.all([
    tenderInvites.find({ tenderId: tender._id! }).toArray(),
    bids.find({ tenderId: tender._id!, status: { $in: [...QUOTED_BID_STATUSES] } }).sort({ submittedAt: 1, createdAt: 1 }).toArray(),
    profiles.findOne({ _id: tender.companyProfileId }),
  ]);

  const vendorIds = [
    ...inviteRows.map((i) => i.vendorProfileId),
    ...bidRows.map((b) => b.vendorProfileId),
  ];
  const uniqueVendorIds = [...new Map(vendorIds.map((id) => [id.toString(), id])).values()];
  const vendors = uniqueVendorIds.length
    ? await profiles.find({ _id: { $in: uniqueVendorIds } }).toArray()
    : [];
  const vendorById = new Map(vendors.map((v) => [v._id!.toString(), vendorPublic(v)]));

  const invited = inviteRows.filter((i) => isOfferAuthorized(i.status));
  const quotedVendorIds = new Set(bidRows.map((b) => b.vendorProfileId.toString()));
  const notQuoted = invited.filter((i) => !quotedVendorIds.has(i.vendorProfileId.toString()));
  const rejected = bidRows.filter((b) => b.status === 'rejected');

  const nameOf = (vendorId: { toString(): string }) =>
    vendorById.get(vendorId.toString())?.companyName || 'Supplier';

  const statusOrder: Record<string, number> = {
    accepted: 0,
    shortlisted: 1,
    under_review: 2,
    submitted: 3,
    withdrawn: 4,
    rejected: 5,
  };

  return NextResponse.json({
    tender: {
      _id: tender._id,
      title: tender.title,
      type: tender.type,
      status: tender.status,
      description: tender.description,
      location: tender.location,
      currency: tender.currency,
      bidDeadline: tender.bidDeadline,
      deliveryDeadline: tender.deliveryDeadline,
      estimatedValue: tender.estimatedValue,
      clauses: tender.clauses ?? [],
      boqItems: tender.boqItems ?? [],
      createdAt: tender.createdAt,
    },
    company: { companyName: company?.companyName || 'Company' },
    participation: {
      invited: invited.map((i) => ({ vendorId: i.vendorProfileId, name: nameOf(i.vendorProfileId) })),
      quoted: bidRows.map((b) => ({ vendorId: b.vendorProfileId, name: nameOf(b.vendorProfileId), status: b.status })),
      notQuoted: notQuoted.map((i) => ({ vendorId: i.vendorProfileId, name: nameOf(i.vendorProfileId) })),
      rejected: rejected.map((b) => ({ vendorId: b.vendorProfileId, name: nameOf(b.vendorProfileId) })),
    },
    bids: bidRows
      .slice()
      .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))
      .map((bid) => ({
        _id: bid._id,
        status: bid.status,
        totalPrice: resolvedBidTotal(bid),
        currency: bid.currency,
        validityDays: bid.validityDays,
        notes: bid.notes,
        technicalProposal: bid.technicalProposal,
        commercialProposal: bid.commercialProposal,
        lineItems: bid.lineItems ?? [],
        clauseResponses: bid.clauseResponses ?? [],
        submittedAt: bid.submittedAt,
        originalVersion: originalVersion(bid),
        revisedAt: bid.revisedAt ?? null,
        revisionOpen: Boolean(bid.revisionRequest?.open),
        vendor: vendorById.get(bid.vendorProfileId.toString()),
      })),
    remarks: (tender.comparisonRemarks ?? []).slice().sort((a, b) => a.level - b.level),
  });
}
