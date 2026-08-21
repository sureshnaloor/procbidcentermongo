import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function POST() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json({ success: false });
  await (await collections()).notifications.updateMany({ profileId: profile._id! }, { $set: { isRead: true } });
  return NextResponse.json({ success: true });
}
