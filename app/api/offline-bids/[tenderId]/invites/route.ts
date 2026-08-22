import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { isBidDeadlineOpen } from '@/lib/tender-access';

async function loadOwnedTender(auth: { user: { id: string; role: string } }, tenderId: string) {
  if (!ObjectId.isValid(tenderId)) return { error: NextResponse.json({ error: 'Invalid id' }, { status: 400 }) };
  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  const isAdmin = auth.user.role === 'admin';
  const profile = await getProfileForUser(auth.user.id);
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return { error: NextResponse.json({ error: 'Access denied' }, { status: 403 }) };
  if (tender.status !== 'published') {
    return { error: NextResponse.json({ error: 'Offline invites are allowed only on published packages' }, { status: 400 }) };
  }
  return { tender };
}

// Invite an offline supplier (record that the workbook was emailed to them).
export async function POST(req: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId } = await params;
  const access = await loadOwnedTender(auth, tenderId);
  if ('error' in access) return access.error;
  const { tender } = access;
  if (!isBidDeadlineOpen(tender.bidDeadline)) {
    return NextResponse.json({ error: 'The bid deadline has passed' }, { status: 400 });
  }

  const data = z.object({
    supplierName: z.string().min(1).max(200),
    email: z.string().email().max(200),
    note: z.string().max(500).optional(),
  }).parse(await req.json());

  const { offlineInvites } = await collections();
  const emailKey = data.email.trim().toLowerCase();
  const existing = await offlineInvites.findOne({ tenderId: tender._id!, email: emailKey });
  if (existing) {
    return NextResponse.json({ error: 'This supplier email is already invited for this package' }, { status: 409 });
  }

  const now = new Date();
  const result = await offlineInvites.insertOne({
    tenderId: tender._id!,
    companyProfileId: tender.companyProfileId,
    supplierName: data.supplierName.trim(),
    email: emailKey,
    status: 'pending',
    note: data.note?.trim() || undefined,
    createdBy: auth.user.displayName,
    createdAt: now,
  });

  return NextResponse.json(await offlineInvites.findOne({ _id: result.insertedId }), { status: 201 });
}
