import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json([]);
  const { vendorQualifications } = await collections();
  return NextResponse.json(await vendorQualifications.find({ profileId: profile._id! }).toArray());
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json({ error: 'Profile required' }, { status: 403 });

  const body = await req.json();
  const data = z.object({ groupId: z.string() }).parse(body);
  const { vendorQualifications } = await collections();
  const gid = new ObjectId(data.groupId);

  const existing = await vendorQualifications.findOne({ profileId: profile._id!, groupId: gid });
  if (existing) return NextResponse.json(existing);

  const now = new Date();
  const result = await vendorQualifications.insertOne({
    profileId: profile._id!,
    groupId: gid,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json(await vendorQualifications.findOne({ _id: result.insertedId }), { status: 201 });
}
