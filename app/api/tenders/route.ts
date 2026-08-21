import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import {
  getSession, requireAuth, isNextResponse, getProfileForUser, requireCompanyProfile
} from '@/lib/auth-helpers';
import { saveTenderDocumentFile, TENDER_FILE_MAX_COUNT, TENDER_FILE_MAX_TOTAL_BYTES } from '@/lib/tender-files';
import { normalizeTenderClauses } from '@/lib/clauses';
import type { Filter } from 'mongodb';
import type { ITender } from '@/lib/types';

function parseDateEndOfDay(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59`);
  return new Date(value);
}

function isBidDeadlineOpen(deadline?: Date): boolean {
  if (!deadline) return true;
  return deadline.getTime() >= Date.now();
}

const tenderDocumentInput = z.object({
  category: z.enum(['drawing', 'terms', 'other']),
  fileName: z.string().min(1).max(255),
  fileType: z.string().optional(),
  fileBase64: z.string().min(1),
});

const tenderClauseInput = z.object({
  kind: z.enum(['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal', 'custom']),
  slug: z.string().optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  required: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await getSession();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const forAdmin = searchParams.get('forAdmin') === 'true';

  const { tenders } = await collections();
  const profile = session && session.user.role !== 'admin' ? await getProfileForUser(session.user.id) : null;

  const filter: Filter<ITender> = {};

  if (session) {
    if (forAdmin && session.user.role === 'admin') {
      // Admin sees all
    } else if (profile?.userType === 'company') {
      filter.companyProfileId = profile._id!;
    } else if (profile?.userType === 'vendor') {
      filter.status = { $in: ['published', 'closed', 'awarded'] };
    } else if (session.user.role === 'admin') {
      // Admin without profile sees all
    } else {
      filter.status = { $in: ['published', 'closed', 'awarded'] };
    }
  } else {
    // Unauthenticated user
    filter.status = { $in: ['published', 'closed', 'awarded'] };
  }

  if (status && !filter.status) filter.status = status as ITender['status'];
  if (type) filter.type = type as ITender['type'];
  if (search) filter.$or = [
    { title: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];

  const [items, total] = await Promise.all([
    tenders.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).toArray(),
    tenders.countDocuments(filter),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;

  const body = await req.json();
  const data = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['rfp', 'rfq', 'tender']),
    bidDeadline: z.string().optional(),
    deliveryDeadline: z.string().optional(),
    estimatedValue: z.number().optional(),
    currency: z.string().default('USD'),
    location: z.string().optional(),
    requirements: z.string().optional(),
    termsConditions: z.string().optional(),
    groupIds: z.array(z.string()).min(1, 'Select at least one material or service group'),
    clauses: z.array(tenderClauseInput).default([]),
    documents: z.array(tenderDocumentInput).max(TENDER_FILE_MAX_COUNT).default([]),
  }).parse(body);

  const savedFiles: { storedName: string }[] = [];
  try {
    let totalBytes = 0;
    const storedDocs = [];
    for (const doc of data.documents) {
      const stored = await saveTenderDocumentFile(doc.fileName, doc.fileBase64);
      totalBytes += stored.fileSize;
      if (totalBytes > TENDER_FILE_MAX_TOTAL_BYTES) {
        savedFiles.push(stored);
        return NextResponse.json({ error: 'Total file size exceeds 50 MB limit' }, { status: 400 });
      }
      savedFiles.push(stored);
      storedDocs.push({
        category: doc.category,
        name: doc.fileName,
        fileUrl: stored.fileUrl,
        storedName: stored.storedName,
        fileType: doc.fileType || stored.ext,
        fileSize: stored.fileSize,
        createdAt: new Date(),
      });
    }

    const now = new Date();
    const { tenders } = await collections();
    const result = await tenders.insertOne({
      companyProfileId: profile._id!,
      title: data.title,
      description: data.description,
      type: data.type,
      status: 'published',
      bidDeadline: data.bidDeadline ? parseDateEndOfDay(data.bidDeadline) : undefined,
      deliveryDeadline: data.deliveryDeadline ? parseDateEndOfDay(data.deliveryDeadline) : undefined,
      estimatedValue: data.estimatedValue,
      currency: data.currency,
      location: data.location,
      requirements: data.requirements,
      termsConditions: data.termsConditions,
      groupIds: data.groupIds.map((id) => new ObjectId(id)),
      clauses: normalizeTenderClauses(data.clauses),
      documents: storedDocs,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(await tenders.findOne({ _id: result.insertedId }), { status: 201 });
  } catch (err) {
    const { deleteTenderDocumentFile } = await import('@/lib/tender-files');
    await Promise.all(savedFiles.map((f) => deleteTenderDocumentFile(f.storedName)));
    throw err;
  }
}
