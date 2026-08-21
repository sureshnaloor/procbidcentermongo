import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse } from '@/lib/auth-helpers';

const updateSchema = z.object({
  companyName: z.string().optional(),
  registrationNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  yearEstablished: z.number().int().min(1800).max(2100).optional().nullable(),
  employeeCount: z.number().int().min(0).optional().nullable(),
  annualTurnover: z.number().min(0).optional().nullable(),
  turnoverCurrency: z.string().optional(),
  turnoverYear: z.number().int().min(1900).max(2100).optional().nullable(),
  taxId: z.string().optional(),
  industry: z.string().optional(),
}).partial();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json(null);
  const { profiles, documents } = await collections();
  const profile = await profiles.findOne({ _id: new ObjectId(id) });
  if (!profile) return NextResponse.json(null);
  const publicDocs = await documents.find({ profileId: profile._id!, visibility: 'public' }).sort({ createdAt: -1 }).toArray();
  const { userId: _userId, ...safe } = profile;
  return NextResponse.json({ ...safe, publicDocuments: publicDocs });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { profiles } = await collections();
  const profile = await profiles.findOne({ _id: new ObjectId(id) });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only owner can update own profile (or admin)
  if (profile.userId.toString() !== auth.user.id && auth.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data = updateSchema.parse(body);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  const unset: Record<string, ''> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null) unset[key] = '';
    else if (value !== undefined) set[key] = value;
  }
  await profiles.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: set,
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    }
  );
  const updated = await profiles.findOne({ _id: new ObjectId(id) });
  return NextResponse.json(updated);
}
