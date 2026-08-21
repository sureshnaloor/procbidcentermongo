import { NextRequest, NextResponse } from 'next/server';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse } from '@/lib/auth-helpers';
import type { Filter } from 'mongodb';
import type { IProfile } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { searchParams } = req.nextUrl;
  const userType = searchParams.get('userType') as IProfile['userType'] | null;
  const search = searchParams.get('search') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const { profiles, documents, materialServiceGroups, materialServiceTypes } = await collections();
  const filter: Filter<IProfile> = {};
  if (userType) filter.userType = userType;
  if (search) {
    filter.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    profiles.find(filter).skip(offset).limit(limit).toArray(),
    profiles.countDocuments(filter),
  ]);

  const vendorItems = items.filter((p) => p.userType === 'vendor');
  const vendorIds = vendorItems.map((p) => p._id!).filter(Boolean);
  const allGroupIds = vendorItems.flatMap((p) => p.capabilityGroupIds ?? []);

  const [groups, types, docCounts] = await Promise.all([
    allGroupIds.length
      ? materialServiceGroups.find({ _id: { $in: allGroupIds } }).toArray()
      : Promise.resolve([]),
    allGroupIds.length
      ? materialServiceTypes.find({}).toArray()
      : Promise.resolve([]),
    vendorIds.length
      ? documents.aggregate<{ _id: typeof vendorIds[number]; count: number }>([
          { $match: { profileId: { $in: vendorIds }, visibility: 'public' } },
          { $group: { _id: '$profileId', count: { $sum: 1 } } },
        ]).toArray()
      : Promise.resolve([]),
  ]);

  const typeById = new Map(types.map((t) => [t._id!.toString(), t]));
  const groupById = new Map(groups.map((g) => [g._id!.toString(), {
    _id: g._id,
    name: g.name,
    category: typeById.get(g.typeId.toString())?.category ?? 'material',
  }]));
  const docsByVendor = new Map(docCounts.map((row) => [row._id.toString(), row.count]));

  const safeItems = items.map((profile) => {
    const { userId: _userId, ...safe } = profile;
    if (profile.userType !== 'vendor') return safe;
    const capabilityGroups = (profile.capabilityGroupIds ?? [])
      .map((gid) => groupById.get(gid.toString()))
      .filter(Boolean);
    return {
      ...safe,
      capabilityGroups,
      publicDocumentCount: docsByVendor.get(profile._id!.toString()) ?? 0,
    };
  });

  return NextResponse.json({ items: safeItems, total });
}
