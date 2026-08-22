import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

// Remove an offline invite.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ tenderId: string; inviteId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId, inviteId } = await params;
  if (!ObjectId.isValid(tenderId) || !ObjectId.isValid(inviteId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const { tenders, offlineInvites } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const isAdmin = auth.user.role === 'admin';
  const profile = await getProfileForUser(auth.user.id);
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  await offlineInvites.deleteOne({ _id: new ObjectId(inviteId), tenderId: tender._id! });
  return NextResponse.json({ ok: true });
}
