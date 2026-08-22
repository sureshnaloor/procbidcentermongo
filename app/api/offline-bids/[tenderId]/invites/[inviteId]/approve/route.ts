import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

// Approve an offline invite (self-approval allowed — the same user may approve).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ tenderId: string; inviteId: string }> }) {
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

  const invite = await offlineInvites.findOne({ _id: new ObjectId(inviteId), tenderId: tender._id! });
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.status === 'approved') return NextResponse.json(invite);

  await offlineInvites.updateOne(
    { _id: invite._id! },
    { $set: { status: 'approved', approvedBy: auth.user.displayName, approvedAt: new Date() } }
  );
  return NextResponse.json(await offlineInvites.findOne({ _id: invite._id! }));
}
