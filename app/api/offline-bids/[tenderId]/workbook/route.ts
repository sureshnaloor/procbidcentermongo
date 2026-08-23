import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { buildOfflineBidWorkbook } from '@/lib/offline-bid';
import { xlsxResponse } from '@/lib/boq-sheet';

// Download the fillable offline-offer workbook for a package.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId } = await params;
  if (!ObjectId.isValid(tenderId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(tenderId) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = auth.user.role === 'admin';
  const profile = await getProfileForUser(auth.user.id);
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const buffer = await buildOfflineBidWorkbook(tender);
  return xlsxResponse(buffer, `offline-offer-${tender.title}.xlsx`);
}
