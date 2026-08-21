import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { vendorQualifications } = await collections();
  await vendorQualifications.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'rejected', qualifiedBy: profile._id!, updatedAt: new Date() } });
  return NextResponse.json(await vendorQualifications.findOne({ _id: new ObjectId(id) }));
}
