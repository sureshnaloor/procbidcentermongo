import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, getProfileForUser, isNextResponse } from '@/lib/auth-helpers';

const createSchema = z.object({
  userType: z.enum(['company', 'vendor']),
  companyName: z.string().optional(),
  registrationNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  capabilityGroupIds: z.array(z.string()).optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const existing = await getProfileForUser(auth.user.id);
  if (existing) return NextResponse.json({ error: 'Profile already exists' }, { status: 409 });

  const body = await req.json();
  const data = createSchema.parse(body);
  const { profiles } = await collections();
  const now = new Date();

  const result = await profiles.insertOne({
    userId: new ObjectId(auth.user.id),
    userType: data.userType,
    companyName: data.companyName || auth.user.displayName,
    registrationNumber: data.registrationNumber,
    contactPerson: data.contactPerson,
    phone: data.phone,
    address: data.address,
    country: data.country,
    city: data.city,
    website: data.website,
    description: data.description,
    capabilityGroupIds: (data.capabilityGroupIds ?? [])
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id)),
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  });

  const profile = await profiles.findOne({ _id: result.insertedId });
  return NextResponse.json(profile, { status: 201 });
}
