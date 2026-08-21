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
  const data = z.object({ name: z.string().min(1).optional(), description: z.string().optional() }).parse(body);
  const { materialServiceTypes } = await collections();
  await materialServiceTypes.updateOne({ _id: new ObjectId(id) }, { $set: data });
  return NextResponse.json(await materialServiceTypes.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { materialServiceTypes, materialServiceGroups } = await collections();
  const hasGroups = await materialServiceGroups.findOne({ typeId: new ObjectId(id) });
  if (hasGroups) return NextResponse.json({ error: 'Remove all groups under this type before deleting' }, { status: 400 });

  await materialServiceTypes.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
