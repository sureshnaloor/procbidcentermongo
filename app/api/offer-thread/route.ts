import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { assertOfferThreadAccess } from '@/lib/offer-thread';
import { notify } from '@/lib/notify';

function threadFilter(tenderId: ObjectId, companyId: ObjectId, vendorId: ObjectId) {
  return {
    kind: 'offer_thread' as const,
    tenderId,
    $or: [
      { senderProfileId: companyId, receiverProfileId: vendorId },
      { senderProfileId: vendorId, receiverProfileId: companyId },
    ],
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const tenderId = req.nextUrl.searchParams.get('tenderId') || '';
  const vendorProfileId = req.nextUrl.searchParams.get('vendorProfileId') || '';
  if (!ObjectId.isValid(tenderId) || !ObjectId.isValid(vendorProfileId)) {
    return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
  }

  const profile = await getProfileForUser(auth.user.id);
  const { tenders, messages, profiles } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const vendorId = new ObjectId(vendorProfileId);
  const access = await assertOfferThreadAccess({ profile, tender, vendorProfileId: vendorId });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const companyId = tender.companyProfileId;
  const rows = await messages.find(threadFilter(tender._id!, companyId, vendorId)).sort({ createdAt: 1 }).toArray();

  await messages.updateMany(
    {
      ...threadFilter(tender._id!, companyId, vendorId),
      receiverProfileId: profile!._id!,
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  const senderIds = [...new Set(rows.map((r) => r.senderProfileId?.toString()).filter(Boolean))];
  const senders = senderIds.length
    ? await profiles.find({ _id: { $in: senderIds.map((id) => new ObjectId(id!)) } }).toArray()
    : [];
  const senderById = new Map(senders.map((s) => [s._id!.toString(), { _id: s._id, companyName: s.companyName, userType: s.userType }]));

  return NextResponse.json(rows.map((r) => ({
    ...r,
    sender: r.senderProfileId ? senderById.get(r.senderProfileId.toString()) ?? null : null,
  })));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const profile = await getProfileForUser(auth.user.id);
  const body = await req.json();
  const data = z.object({
    tenderId: z.string(),
    vendorProfileId: z.string(),
    content: z.string().min(1).max(4000),
    bidId: z.string().optional(),
  }).parse(body);

  if (!ObjectId.isValid(data.tenderId) || !ObjectId.isValid(data.vendorProfileId)) {
    return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
  }

  const { tenders, messages } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(data.tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const vendorId = new ObjectId(data.vendorProfileId);
  const access = await assertOfferThreadAccess({ profile, tender, vendorProfileId: vendorId });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const companyId = tender.companyProfileId;
  const myId = profile!._id!;
  const receiverId = myId.toString() === companyId.toString() ? vendorId : companyId;

  const result = await messages.insertOne({
    senderProfileId: myId,
    receiverProfileId: receiverId,
    kind: 'offer_thread',
    visibility: 'private',
    tenderId: tender._id!,
    bidId: data.bidId && ObjectId.isValid(data.bidId) ? new ObjectId(data.bidId) : undefined,
    content: data.content.trim(),
    isRead: false,
    createdAt: new Date(),
  });

  await notify({
    profileId: receiverId,
    type: 'message_received',
    title: `Message on ${tender.title}`,
    content: data.content.trim().slice(0, 180),
    relatedId: tender._id!,
    relatedType: 'offer_thread',
  });

  return NextResponse.json(await messages.findOne({ _id: result.insertedId }), { status: 201 });
}
