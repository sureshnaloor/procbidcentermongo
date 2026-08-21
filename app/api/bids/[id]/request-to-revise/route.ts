import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireVendorProfile } from '@/lib/auth-helpers';
import { buildRevisionRequest, revisionIsPending, VENDOR_CAN_REQUEST_REVISION_STATUSES } from '@/lib/bid-revision';
import { notify } from '@/lib/notify';
import { postOfferThreadSystemMessage, systemMessageText } from '@/lib/offer-thread-system';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const vendor = await requireVendorProfile(auth);
  if (isNextResponse(vendor)) return vendor;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const note = z.object({ note: z.string().max(1000).optional() }).parse(await req.json().catch(() => ({}))).note;

  const { bids, tenders, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (bid.vendorProfileId.toString() !== vendor._id!.toString()) {
    return NextResponse.json({ error: 'You can only request a revision on your own offer' }, { status: 403 });
  }
  const tender = await tenders.findOne({ _id: bid.tenderId });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  if (tender.status === 'awarded' || tender.status === 'cancelled') {
    return NextResponse.json({ error: 'This package is no longer open for revisions' }, { status: 400 });
  }
  if (!VENDOR_CAN_REQUEST_REVISION_STATUSES.includes(bid.status)) {
    return NextResponse.json({ error: 'A submitted offer is required before requesting a revision' }, { status: 400 });
  }
  if (bid.revisionRequest?.open) {
    return NextResponse.json({ error: 'A revision is already open for this offer' }, { status: 400 });
  }
  if (revisionIsPending(bid.revisionRequest)) {
    return NextResponse.json({ error: 'A revision request is already waiting for company approval' }, { status: 400 });
  }

  const now = new Date();
  const revisionRequest = buildRevisionRequest('vendor_invite', auth.user.displayName, note, {
    open: false,
    pendingApproval: true,
    initiatedBy: 'vendor',
  });
  await bids.updateOne({ _id: bid._id! }, { $set: { revisionRequest, updatedAt: now } });
  await bidHistory.insertOne({
    bidId: bid._id!,
    fieldName: 'revision_request_from_vendor',
    oldValue: bid.status,
    newValue: note?.trim() || 'supplier requested revision',
    changedBy: auth.user.displayName,
    createdAt: now,
  });
  await notify({
    profileId: tender.companyProfileId,
    type: 'revision_request_received',
    title: `${vendor.companyName || 'Supplier'} requested a revision on ${tender.title}`,
    content: note?.trim() || 'The supplier asked to revise their submitted offer. Approve to let them resubmit.',
    relatedId: bid._id,
    relatedType: 'bid',
  });
  try {
    await postOfferThreadSystemMessage({
      tenderId: tender._id!,
      companyProfileId: tender.companyProfileId,
      vendorProfileId: bid.vendorProfileId,
      actorProfileId: vendor._id!,
      bidId: bid._id!,
      event: 'request_to_revise',
      content: systemMessageText('request_to_revise', note),
    });
  } catch {
    // Trail is best-effort
  }
  return NextResponse.json(await bids.findOne({ _id: bid._id! }));
}
