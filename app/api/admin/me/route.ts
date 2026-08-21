import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse, isSuperAdminUsername } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  return NextResponse.json({
    isSuperAdmin: auth.user.isSuperAdmin,
    superadminConfigured: !!process.env.SUPERADMIN_USERNAME,
  });
}
