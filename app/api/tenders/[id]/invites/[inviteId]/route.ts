import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser, requireCompanyProfile } from '@/lib/auth-helpers';
import { notify } from '@/lib/notify';
import type { TenderInviteStatus } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; inviteId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id, inviteId } = await params;
  if (!ObjectId.isValid(id) || !ObjectId.isValid(inviteId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await req.json();
  const data = z.object({
    status: z.enum(['accepted', 'declined', 'revoked']),
  }).parse(body);

  const { tenders, tenderInvites } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) });
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });

  const invite = await tenderInvites.findOne({ _id: new ObjectId(inviteId), tenderId: tender._id! });
  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  const company = profile?.userType === 'company' ? profile : null;
  const isOwner = company && company._id!.toString() === tender.companyProfileId.toString();
  const isVendor = profile?.userType === 'vendor' && profile._id!.toString() === invite.vendorProfileId.toString();

  const next = data.status as TenderInviteStatus;
  if (next === 'accepted' || next === 'revoked') {
    if (!isOwner) {
      const ownerCheck = await requireCompanyProfile(auth);
      if (isNextResponse(ownerCheck)) return ownerCheck;
      return NextResponse.json({ error: 'Only the company that created this tender can update this invite' }, { status: 403 });
    }
    if (next === 'accepted' && invite.status !== 'requested' && invite.status !== 'invited') {
      return NextResponse.json({ error: 'This request cannot be accepted' }, { status: 400 });
    }
  }
  if (next === 'declined') {
    if (!isOwner && !isVendor) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  await tenderInvites.updateOne({ _id: invite._id }, { $set: { status: next, updatedAt: new Date() } });
  const updated = await tenderInvites.findOne({ _id: invite._id });

  if (next === 'accepted') {
    await notify({
      profileId: invite.vendorProfileId,
      type: 'invite_accepted',
      title: `You may now offer on: ${tender.title}`,
      relatedId: tender._id,
      relatedType: 'tender',
    });
  }
  if (next === 'declined' || next === 'revoked') {
    await notify({
      profileId: next === 'declined' && isOwner ? invite.vendorProfileId : tender.companyProfileId,
      type: 'invite_declined',
      title: next === 'revoked' ? `Invite withdrawn: ${tender.title}` : `Participation declined: ${tender.title}`,
      relatedId: tender._id,
      relatedType: 'tender',
    });
  }

  return NextResponse.json(updated);
}
