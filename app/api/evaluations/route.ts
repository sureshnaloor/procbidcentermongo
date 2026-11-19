import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, getProfileForUser, isNextResponse } from '@/lib/auth-helpers';
import type { EvaluationGrade, EvaluationRecommendation } from '@/lib/types';

function computeOverallGrade(score: number): EvaluationGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const userProfile = await getProfileForUser(auth.user.id);
  if (!userProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  let companyId = searchParams.get('companyId');
  let vendorId = searchParams.get('vendorId');

  const { vendorEvaluations, profiles } = await collections();
  const filter: Record<string, unknown> = {};

  if (userProfile.userType === 'company') {
    filter.companyProfileId = userProfile._id;
    if (vendorId && ObjectId.isValid(vendorId)) {
      filter.vendorProfileId = new ObjectId(vendorId);
    }
  } else if (userProfile.userType === 'vendor') {
    filter.vendorProfileId = userProfile._id;
    if (companyId && ObjectId.isValid(companyId)) {
      filter.companyProfileId = new ObjectId(companyId);
    }
  } else if (auth.user.role === 'admin' || auth.user.isSuperAdmin) {
    if (companyId && ObjectId.isValid(companyId)) filter.companyProfileId = new ObjectId(companyId);
    if (vendorId && ObjectId.isValid(vendorId)) filter.vendorProfileId = new ObjectId(vendorId);
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const evaluations = await vendorEvaluations.find(filter).sort({ createdAt: -1 }).toArray();

  // Populate company and vendor names
  const companyIds = Array.from(new Set(evaluations.map((e) => e.companyProfileId.toString()))).map((id) => new ObjectId(id));
  const vendorIds = Array.from(new Set(evaluations.map((e) => e.vendorProfileId.toString()))).map((id) => new ObjectId(id));

  const [companyProfiles, vendorProfiles] = await Promise.all([
    companyIds.length ? profiles.find({ _id: { $in: companyIds } }).toArray() : Promise.resolve([]),
    vendorIds.length ? profiles.find({ _id: { $in: vendorIds } }).toArray() : Promise.resolve([]),
  ]);

  const companyMap = new Map(companyProfiles.map((p) => [p._id!.toString(), p]));
  const vendorMap = new Map(vendorProfiles.map((p) => [p._id!.toString(), p]));

  const enriched = evaluations.map((e) => {
    const comp = companyMap.get(e.companyProfileId.toString());
    const vend = vendorMap.get(e.vendorProfileId.toString());
    return {
      ...e,
      companyName: comp?.companyName || 'Company',
      vendorName: vend?.companyName || 'Supplier',
    };
  });

  return NextResponse.json(enriched);
}

const createEvaluationSchema = z.object({
  vendorProfileId: z.string().min(1),
  companyProfileId: z.string().optional(),
  periodOrProject: z.string().optional(),
  scores: z.object({
    quality: z.number().min(1).max(5),
    delivery: z.number().min(1).max(5),
    pricing: z.number().min(1).max(5),
    technical: z.number().min(1).max(5),
    responsiveness: z.number().min(1).max(5),
  }),
  recommendation: z.enum(['preferred', 'approved', 'conditional', 'under_review', 'not_recommended']),
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const userProfile = await getProfileForUser(auth.user.id);
  if (!userProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const body = await req.json();
  const data = createEvaluationSchema.parse(body);

  if (!ObjectId.isValid(data.vendorProfileId)) {
    return NextResponse.json({ error: 'Invalid vendorProfileId' }, { status: 400 });
  }

  let companyOid: ObjectId;
  if (userProfile.userType === 'company') {
    companyOid = userProfile._id!;
  } else if (auth.user.role === 'admin' || auth.user.isSuperAdmin) {
    if (!data.companyProfileId || !ObjectId.isValid(data.companyProfileId)) {
      return NextResponse.json({ error: 'companyProfileId is required for admin' }, { status: 400 });
    }
    companyOid = new ObjectId(data.companyProfileId);
  } else {
    return NextResponse.json({ error: 'Only companies can evaluate suppliers' }, { status: 403 });
  }

  const vendorOid = new ObjectId(data.vendorProfileId);
  const { profiles, vendorEvaluations } = await collections();

  const vendor = await profiles.findOne({ _id: vendorOid, userType: 'vendor' });
  if (!vendor) {
    return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
  }

  const { quality, delivery, pricing, technical, responsiveness } = data.scores;
  const overallScore = Math.round(((quality + delivery + pricing + technical + responsiveness) / 25) * 100);
  const grade = computeOverallGrade(overallScore);

  const now = new Date();
  const result = await vendorEvaluations.insertOne({
    companyProfileId: companyOid,
    vendorProfileId: vendorOid,
    evaluatorUserId: new ObjectId(auth.user.id),
    evaluatorName: auth.user.displayName || auth.user.username,
    periodOrProject: data.periodOrProject?.trim() || undefined,
    grade,
    overallScore,
    scores: {
      quality,
      delivery,
      pricing,
      technical,
      responsiveness,
    },
    recommendation: data.recommendation as EvaluationRecommendation,
    strengths: data.strengths?.trim() || undefined,
    areasForImprovement: data.areasForImprovement?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  });

  const created = await vendorEvaluations.findOne({ _id: result.insertedId });
  return NextResponse.json(created, { status: 201 });
}
