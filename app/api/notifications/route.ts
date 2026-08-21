import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json([]);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20'), 100);
  const unreadOnly = req.nextUrl.searchParams.get('unreadOnly') === 'true';
  const { notifications } = await collections();
  const filter: Record<string, unknown> = { profileId: profile._id! };
  if (unreadOnly) filter.isRead = false;
  return NextResponse.json(await notifications.find(filter).sort({ createdAt: -1 }).limit(limit).toArray());
}
