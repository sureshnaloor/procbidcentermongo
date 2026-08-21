import { NextResponse } from 'next/server';
import { getSession, getProfileForUser } from '@/lib/auth-helpers';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);
  const profile = await getProfileForUser(session.user.id);
  return NextResponse.json({ user: session.user, profile });
}
