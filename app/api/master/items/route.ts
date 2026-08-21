import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const { materialServiceItems, materialServiceGroups, materialServiceTypes } = await collections();
  const groupId = req.nextUrl.searchParams.get('groupId');
  const category = req.nextUrl.searchParams.get('category');

  if (groupId && ObjectId.isValid(groupId)) {
    return NextResponse.json(await materialServiceItems.find({ groupId: new ObjectId(groupId) }).toArray());
  }
  if (category) {
    const types = await materialServiceTypes.find({ category: category as 'material' | 'service' }).toArray();
    const typeIds = types.map((t) => t._id!);
    const groups = await materialServiceGroups.find({ typeId: { $in: typeIds } }).toArray();
    const groupIds = groups.map((g) => g._id!);
    return NextResponse.json(await materialServiceItems.find({ groupId: { $in: groupIds } }).toArray());
  }
  return NextResponse.json(await materialServiceItems.find({}).toArray());
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const body = await req.json();
  const data = z.object({
    groupId: z.string(),
    code: z.string().min(1).max(100),
    description: z.string().optional(),
  }).parse(body);
  const { materialServiceItems } = await collections();
  const now = new Date();
  const result = await materialServiceItems.insertOne({
    groupId: new ObjectId(data.groupId),
    code: data.code,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json(await materialServiceItems.findOne({ _id: result.insertedId }), { status: 201 });
}
