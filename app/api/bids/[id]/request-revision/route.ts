import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';
import { buildRevisionRequest, ensureOriginalVersion, VENDOR_REVISABLE_STATUSES } from '@/lib/bid-revision';
import { notify } from '@/lib/notify';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const company = await requireCompanyProfile(auth);
  if (isNextResponse(company)) return company;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const note = z.object({ note: z.string().max(1000).optional() }).parse(await req.json().catch(() => ({}))).note;

  const { bids, tenders, bidHistory } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const tender = await tenders.findOne({ _id: bid.tenderId });
  if (!tender || tender.companyProfileId.toString() !== company._id!.toString()) {
    return NextResponse.json({ error: 'You can only request revisions on your own packages' }, { status: 403 });
  }
  if (tender.status === 'awarded' || tender.status === 'cancelled') {
    return NextResponse.json({ error: 'This package is no longer open for revisions' }, { status: 400 });
  }
  if (!VENDOR_REVISABLE_STATUSES.includes(bid.status)) {
    return NextResponse.json({ error: 'Shortlist this supplier before asking them to revise their offer' }, { status: 400 });
  }
  if (bid.revisionRequest?.open) {
    return NextResponse.json({ error: 'A revision is already open for this offer' }, { status: 400 });
  }

  const now = new Date();
  const versions = ensureOriginalVersion(bid, auth.user.displayName);
  const revisionRequest = buildRevisionRequest('vendor_invite', auth.user.displayName, note);
  await bids.updateOne({ _id: bid._id! }, { $set: { versions, revisionRequest, updatedAt: now } });
  await bidHistory.insertOne({
    bidId: bid._id!,
    fieldName: 'revision_requested',
    oldValue: bid.status,
    newValue: note?.trim() || 'vendor invited to revise',
    changedBy: auth.user.displayName,
    createdAt: now,
  });
  await notify({
    profileId: bid.vendorProfileId,
    type: 'revision_requested',
    title: `Please revise your offer for ${tender.title}`,
    content: note?.trim() || 'The company has invited you to revise prices, quantities, or terms and resubmit.',
    relatedId: bid._id,
    relatedType: 'bid',
  });
  return NextResponse.json(await bids.findOne({ _id: bid._id! }));
}
