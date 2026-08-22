import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { QUOTED_BID_STATUSES, vendorPublic } from '@/lib/comparison';
import { originalVersion } from '@/lib/bid-revision';
import { bidCommercialBreakdown, resolvedBidTotal } from '@/lib/bid-line';
import { isOfferAuthorized } from '@/lib/tender-access';
import type { IProfile } from '@/lib/types';

export async function loadComparisonStatement(tenderId: string, profile: IProfile | null, isAdmin: boolean) {
  if (!ObjectId.isValid(tenderId)) return { error: 'Invalid id', status: 400 as const };
  const { tenders, bids, tenderInvites, profiles, offlineInvites } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return { error: 'Not found', status: 404 as const };

  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return { error: 'Forbidden', status: 403 as const };

  const [inviteRows, bidRows, company, offlineInviteRows] = await Promise.all([
    tenderInvites.find({ tenderId: tender._id! }).toArray(),
    bids.find({ tenderId: tender._id!, status: { $in: [...QUOTED_BID_STATUSES] } }).sort({ submittedAt: 1, createdAt: 1 }).toArray(),
    profiles.findOne({ _id: tender.companyProfileId }),
    offlineInvites.find({ tenderId: tender._id! }).sort({ createdAt: 1 }).toArray(),
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

  const offlineName = (bid: (typeof bidRows)[number]) =>
    bid.isOffline && bid.offlineSupplier?.name
      ? {
          companyName: bid.offlineSupplier.name,
          contactPerson: bid.offlineSupplier.contactPerson || '',
          city: bid.offlineSupplier.city,
          country: bid.offlineSupplier.country,
        }
      : null;
  const offlineNameByVendorId = new Map(
    bidRows
      .filter((b) => b.isOffline && b.offlineSupplier?.name)
      .map((b) => [b.vendorProfileId.toString(), b.offlineSupplier!.name])
  );

  const nameOf = (vendorId: { toString(): string }) =>
    vendorById.get(vendorId.toString())?.companyName
    || offlineNameByVendorId.get(vendorId.toString())
    || 'Supplier';

  const offlineBids = bidRows.filter((b) => b.isOffline);
  const offlineParticipated = offlineBids.filter((b) => b.status !== 'rejected' && b.status !== 'withdrawn');
  const approvedOfflineInvites = offlineInviteRows.filter((i) => i.status === 'approved');
  const invitedOfflineNames = new Set(approvedOfflineInvites.map((i) => i.supplierName.trim().toLowerCase()));
  const offlineBidNotInvited = offlineBids.filter(
    (b) => !invitedOfflineNames.has((b.offlineSupplier?.name ?? '').trim().toLowerCase())
  );

  const statusOrder: Record<string, number> = {
    accepted: 0,
    shortlisted: 1,
    under_review: 2,
    submitted: 3,
    withdrawn: 4,
    rejected: 5,
  };

  return {
    status: 200 as const,
    data: {
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
        incoterm: tender.incoterm,
        incotermPlace: tender.incotermPlace,
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
        offlineInvited: [
          ...approvedOfflineInvites.map((i) => ({ vendorId: i._id!, name: i.supplierName })),
          ...offlineBidNotInvited.map((b) => ({ vendorId: b.vendorProfileId, name: nameOf(b.vendorProfileId) })),
        ],
        offlineParticipated: offlineParticipated.map((b) => ({ vendorId: b.vendorProfileId, name: nameOf(b.vendorProfileId), status: b.status })),
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
          discountType: bid.discountType,
          discountValue: bid.discountValue,
          vatPercent: bid.vatPercent,
          otherCharges: bid.otherCharges ?? [],
          commercial: bidCommercialBreakdown(bid),
          lineItems: bid.lineItems ?? [],
          clauseResponses: bid.clauseResponses ?? [],
          submittedAt: bid.submittedAt,
          originalVersion: originalVersion(bid),
          revisedAt: bid.revisedAt ?? null,
          revisionOpen: Boolean(bid.revisionRequest?.open),
          isOffline: Boolean(bid.isOffline),
          vendor: vendorById.get(bid.vendorProfileId.toString()) ?? offlineName(bid) ?? undefined,
        })),
      remarks: (tender.comparisonRemarks ?? []).slice().sort((a, b) => a.level - b.level),
    },
  };
}
