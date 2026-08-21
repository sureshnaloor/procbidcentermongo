import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ vendorId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const company = await requireCompanyProfile(auth);
  if (isNextResponse(company)) return company;
  const { vendorId } = await params;
  if (!ObjectId.isValid(vendorId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { vendorBlacklist } = await collections();
  await vendorBlacklist.deleteOne({
    companyProfileId: company._id!,
    vendorProfileId: new ObjectId(vendorId),
  });
  return NextResponse.json({ success: true });
}
