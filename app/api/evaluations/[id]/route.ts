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

const updateSchema = z.object({
  periodOrProject: z.string().optional(),
  scores: z.object({
    quality: z.number().min(1).max(5),
    delivery: z.number().min(1).max(5),
    pricing: z.number().min(1).max(5),
    technical: z.number().min(1).max(5),
    responsiveness: z.number().min(1).max(5),
  }).optional(),
  recommendation: z.enum(['preferred', 'approved', 'conditional', 'under_review', 'not_recommended']).optional(),
  strengths: z.string().optional(),
  areasForImprovement: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const userProfile = await getProfileForUser(auth.user.id);
  if (!userProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { vendorEvaluations } = await collections();
  const evaluation = await vendorEvaluations.findOne({ _id: new ObjectId(id) });
  if (!evaluation) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

  const isOwner =
    evaluation.companyProfileId.toString() === userProfile._id!.toString() ||
    evaluation.vendorProfileId.toString() === userProfile._id!.toString() ||
    auth.user.role === 'admin' ||
    auth.user.isSuperAdmin;

  if (!isOwner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  return NextResponse.json(evaluation);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const userProfile = await getProfileForUser(auth.user.id);
  if (!userProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { vendorEvaluations } = await collections();
  const existing = await vendorEvaluations.findOne({ _id: new ObjectId(id) });
  if (!existing) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

  const canEdit =
    existing.companyProfileId.toString() === userProfile._id!.toString() ||
    auth.user.role === 'admin' ||
    auth.user.isSuperAdmin;

  if (!canEdit) return NextResponse.json({ error: 'Only the evaluating company can modify evaluations' }, { status: 403 });

  const body = await req.json();
  const data = updateSchema.parse(body);

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.periodOrProject !== undefined) updates.periodOrProject = data.periodOrProject.trim() || undefined;
  if (data.recommendation) updates.recommendation = data.recommendation as EvaluationRecommendation;
  if (data.strengths !== undefined) updates.strengths = data.strengths.trim() || undefined;
  if (data.areasForImprovement !== undefined) updates.areasForImprovement = data.areasForImprovement.trim() || undefined;
  if (data.notes !== undefined) updates.notes = data.notes.trim() || undefined;

  if (data.scores) {
    const { quality, delivery, pricing, technical, responsiveness } = data.scores;
    const overallScore = Math.round(((quality + delivery + pricing + technical + responsiveness) / 25) * 100);
    const grade = computeOverallGrade(overallScore);
    updates.scores = data.scores;
    updates.overallScore = overallScore;
    updates.grade = grade;
  }

  await vendorEvaluations.updateOne({ _id: new ObjectId(id) }, { $set: updates });
  return NextResponse.json(await vendorEvaluations.findOne({ _id: new ObjectId(id) }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const userProfile = await getProfileForUser(auth.user.id);
  if (!userProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { vendorEvaluations } = await collections();
  const existing = await vendorEvaluations.findOne({ _id: new ObjectId(id) });
  if (!existing) return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });

  const canDelete =
    existing.companyProfileId.toString() === userProfile._id!.toString() ||
    auth.user.role === 'admin' ||
    auth.user.isSuperAdmin;

  if (!canDelete) return NextResponse.json({ error: 'Only the evaluating company can delete evaluations' }, { status: 403 });

  await vendorEvaluations.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true });
}
