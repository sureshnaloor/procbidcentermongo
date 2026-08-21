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
    typeId: z.string().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }).parse(body);
  const update: Record<string, unknown> = { ...data };
  if (data.typeId) update.typeId = new ObjectId(data.typeId);
  const { materialServiceGroups } = await collections();
  await materialServiceGroups.updateOne({ _id: new ObjectId(id) }, { $set: update });
  return NextResponse.json(await materialServiceGroups.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { materialServiceGroups, materialServiceItems, vendorQualifications } = await collections();
  const oid = new ObjectId(id);
  const hasItems = await materialServiceItems.findOne({ groupId: oid });
  if (hasItems) return NextResponse.json({ error: 'Remove all items before deleting this group' }, { status: 400 });
  const hasQuals = await vendorQualifications.findOne({ groupId: oid });
  if (hasQuals) return NextResponse.json({ error: 'Group is referenced by vendor qualifications' }, { status: 400 });
  await materialServiceGroups.deleteOne({ _id: oid });
  return NextResponse.json({ success: true });
}
