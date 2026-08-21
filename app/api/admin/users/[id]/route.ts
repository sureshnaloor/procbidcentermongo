import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const body = await req.json();
  const data = z.object({
    companyName: z.string().optional(), contactPerson: z.string().optional(),
    phone: z.string().optional(), country: z.string().optional(),
    city: z.string().optional(), website: z.string().optional(),
    description: z.string().optional(), isVerified: z.boolean().optional(),
  }).parse(body);
  const { profiles } = await collections();
  await profiles.updateOne({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date() } });
  return NextResponse.json(await profiles.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const { profiles, users, tenders, bids, vendorQualifications } = await collections();
  const profile = await profiles.findOne({ _id: new ObjectId(id) });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const hasTenders = await tenders.findOne({ companyProfileId: profile._id! });
  const hasBids = await bids.findOne({ vendorProfileId: profile._id! });
  if (hasTenders || hasBids) return NextResponse.json({ error: 'Cannot delete user with existing tenders or bids' }, { status: 400 });
  await vendorQualifications.deleteMany({ profileId: profile._id! });
  await profiles.deleteOne({ _id: profile._id! });
  await users.deleteOne({ _id: profile.userId });
  return NextResponse.json({ success: true });
}
