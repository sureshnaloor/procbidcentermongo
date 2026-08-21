import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';
import { buildRevisionRequest, ensureOriginalVersion, revisionIsPending, VERBAL_REVISABLE_STATUSES } from '@/lib/bid-revision';
import { postOfferThreadSystemMessage, systemMessageText } from '@/lib/offer-thread-system';

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
    return NextResponse.json({ error: 'You can only revise offers on your own packages' }, { status: 403 });
  }
  if (tender.status === 'awarded' || tender.status === 'cancelled') {
    return NextResponse.json({ error: 'This package is no longer open for revisions' }, { status: 400 });
  }
  if (!VERBAL_REVISABLE_STATUSES.includes(bid.status)) {
    return NextResponse.json({ error: 'Only a received offer can be revised from a verbal agreement' }, { status: 400 });
  }
  if (bid.revisionRequest?.open || revisionIsPending(bid.revisionRequest)) {
    return NextResponse.json({ error: 'A revision is already open or waiting for approval on this offer' }, { status: 400 });
  }

  const now = new Date();
  const versions = ensureOriginalVersion(bid, auth.user.displayName);
  const revisionRequest = buildRevisionRequest('company_verbal', auth.user.displayName, note, { initiatedBy: 'company' });
  await bids.updateOne({ _id: bid._id! }, { $set: { versions, revisionRequest, updatedAt: now } });
  await bidHistory.insertOne({
    bidId: bid._id!,
    fieldName: 'verbal_revision_opened',
    oldValue: bid.status,
    newValue: note?.trim() || 'company revising from telephonic/verbal agreement',
    changedBy: auth.user.displayName,
    createdAt: now,
  });
  try {
    await postOfferThreadSystemMessage({
      tenderId: tender._id!,
      companyProfileId: tender.companyProfileId,
      vendorProfileId: bid.vendorProfileId,
      actorProfileId: company._id!,
      bidId: bid._id!,
      event: 'verbal_revision_opened',
      content: systemMessageText('verbal_revision_opened', note),
    });
  } catch { /* ignore */ }
  return NextResponse.json(await bids.findOne({ _id: bid._id! }));
}
