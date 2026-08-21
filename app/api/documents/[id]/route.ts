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
  const profile = await getProfileForUser(auth.user.id);
  const { documents } = await collections();
  const doc = await documents.findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!profile || doc.profileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const data = z.object({
    name: z.string().optional(),
    visibility: z.enum(['public','private','selected']).optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    grantedToProfileIds: z.array(z.string()).optional(),
  }).parse(body);
  const set: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.grantedToProfileIds) set.grantedToProfileIds = data.grantedToProfileIds.map((pid) => new ObjectId(pid));
  await documents.updateOne({ _id: new ObjectId(id) }, { $set: set });
  return NextResponse.json(await documents.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const profile = await getProfileForUser(auth.user.id);
  const { documents } = await collections();
  const doc = await documents.findOne({ _id: new ObjectId(id) });
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!profile || doc.profileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (doc.storedName) {
    const { deleteProfileDocumentFile } = await import('@/lib/profile-files');
    await deleteProfileDocumentFile(doc.storedName);
  }
  await documents.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
