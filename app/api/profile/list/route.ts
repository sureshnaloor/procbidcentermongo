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

  const { profiles } = await collections();
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

  return NextResponse.json({ items, total });
}
