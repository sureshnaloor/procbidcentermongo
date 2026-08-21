import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { notify } from '@/lib/notify';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json([]);
  const { profileId } = await params;
  if (!ObjectId.isValid(profileId)) return NextResponse.json([]);
  const otherId = new ObjectId(profileId);
  const myId = profile._id!;

  const { messages, profiles } = await collections();
  const rows = await messages.find({
    kind: 'dm',
    $or: [
      { senderProfileId: myId, receiverProfileId: otherId },
      { senderProfileId: otherId, receiverProfileId: myId },
    ],
  }).sort({ createdAt: 1 }).toArray();

  await messages.updateMany(
    { kind: 'dm', senderProfileId: otherId, receiverProfileId: myId, isRead: false },
    { $set: { isRead: true } }
  );

  const senderIds = [...new Set(rows.map((r) => r.senderProfileId?.toString()).filter(Boolean))];
  const senders = senderIds.length > 0
    ? await profiles.find({ _id: { $in: senderIds.map((sid) => new ObjectId(sid!)) } }).toArray()
    : [];
  const senderById = new Map(senders.map((s) => [s._id!.toString(), s]));
  return NextResponse.json(rows.map((r) => ({
    ...r,
    sender: r.senderProfileId ? senderById.get(r.senderProfileId.toString()) ?? null : null,
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json({ error: 'Profile required' }, { status: 403 });
  const { profileId } = await params;
  if (!ObjectId.isValid(profileId)) return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });

  const { profiles, messages } = await collections();
  const other = await profiles.findOne({ _id: new ObjectId(profileId) });
  if (!other) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  const companyToVendor = profile.userType === 'company' && other.userType === 'vendor';
  const vendorToCompany = profile.userType === 'vendor' && other.userType === 'company';
  if (!companyToVendor && !vendorToCompany) {
    return NextResponse.json({ error: 'Messages are only allowed between EPC company and supplier' }, { status: 403 });
  }
  if (profile._id!.toString() === other._id!.toString()) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
  }

  const body = await req.json();
  const data = z.object({
    content: z.string().min(1),
    subject: z.string().max(255).optional(),
    tenderId: z.string().optional(),
    bidId: z.string().optional(),
  }).parse(body);

  const result = await messages.insertOne({
    senderProfileId: profile._id!,
    receiverProfileId: other._id!,
    kind: 'dm',
    visibility: 'private',
    subject: data.subject?.trim() || undefined,
    content: data.content.trim(),
    tenderId: data.tenderId && ObjectId.isValid(data.tenderId) ? new ObjectId(data.tenderId) : undefined,
    bidId: data.bidId && ObjectId.isValid(data.bidId) ? new ObjectId(data.bidId) : undefined,
    isRead: false,
    createdAt: new Date(),
  });
  await notify({
    profileId: other._id!,
    type: 'message_received',
    title: `New message from ${profile.companyName || 'a contact'}`,
    content: data.content.trim().slice(0, 180),
    relatedId: profile._id!,
    relatedType: 'dm',
  });
  return NextResponse.json(await messages.findOne({ _id: result.insertedId }), { status: 201 });
}
