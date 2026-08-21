import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';
import { saveTenderDocumentFile } from '@/lib/tender-files';
import { DOCUMENT_CATEGORY_VALUES } from '@/lib/procurement';
import type { TenderDocumentCategory } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json([]);
  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) }, { projection: { documents: 1 } });
  return NextResponse.json(tender?.documents ?? []);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;

  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: new ObjectId(id) });
  if (!tender) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tender.companyProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const category = (DOCUMENT_CATEGORY_VALUES as readonly string[]).includes(body.category)
    ? (body.category as TenderDocumentCategory)
    : 'other';
  const stored = await saveTenderDocumentFile(body.fileName, body.fileBase64);
  const doc = {
    category,
    name: body.fileName,
    fileUrl: stored.fileUrl,
    storedName: stored.storedName,
    fileType: body.fileType || stored.ext,
    fileSize: stored.fileSize,
    createdAt: new Date(),
  };

  await tenders.updateOne({ _id: new ObjectId(id) }, { $push: { documents: doc } });
  return NextResponse.json(doc, { status: 201 });
}
