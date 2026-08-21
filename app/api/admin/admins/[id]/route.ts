import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse, isSuperAdminUsername } from '@/lib/auth-helpers';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  if (!auth.user.isSuperAdmin) return NextResponse.json({ error: 'Only super-admin can remove admins' }, { status: 403 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { users } = await collections();
  const target = await users.findOne({ _id: new ObjectId(id) });
  if (!target || target.role !== 'admin') return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  if (isSuperAdminUsername(target.username)) return NextResponse.json({ error: 'Cannot remove super-admin' }, { status: 403 });
  if (target._id!.toString() === auth.user.id) return NextResponse.json({ error: 'Cannot remove your own account' }, { status: 403 });
  await users.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
