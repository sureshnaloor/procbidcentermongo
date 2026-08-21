import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { buildCompanyBoqWorkbook, buildSupplierBoqWorkbook, xlsxResponse } from '@/lib/boq-sheet';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders, bids } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  const isAdmin = auth.user.role === 'admin';
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();
  const isVendor = profile?.userType === 'vendor';
  if (!isAdmin && !isOwner && !(isVendor && tender.status !== 'draft')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filled = req.nextUrl.searchParams.get('filled') === '1';
  const boqItems = tender.boqItems ?? [];
  const safeTitle = (tender.title || 'BOQ').replace(/[^\w.-]+/g, '-').slice(0, 60);

  if (isOwner || isAdmin) {
    if (!filled) {
      const file = xlsxResponse(buildCompanyBoqWorkbook(boqItems), `${safeTitle}-BOQ.xlsx`);
      return file;
    }
  }

  let quotes: Array<{
    lineCode?: string;
    description: string;
    quantity: number;
    originalQuantity?: number;
    quantityChangeReason?: string;
    unit: string;
    unitPrice: number;
    notes?: string;
    deliveryMode?: 'days' | 'weeks' | 'working_weeks' | 'date';
    deliveryValue?: number;
  }> | undefined;

  if (filled && isVendor && profile?._id) {
    const bid = await bids.find({ tenderId: tender._id!, vendorProfileId: profile._id }).sort({ createdAt: -1 }).limit(1).next();
    quotes = (bid?.lineItems ?? []).map((item) => ({
      lineCode: item.lineCode,
      description: item.description,
      quantity: item.quantity,
      originalQuantity: item.originalQuantity,
      quantityChangeReason: item.quantityChangeReason,
      unit: item.unit,
      unitPrice: item.unitPrice,
      notes: item.notes,
      deliveryMode: item.deliveryMode,
      deliveryValue: item.deliveryValue,
    }));
  }

  if (boqItems.length === 0 && !quotes?.length) {
    return NextResponse.json({ error: 'This package has no BOQ lines yet' }, { status: 400 });
  }

  return xlsxResponse(
    buildSupplierBoqWorkbook({
      title: tender.title,
      currency: tender.currency || 'USD',
      boqItems,
      quotes,
    }),
    `${safeTitle}-quote-BOQ.xlsx`
  );
}
