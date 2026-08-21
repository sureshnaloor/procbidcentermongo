import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { MAX_COMPARISON_REMARKS } from '@/lib/types';
import type { IComparisonRemark } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId } = await params;
  if (!ObjectId.isValid(tenderId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const profile = await getProfileForUser(auth.user.id);
  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = auth.user.role === 'admin';
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = z.object({
    remarks: z.string().trim().min(5).max(2000),
    designation: z.string().trim().min(2).max(80),
    level: z.number().int().min(1).max(MAX_COMPARISON_REMARKS).optional(),
  }).parse(await req.json());

  const existing = [...(tender.comparisonRemarks ?? [])];
  const userId = new ObjectId(auth.user.id);
  const userName = auth.user.displayName || auth.user.username;
  const now = new Date();

  let next: IComparisonRemark[];
  if (data.level) {
    const atLevel = existing.find((r) => r.level === data.level);
    if (atLevel && atLevel.userId.toString() !== userId.toString() && !isAdmin) {
      return NextResponse.json({ error: 'This remark level was added by another user' }, { status: 403 });
    }
    const updated: IComparisonRemark = {
      level: data.level,
      userId,
      userName,
      designation: data.designation,
      remarks: data.remarks,
      createdAt: atLevel?.createdAt ?? now,
      updatedAt: now,
    };
    next = [...existing.filter((r) => r.level !== data.level), updated];
  } else {
    if (existing.length >= MAX_COMPARISON_REMARKS) {
      return NextResponse.json({ error: `A maximum of ${MAX_COMPARISON_REMARKS} company remarks is allowed` }, { status: 400 });
    }
    const used = new Set(existing.map((r) => r.level));
    let level = 1;
    while (used.has(level) && level <= MAX_COMPARISON_REMARKS) level += 1;
    next = [...existing, {
      level,
      userId,
      userName,
      designation: data.designation,
      remarks: data.remarks,
      createdAt: now,
      updatedAt: now,
    }];
  }

  next.sort((a, b) => a.level - b.level);
  await tenders.updateOne(
    { _id: tender._id! },
    { $set: { comparisonRemarks: next, updatedAt: now } }
  );

  return NextResponse.json({ remarks: next });
}
