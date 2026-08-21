import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';
import { ensureCategoryType, ensureDefaults } from '@/lib/seed-defaults';

export async function GET(req: NextRequest) {
  await ensureDefaults();
  const { materialServiceGroups, materialServiceTypes } = await collections();
  const typeId = req.nextUrl.searchParams.get('typeId');
  const category = req.nextUrl.searchParams.get('category');

  if (typeId && ObjectId.isValid(typeId)) {
    return NextResponse.json(await materialServiceGroups.find({ typeId: new ObjectId(typeId) }).sort({ name: 1 }).toArray());
  }
  if (category) {
    const types = await materialServiceTypes.find({ category: category as 'material' | 'service' }).toArray();
    const typeIds = types.map((t) => t._id!);
    return NextResponse.json(await materialServiceGroups.find({ typeId: { $in: typeIds } }).sort({ name: 1 }).toArray());
  }
  return NextResponse.json(await materialServiceGroups.find({}).sort({ name: 1 }).toArray());
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const body = await req.json();
  const data = z.object({
    typeId: z.string().optional(),
    category: z.enum(['material', 'service']).optional(),
    name: z.string().min(1),
    description: z.string().optional(),
  }).refine((d) => d.typeId || d.category, { message: 'typeId or category is required' }).parse(body);

  const type = data.typeId
    ? { _id: new ObjectId(data.typeId) }
    : await ensureCategoryType(data.category!);

  const { materialServiceGroups } = await collections();
  try {
    const result = await materialServiceGroups.insertOne({
      typeId: type._id!,
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      createdAt: new Date(),
    });
    return NextResponse.json(await materialServiceGroups.findOne({ _id: result.insertedId }), { status: 201 });
  } catch (err: unknown) {
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: number }).code : undefined;
    if (code === 11000) {
      return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
    }
    throw err;
  }
}
