import { NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { profiles, users } = await collections();
  const allProfiles = await profiles.find({}).toArray();
  const result = await Promise.all(
    allProfiles.map(async (p) => {
      const user = await users.findOne({ _id: p.userId });
      return { ...p, user: user ? { id: user._id, username: user.username, email: user.email, displayName: user.displayName, role: user.role } : null };
    })
  );
  return NextResponse.json(result.filter((r) => r.user?.role !== 'admin'));
}
