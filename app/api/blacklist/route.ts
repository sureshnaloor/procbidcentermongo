import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const company = await requireCompanyProfile(auth);
  if (isNextResponse(company)) return company;

  const { vendorBlacklist, profiles } = await collections();
  const rows = await vendorBlacklist.find({ companyProfileId: company._id! }).sort({ createdAt: -1 }).toArray();
  const vendorIds = rows.map((r) => r.vendorProfileId);
  const vendors = vendorIds.length ? await profiles.find({ _id: { $in: vendorIds } }).toArray() : [];
  const byId = new Map(vendors.map((v) => [v._id!.toString(), v]));
  return NextResponse.json(rows.map((r) => ({
    ...r,
    vendor: byId.get(r.vendorProfileId.toString()) ?? null,
  })));
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const company = await requireCompanyProfile(auth);
  if (isNextResponse(company)) return company;

  const body = await req.json();
  const data = z.object({
    vendorProfileId: z.string(),
    reason: z.string().max(1000).optional(),
    relatedTenderId: z.string().optional(),
    relatedBidId: z.string().optional(),
  }).parse(body);

  if (!ObjectId.isValid(data.vendorProfileId)) {
    return NextResponse.json({ error: 'Invalid supplier' }, { status: 400 });
  }

  const { vendorBlacklist, profiles } = await collections();
  const vendor = await profiles.findOne({ _id: new ObjectId(data.vendorProfileId), userType: 'vendor' });
  if (!vendor) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

  const existing = await vendorBlacklist.findOne({
    companyProfileId: company._id!,
    vendorProfileId: vendor._id!,
  });
  if (existing) return NextResponse.json(existing);

  const result = await vendorBlacklist.insertOne({
    companyProfileId: company._id!,
    vendorProfileId: vendor._id!,
    reason: data.reason,
    relatedTenderId: data.relatedTenderId && ObjectId.isValid(data.relatedTenderId) ? new ObjectId(data.relatedTenderId) : undefined,
    relatedBidId: data.relatedBidId && ObjectId.isValid(data.relatedBidId) ? new ObjectId(data.relatedBidId) : undefined,
    createdAt: new Date(),
  });
  return NextResponse.json(await vendorBlacklist.findOne({ _id: result.insertedId }), { status: 201 });
}
