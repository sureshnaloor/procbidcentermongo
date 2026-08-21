import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';
import { ensureOriginalVersion, revisionIsPending } from '@/lib/bid-revision';
import { notify } from '@/lib/notify';
import { postOfferThreadSystemMessage, systemMessageText } from '@/lib/offer-thread-system';

const bodySchema = z.object({
  action: z.enum(['approve', 'decline']),
  note: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const company = await requireCompanyProfile(auth);
  if (isNextResponse(company)) return company;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const data = bodySchema.parse(await req.json().catch(() => ({})));
  const { bids, tenders, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tender = await tenders.findOne({ _id: bid.tenderId });
  if (!tender || tender.companyProfileId.toString() !== company._id!.toString()) {
    return NextResponse.json({ error: 'You can only decide revisions on your own packages' }, { status: 403 });
  }
  if (tender.status === 'awarded' || tender.status === 'cancelled') {
    return NextResponse.json({ error: 'This package is no longer open for revisions' }, { status: 400 });
  }
  if (!revisionIsPending(bid.revisionRequest)) {
    return NextResponse.json({ error: 'There is no pending revision request on this offer' }, { status: 400 });
  }

  const now = new Date();
  const note = data.note?.trim() || bid.revisionRequest?.note;
  if (data.action === 'decline') {
    await bids.updateOne({ _id: bid._id! }, { $unset: { revisionRequest: '' }, $set: { updatedAt: now } });
    await bidHistory.insertOne({
      bidId: bid._id!,
      fieldName: 'revision_request_declined',
      oldValue: 'pending',
      newValue: note || 'declined',
      changedBy: auth.user.displayName,
      createdAt: now,
    });
    await notify({
      profileId: bid.vendorProfileId,
      type: 'revision_request_declined',
      title: `Revision request declined for ${tender.title}`,
      content: note || 'The company declined your request to revise this offer.',
      relatedId: bid._id,
      relatedType: 'bid',
    });
    try {
      await postOfferThreadSystemMessage({
        tenderId: tender._id!,
        companyProfileId: tender.companyProfileId,
        vendorProfileId: bid.vendorProfileId,
        actorProfileId: company._id!,
        bidId: bid._id!,
        event: 'revision_declined',
        content: systemMessageText('revision_declined', note),
      });
    } catch { /* ignore */ }
    return NextResponse.json(await bids.findOne({ _id: bid._id! }));
  }

  const versions = ensureOriginalVersion(bid, auth.user.displayName);
  const revisionRequest = {
    ...bid.revisionRequest!,
    open: true,
    pendingApproval: false,
    source: 'vendor_invite' as const,
    initiatedBy: 'vendor' as const,
    note: note || undefined,
    approvedBy: auth.user.displayName,
    approvedAt: now,
  };
  await bids.updateOne({ _id: bid._id! }, { $set: { versions, revisionRequest, updatedAt: now } });
  await bidHistory.insertOne({
    bidId: bid._id!,
    fieldName: 'revision_request_approved',
    oldValue: 'pending',
    newValue: note || 'approved',
    changedBy: auth.user.displayName,
    createdAt: now,
  });
  await notify({
    profileId: bid.vendorProfileId,
    type: 'revision_requested',
    title: `You may now revise your offer for ${tender.title}`,
    content: note || 'The company approved your revision request. Update prices, quantities, or terms and resubmit.',
    relatedId: bid._id,
    relatedType: 'bid',
  });
  try {
    await postOfferThreadSystemMessage({
      tenderId: tender._id!,
      companyProfileId: tender.companyProfileId,
      vendorProfileId: bid.vendorProfileId,
      actorProfileId: company._id!,
      bidId: bid._id!,
      event: 'revision_approved',
      content: systemMessageText('revision_approved', note),
    });
  } catch { /* ignore */ }
  return NextResponse.json(await bids.findOne({ _id: bid._id! }));
}
