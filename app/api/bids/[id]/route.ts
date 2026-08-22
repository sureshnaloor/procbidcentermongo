import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { bidLineItemInput, lineItemsTotal, normalizeStoredLineItem, resolvedBidTotal } from '@/lib/bid-line';
import { applyRevisionDraft, shouldOverlayDraft, syncLatestRevisionSnapshot, presentRevisionHistory, revisionIsPending, VERBAL_REVISABLE_STATUSES, VENDOR_REVISABLE_STATUSES, VENDOR_CAN_REQUEST_REVISION_STATUSES } from '@/lib/bid-revision';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json(null);

  const { bids, tenders, profiles, bidHistory, vendorBlacklist } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json(null);

  const profile = await getProfileForUser(auth.user.id);
  const tender = await tenders.findOne({ _id: bid.tenderId });

  const isAdmin = auth.user.role === 'admin';
  const isVendorOwner = profile?.userType === 'vendor' && bid.vendorProfileId.toString() === profile._id!.toString();
  const isCompanyOwner = profile?.userType === 'company' && tender?.companyProfileId.toString() === profile._id!.toString();

  if (!isAdmin && !isVendorOwner && !isCompanyOwner) return NextResponse.json(null);
  if (!isAdmin && isCompanyOwner && bid.status === 'draft') return NextResponse.json(null);

  const history = await bidHistory.find({ bidId: bid._id! }).sort({ createdAt: -1 }).toArray();
  const vendorProfile = await profiles.findOne({ _id: bid.vendorProfileId });
  const vendor = vendorProfile ?? (bid.isOffline && bid.offlineSupplier
    ? {
        companyName: bid.offlineSupplier.name,
        contactPerson: bid.offlineSupplier.contactPerson,
        phone: bid.offlineSupplier.phone,
        city: bid.offlineSupplier.city,
        country: bid.offlineSupplier.country,
      }
    : null);
  const company = tender ? await profiles.findOne({ _id: tender.companyProfileId }) : null;
  const deadlineOpen = !tender?.bidDeadline || tender.bidDeadline.getTime() >= Date.now();
  const revisionOpen = Boolean(bid.revisionRequest?.open);
  const pendingRevision = revisionIsPending(bid.revisionRequest);
  const canModify = isVendorOwner && bid.status === 'draft';
  const canRevise = isVendorOwner && revisionOpen && bid.revisionRequest?.source === 'vendor_invite';
  const canVerbalRevise = isCompanyOwner && revisionOpen && bid.revisionRequest?.source === 'company_verbal';
  const canRequestRevision = isCompanyOwner && !revisionOpen && !pendingRevision && VENDOR_REVISABLE_STATUSES.includes(bid.status);
  const canOpenVerbalRevision = isCompanyOwner && !revisionOpen && !pendingRevision && VERBAL_REVISABLE_STATUSES.includes(bid.status);
  const canRequestToRevise = isVendorOwner && !revisionOpen && !pendingRevision && VENDOR_CAN_REQUEST_REVISION_STATUSES.includes(bid.status) && tender?.status !== 'awarded' && tender?.status !== 'cancelled';
  const canApproveRevisionRequest = isCompanyOwner && pendingRevision;
  const canWithdraw = isVendorOwner && deadlineOpen && ['draft', 'submitted', 'under_review', 'shortlisted'].includes(bid.status);

  let blacklisted = false;
  if (isCompanyOwner && tender) {
    blacklisted = Boolean(await vendorBlacklist.findOne({
      companyProfileId: tender.companyProfileId,
      vendorProfileId: bid.vendorProfileId,
    }));
  }

  const overlay = shouldOverlayDraft(bid, { isVendorOwner, isCompanyOwner });
  const payload = overlay ? applyRevisionDraft(bid, bid.revisionDraft) : bid;
  const totalPrice = resolvedBidTotal(payload);
  const versions = syncLatestRevisionSnapshot(bid);
  const liveTotal = resolvedBidTotal(bid);
  const versionsChanged = (bid.versions ?? []).some((v, i) => Number(v.totalPrice) !== Number(versions[i]?.totalPrice));
  if (versionsChanged || (liveTotal != null && Number(bid.totalPrice) !== liveTotal)) {
    const repair: Record<string, unknown> = { versions };
    if (liveTotal != null) repair.totalPrice = liveTotal;
    await bids.updateOne({ _id: bid._id! }, { $set: repair });
  }

  return NextResponse.json({
    ...payload,
    totalPrice,
    history: presentRevisionHistory(history, versions),
    versions,
    revisionRequest: bid.revisionRequest ?? null,
    vendor,
    tender: tender
      ? { ...tender, company: company ? { _id: company._id, companyName: company.companyName } : null }
      : null,
    canModify,
    canRevise,
    canVerbalRevise,
    canRequestRevision,
    canOpenVerbalRevision,
    canRequestToRevise,
    canApproveRevisionRequest,
    canWithdraw,
    blacklisted,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, bidHistory, tenders } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  const tender = await tenders.findOne({ _id: bid.tenderId });
  const isVendorOwner = Boolean(profile && bid.vendorProfileId.toString() === profile._id!.toString());
  const isCompanyOwner = Boolean(
    profile?.userType === 'company' && tender && tender.companyProfileId.toString() === profile._id!.toString()
  );
  const revisionOpen = Boolean(bid.revisionRequest?.open);
  const vendorRevising = isVendorOwner && revisionOpen && bid.revisionRequest?.source === 'vendor_invite';
  const companyRevising = isCompanyOwner && revisionOpen && bid.revisionRequest?.source === 'company_verbal';
  const editingDraft = isVendorOwner && bid.status === 'draft';

  if (!editingDraft && !vendorRevising && !companyRevising) {
    if (!isVendorOwner) return NextResponse.json({ error: 'You can only edit your own bids' }, { status: 403 });
    return NextResponse.json({ error: 'This offer is not open for editing' }, { status: 400 });
  }

  const body = await req.json();
  const data = z.object({
    totalPrice: z.number().optional(),
    currency: z.string().optional(),
    validityDays: z.number().optional(),
    discountType: z.enum(['percent', 'amount']).nullable().optional(),
    discountValue: z.number().min(0).nullable().optional(),
    vatPercent: z.number().min(0).max(100).nullable().optional(),
    otherCharges: z.array(z.object({
      label: z.string().min(1).max(80),
      type: z.enum(['value', 'percent']).optional(),
      amount: z.number().min(0),
    })).max(12).optional(),
    technicalProposal: z.string().optional(),
    commercialProposal: z.string().optional(),
    notes: z.string().optional(),
    clauseResponses: z.array(z.object({
      kind: z.enum(['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal', 'custom']),
      slug: z.string().optional(),
      accepted: z.boolean(),
      comments: z.string().optional(),
      originalBody: z.string().optional(),
      proposedBody: z.string().optional(),
    })).optional(),
    lineItems: z.array(bidLineItemInput).optional(),
  }).parse(body);

  const { lineItems, totalPrice, clauseResponses, ...rest } = data;
  const now = new Date();

  if (vendorRevising || companyRevising) {
    const nextLines = lineItems !== undefined
      ? lineItems.map((item) => normalizeStoredLineItem(item))
      : bid.revisionDraft?.lineItems ?? bid.lineItems;
    const fromLines = lineItemsTotal(nextLines);
    await bids.updateOne({ _id: bid._id! }, {
      $set: {
        revisionDraft: {
          ...rest,
          discountType: rest.discountType ?? undefined,
          discountValue: rest.discountValue ?? undefined,
          vatPercent: rest.vatPercent ?? undefined,
          totalPrice: (nextLines?.length ?? 0) > 0 ? fromLines : totalPrice,
          clauseResponses,
          lineItems: nextLines,
          savedAt: now,
        },
        updatedAt: now,
      },
    });
    return NextResponse.json(await bids.findOne({ _id: bid._id! }));
  }

  const setFields: Record<string, unknown> = { ...rest, updatedAt: now };
  if (clauseResponses !== undefined) {
    setFields.clauseResponses = clauseResponses;
  }
  if (lineItems !== undefined) {
    const storedLines = lineItems.map((item) => normalizeStoredLineItem(item));
    setFields.lineItems = storedLines;
    setFields.totalPrice = lineItemsTotal(storedLines);
  } else if (totalPrice !== undefined) {
    setFields.totalPrice = totalPrice;
  }
  if (setFields.totalPrice !== undefined && String(setFields.totalPrice) !== String(bid.totalPrice)) {
    await bidHistory.insertOne({
      bidId: bid._id!,
      fieldName: 'totalPrice',
      oldValue: String(bid.totalPrice),
      newValue: String(setFields.totalPrice),
      changedBy: auth.user.displayName,
      createdAt: now,
    });
  }

  await bids.updateOne({ _id: new ObjectId(id) }, { $set: setFields });
  return NextResponse.json(await bids.findOne({ _id: new ObjectId(id) }));
}
