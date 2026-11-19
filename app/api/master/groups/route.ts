import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';
import { ensureCategoryType, getOrCreateTaxonomyType, ensureDefaults } from '@/lib/seed-defaults';

export async function GET(req: NextRequest) {
  await ensureDefaults();
  const { materialServiceGroups, materialServiceTypes } = await collections();
  const typeId = req.nextUrl.searchParams.get('typeId');
  const category = req.nextUrl.searchParams.get('category');
  const typeName = req.nextUrl.searchParams.get('typeName');

  if (typeId && ObjectId.isValid(typeId)) {
    return NextResponse.json(await materialServiceGroups.find({ typeId: new ObjectId(typeId) }).sort({ name: 1 }).toArray());
  }

  if (typeName && category) {
    const type = await materialServiceTypes.findOne({
      category: category as 'material' | 'service',
      name: { $regex: new RegExp(`^${typeName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (!type) return NextResponse.json([]);
    return NextResponse.json(await materialServiceGroups.find({ typeId: type._id }).sort({ name: 1 }).toArray());
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
    typeName: z.string().optional(),
    category: z.enum(['material', 'service']).optional(),
    name: z.string().min(1),
    description: z.string().optional(),
  }).refine((d) => d.typeId || (d.typeName && d.category) || d.category, {
    message: 'typeId, (typeName and category), or category is required',
  }).parse(body);

  let targetTypeId: ObjectId;
  if (data.typeId && ObjectId.isValid(data.typeId)) {
    targetTypeId = new ObjectId(data.typeId);
  } else if (data.typeName && data.category) {
    const taxType = await getOrCreateTaxonomyType(data.category, data.typeName);
    targetTypeId = taxType._id!;
  } else {
    const type = await ensureCategoryType(data.category!);
    targetTypeId = type._id!;
  }

  const { materialServiceGroups } = await collections();
  try {
    const result = await materialServiceGroups.insertOne({
      typeId: targetTypeId,
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      createdAt: new Date(),
    });
    return NextResponse.json(await materialServiceGroups.findOne({ _id: result.insertedId }), { status: 201 });
  } catch (err: unknown) {
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: number }).code : undefined;
    if (code === 11000) {
      return NextResponse.json({ error: 'A group with this name already exists in this type' }, { status: 409 });
    }
    throw err;
  }
}
