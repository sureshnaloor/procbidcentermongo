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
    code: z.string().min(1).max(100).optional(),
    description: z.string().optional(),
    groupId: z.string().optional(),
  }).parse(body);
  const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.groupId) update.groupId = new ObjectId(data.groupId);
  const { materialServiceItems } = await collections();
  await materialServiceItems.updateOne({ _id: new ObjectId(id) }, { $set: update });
  return NextResponse.json(await materialServiceItems.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await (await collections()).materialServiceItems.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
