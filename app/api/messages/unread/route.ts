import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json({ count: 0 });
  const { messages } = await collections();
  const count = await messages.countDocuments({
    receiverProfileId: profile._id!,
    isRead: false,
    kind: { $in: ['dm', 'offer_thread'] },
  });
  return NextResponse.json({ count });
}
