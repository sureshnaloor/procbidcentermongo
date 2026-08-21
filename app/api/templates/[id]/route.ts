import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireCompanyProfile, requireAuth, isNextResponse } from '@/lib/auth-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await req.json();
  const data = z.object({
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).optional(),
  }).parse(body);

  const { clauseTemplates } = await collections();
  const tpl = await clauseTemplates.findOne({ _id: new ObjectId(id) });
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tpl.isSystem || tpl.companyProfileId?.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only edit your own templates' }, { status: 403 });
  }

  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title) setFields.title = data.title.trim();
  if (data.body) setFields.body = data.body;
  await clauseTemplates.updateOne({ _id: tpl._id }, { $set: setFields });
  return NextResponse.json(await clauseTemplates.findOne({ _id: tpl._id }));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { clauseTemplates } = await collections();
  const tpl = await clauseTemplates.findOne({ _id: new ObjectId(id) });
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tpl.isSystem || tpl.companyProfileId?.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only delete your own templates' }, { status: 403 });
  }
  await clauseTemplates.deleteOne({ _id: tpl._id });
  return NextResponse.json({ success: true });
}
