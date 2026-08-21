import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const body = await req.json();
  const data = z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().optional(),
    kind: z.enum(['information','announcement','alert','general']).optional(),
  }).parse(body);
  const { messageChannels } = await collections();
  await messageChannels.updateOne({ _id: new ObjectId(id) }, { $set: data });
  return NextResponse.json(await messageChannels.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { messages, messageChannels } = await collections();
  const oid = new ObjectId(id);
  const channel = await messageChannels.findOne({ _id: oid });
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  if (channel.isSystem) return NextResponse.json({ error: 'Predefined channels cannot be deleted' }, { status: 400 });
  await messages.deleteMany({ channelId: oid });
  await messageChannels.deleteOne({ _id: oid });
  return NextResponse.json({ success: true });
}
