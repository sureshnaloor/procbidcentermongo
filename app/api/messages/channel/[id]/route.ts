import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json([]);
  const { messages, profiles } = await collections();
  const rows = await messages.find({ kind: 'channel', channelId: new ObjectId(id), visibility: 'public' }).sort({ createdAt: 1 }).toArray();
  const senderIds = [...new Set(rows.map((r) => r.senderProfileId?.toString()).filter(Boolean))];
  const senders = senderIds.length > 0 ? await profiles.find({ _id: { $in: senderIds.map((sid) => new ObjectId(sid!)) } }).toArray() : [];
  const senderById = new Map(senders.map((s) => [s._id!.toString(), s]));
  return NextResponse.json(rows.map((r) => ({ ...r, sender: r.senderProfileId ? senderById.get(r.senderProfileId.toString()) ?? null : null })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { messageChannels, messages } = await collections();
  const channel = await messageChannels.findOne({ _id: new ObjectId(id) });
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

  const isAdmin = auth.user.role === 'admin';
  const profile = await getProfileForUser(auth.user.id);
  if (channel.kind === 'alert' && !isAdmin) {
    return NextResponse.json({ error: 'Only administrators can post to Alerts' }, { status: 403 });
  }
  if (channel.kind === 'announcement' && !isAdmin && profile?.userType !== 'company') {
    return NextResponse.json({ error: 'Only companies and administrators can post announcements' }, { status: 403 });
  }
  const body = await req.json();
  const data = z.object({ content: z.string().min(1), subject: z.string().max(255).optional() }).parse(body);
  const result = await messages.insertOne({
    senderProfileId: profile?._id,
    channelId: new ObjectId(id),
    kind: 'channel',
    visibility: 'public',
    content: data.content.trim(),
    subject: data.subject?.trim() || undefined,
    isRead: false,
    createdAt: new Date(),
  });
  return NextResponse.json(await messages.findOne({ _id: result.insertedId }), { status: 201 });
}
