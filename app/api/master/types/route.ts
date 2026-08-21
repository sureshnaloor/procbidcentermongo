import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';
import { ensureDefaults } from '@/lib/seed-defaults';

export async function GET(req: NextRequest) {
  await ensureDefaults();
  const { materialServiceTypes } = await collections();
  const category = req.nextUrl.searchParams.get('category');
  const filter = category ? { category: category as 'material' | 'service' } : {};
  const types = await materialServiceTypes.find(filter).toArray();
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const body = await req.json();
  const data = z.object({
    category: z.enum(['material', 'service']),
    name: z.string().min(1),
    description: z.string().optional(),
  }).parse(body);

  const { materialServiceTypes } = await collections();
  const result = await materialServiceTypes.insertOne({ ...data, createdAt: new Date() });
  const type = await materialServiceTypes.findOne({ _id: result.insertedId });
  return NextResponse.json(type, { status: 201 });
}
