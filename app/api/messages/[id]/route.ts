import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { messages } = await collections();
  const msg = await messages.findOne({ _id: new ObjectId(id) });
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const profile = await getProfileForUser(auth.user.id);
  const ownsMessage = profile && msg.senderProfileId?.toString() === profile._id!.toString();
  const adminOrphan = auth.user.role === 'admin' && !msg.senderProfileId;
  if (msg.kind === 'offer_thread') {
    if (!ownsMessage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!ownsMessage && !adminOrphan) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const data = z.object({ content: z.string().min(1).optional(), subject: z.string().max(255).optional() }).parse(body);
  await messages.updateOne({ _id: new ObjectId(id) }, { $set: { ...data, editedAt: new Date() } });
  return NextResponse.json(await messages.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { messages } = await collections();
  const msg = await messages.findOne({ _id: new ObjectId(id) });
  if (!msg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const profile = await getProfileForUser(auth.user.id);
  const ownsMessage = profile && msg.senderProfileId?.toString() === profile._id!.toString();
  if (msg.kind === 'offer_thread') {
    if (!ownsMessage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else if (!ownsMessage && auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await messages.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
