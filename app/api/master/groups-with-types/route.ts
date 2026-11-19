import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { ensureDefaults } from '@/lib/seed-defaults';

export async function GET(req: NextRequest) {
  await ensureDefaults();
  const category = req.nextUrl.searchParams.get('category');
  const { materialServiceTypes, materialServiceGroups } = await collections();

  const typeFilter = category ? { category: category as 'material' | 'service' } : {};
  const types = await materialServiceTypes.find(typeFilter).toArray();
  const groups = await materialServiceGroups.find({}).sort({ name: 1 }).toArray();
  const categoryOrder = { material: 0, service: 1 };
  const result = types
    .slice()
    .sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category] || a.name.localeCompare(b.name))
    .map((type) => ({
      ...type,
      groups: groups.filter((g) => g.typeId.toString() === type._id!.toString()),
    }));
  return NextResponse.json(result);
}
