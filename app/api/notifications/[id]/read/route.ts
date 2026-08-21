import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse } from '@/lib/auth-helpers';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  await (await collections()).notifications.updateOne({ _id: new ObjectId(id) }, { $set: { isRead: true } });
  return NextResponse.json({ success: true });
}
