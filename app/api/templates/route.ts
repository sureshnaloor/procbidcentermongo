import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser, requireCompanyProfile } from '@/lib/auth-helpers';
import { ensureDefaults } from '@/lib/seed-defaults';
import { ALL_CLAUSE_KINDS, CLAUSE_KINDS } from '@/lib/constants';
import { makeCustomSlug } from '@/lib/clauses';
import type { ClauseKind } from '@/lib/types';

const kindSchema = z.enum(ALL_CLAUSE_KINDS);

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  await ensureDefaults();

  const profile = await getProfileForUser(auth.user.id);
  const { clauseTemplates } = await collections();
  const system = await clauseTemplates.find({ isSystem: true }).toArray();
  const company = profile?.userType === 'company' && profile._id
    ? await clauseTemplates.find({ companyProfileId: profile._id }).toArray()
    : [];

  const seededKinds = new Set<string>(CLAUSE_KINDS);
  const companySeeded = company.filter((t) => seededKinds.has(t.kind));
  const custom = company.filter((t) => t.kind === 'custom');
  const companyByKind = new Map(companySeeded.map((t) => [t.kind, t]));
  const resolved = system.map((tpl) => companyByKind.get(tpl.kind) ?? tpl);

  return NextResponse.json({ system, company: companySeeded, custom, resolved });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;

  const body = await req.json();
  const data = z.object({
    kind: kindSchema.default('custom'),
    title: z.string().min(1).max(200),
    body: z.string().min(1),
  }).parse(body);

  const { clauseTemplates } = await collections();
  const now = new Date();
  const kind = data.kind as ClauseKind;

  if (kind !== 'custom') {
    const existing = await clauseTemplates.findOne({ companyProfileId: profile._id!, kind });
    if (existing) {
      await clauseTemplates.updateOne(
        { _id: existing._id },
        { $set: { title: data.title.trim(), body: data.body, updatedAt: now } }
      );
      return NextResponse.json(await clauseTemplates.findOne({ _id: existing._id }));
    }
    const result = await clauseTemplates.insertOne({
      kind,
      title: data.title.trim(),
      body: data.body,
      isSystem: false,
      companyProfileId: profile._id!,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json(await clauseTemplates.findOne({ _id: result.insertedId }), { status: 201 });
  }

  const result = await clauseTemplates.insertOne({
    kind: 'custom',
    slug: makeCustomSlug(data.title),
    title: data.title.trim(),
    body: data.body,
    isSystem: false,
    companyProfileId: profile._id!,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json(await clauseTemplates.findOne({ _id: result.insertedId }), { status: 201 });
}
