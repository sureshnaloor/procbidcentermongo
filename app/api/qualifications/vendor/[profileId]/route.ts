import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  if (!ObjectId.isValid(profileId)) return NextResponse.json([]);
  const { vendorQualifications } = await collections();
  return NextResponse.json(await vendorQualifications.find({ profileId: new ObjectId(profileId) }).toArray());
}
