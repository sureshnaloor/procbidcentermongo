import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import {
  getSession, requireAuth, isNextResponse, getProfileForUser, requireCompanyProfile, requireVerifiedCompanyProfile
} from '@/lib/auth-helpers';
import { saveTenderDocumentFile, TENDER_FILE_MAX_COUNT, TENDER_FILE_MAX_TOTAL_BYTES } from '@/lib/tender-files';
import { normalizeTenderClauses } from '@/lib/clauses';
import { DEFAULT_PROCUREMENT_TYPE, DOCUMENT_CATEGORY_VALUES, getPublishBlockers, getPublishDateIssues } from '@/lib/procurement';
import { isOfferAuthorized } from '@/lib/tender-access';
import { resolvedBidTotal } from '@/lib/bid-line';
import { INCOTERM_CODES } from '@/lib/incoterms';
import type { Filter } from 'mongodb';
import type { ITender, ITenderBoqItem } from '@/lib/types';

function parseDateEndOfDay(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59`);
  return new Date(value);
}

const tenderDocumentInput = z.object({
  category: z.enum(DOCUMENT_CATEGORY_VALUES),
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

const tenderBoqItemInput = z.object({
  lineCode: z.string().max(40).optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(40),
  groupId: z.string().optional(),
  itemId: z.string().optional(),
});

function normalizeBoqItems(items: z.infer<typeof tenderBoqItemInput>[]): ITenderBoqItem[] {
  return items.map((item, i) => ({
    lineCode: item.lineCode?.trim() || `BOQ-${String(i + 1).padStart(3, '0')}`,
    description: item.description.trim(),
    quantity: item.quantity,
    unit: item.unit.trim(),
    groupId: item.groupId && ObjectId.isValid(item.groupId) ? new ObjectId(item.groupId) : undefined,
    itemId: item.itemId && ObjectId.isValid(item.itemId) ? new ObjectId(item.itemId) : undefined,
  }));
}

export async function GET(req: NextRequest) {
  const session = await getSession();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0');
  const forAdmin = searchParams.get('forAdmin') === 'true';

  const { tenders, profiles, tenderInvites, bids } = await collections();
  const profile = session && session.user.role !== 'admin' ? await getProfileForUser(session.user.id) : null;

  const filter: Filter<ITender> = {};
  const mine = searchParams.get('mine') === '1';

  if (session) {
    if (forAdmin && session.user.role === 'admin') {
      // Admin sees all
    } else if (profile?.userType === 'company') {
      filter.companyProfileId = profile._id!;
    } else if (profile?.userType === 'vendor') {
      if (mine) {
        const [invites, ownBids] = await Promise.all([
          tenderInvites.find({
            vendorProfileId: profile._id!,
            status: { $in: ['invited', 'accepted', 'requested'] },
          }).toArray(),
          bids.find({ vendorProfileId: profile._id! }).project({ tenderId: 1 }).toArray(),
        ]);
        const idSet = new Set([
          ...invites.map((i) => i.tenderId.toString()),
          ...ownBids.map((b) => b.tenderId.toString()),
        ]);
        if (idSet.size === 0) return NextResponse.json({ items: [], total: 0 });
        filter._id = { $in: [...idSet].map((id) => new ObjectId(id)) };
      } else {
        filter.status = { $in: ['published', 'closed', 'awarded'] };
      }
    } else if (session.user.role === 'admin') {
      // Admin without profile sees all
    } else {
      filter.status = { $in: ['published', 'closed', 'awarded'] };
    }
  } else {
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

  if (items.length === 0) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const tenderIds = items.map((t) => t._id!);

  // Vendor view enrichment
  if (profile?.userType === 'vendor') {
    const companyIds = [...new Set(items.map((t) => t.companyProfileId.toString()))].map((id) => new ObjectId(id));
    const [companies, invites, ownBids] = await Promise.all([
      companyIds.length ? profiles.find({ _id: { $in: companyIds } }).toArray() : Promise.resolve([]),
      tenderInvites.find({ vendorProfileId: profile._id!, tenderId: { $in: tenderIds } }).toArray(),
      bids.find({ vendorProfileId: profile._id!, tenderId: { $in: tenderIds } }).sort({ createdAt: -1 }).toArray(),
    ]);
    const companyById = new Map(companies.map((c) => [c._id!.toString(), {
      _id: c._id,
      companyName: c.companyName,
      city: c.city,
      country: c.country,
    }]));
    const inviteByTender = new Map(invites.map((i) => [i.tenderId.toString(), i]));
    const bidsByTender = new Map<string, typeof ownBids>();
    for (const bid of ownBids) {
      const key = bid.tenderId.toString();
      const list = bidsByTender.get(key) ?? [];
      list.push(bid);
      bidsByTender.set(key, list);
    }

    const enriched = items.map((tender) => {
      const invite = inviteByTender.get(tender._id!.toString());
      const myBids = bidsByTender.get(tender._id!.toString()) ?? [];
      return {
        ...tender,
        company: companyById.get(tender.companyProfileId.toString()) ?? null,
        participation: invite
          ? { status: invite.status, canPrepareOffer: isOfferAuthorized(invite.status) && myBids.length === 0 }
          : { status: null, canPrepareOffer: false },
        myBids: myBids.map((b) => ({ ...b, totalPrice: resolvedBidTotal(b) })),
      };
    });

    return NextResponse.json({ items: enriched, total });
  }

  // Company and Admin view enrichment: include bids summary, invites, and offline bids info
  const { offlineInvites } = await collections();
  const [allBids, allInvites, allOfflineInvites] = await Promise.all([
    bids.find({ tenderId: { $in: tenderIds } }).sort({ createdAt: -1 }).toArray(),
    tenderInvites.find({ tenderId: { $in: tenderIds } }).sort({ createdAt: -1 }).toArray(),
    offlineInvites.find({ tenderId: { $in: tenderIds } }).sort({ createdAt: -1 }).toArray(),
  ]);

  const vendorProfileIds = [...new Set([
    ...allBids.map((b) => b.vendorProfileId?.toString()).filter(Boolean),
    ...allInvites.map((i) => i.vendorProfileId?.toString()).filter(Boolean),
  ])].map((id) => new ObjectId(id));

  const vendorProfiles = vendorProfileIds.length > 0
    ? await profiles.find({ _id: { $in: vendorProfileIds } }).toArray()
    : [];
  const vendorMap = new Map(vendorProfiles.map((v) => [v._id!.toString(), {
    _id: v._id,
    companyName: v.companyName,
    contactPerson: v.contactPerson,
    email: v.userId ? undefined : undefined,
    city: v.city,
    country: v.country,
  }]));

  const bidsByTender = new Map<string, any[]>();
  for (const b of allBids) {
    const key = b.tenderId.toString();
    const list = bidsByTender.get(key) ?? [];
    list.push({
      _id: b._id,
      vendorProfileId: b.vendorProfileId,
      status: b.status,
      totalPrice: resolvedBidTotal(b),
      currency: b.currency,
      isOffline: b.isOffline,
      offlineSupplier: b.offlineSupplier,
      submittedAt: b.submittedAt,
      createdAt: b.createdAt,
      vendor: b.vendorProfileId ? vendorMap.get(b.vendorProfileId.toString()) : null,
    });
    bidsByTender.set(key, list);
  }

  const invitesByTender = new Map<string, any[]>();
  for (const inv of allInvites) {
    const key = inv.tenderId.toString();
    const list = invitesByTender.get(key) ?? [];
    list.push({
      _id: inv._id,
      vendorProfileId: inv.vendorProfileId,
      status: inv.status,
      createdAt: inv.createdAt,
      vendor: vendorMap.get(inv.vendorProfileId.toString()) ?? null,
    });
    invitesByTender.set(key, list);
  }

  const offlineInvitesByTender = new Map<string, any[]>();
  for (const off of allOfflineInvites) {
    const key = off.tenderId.toString();
    const list = offlineInvitesByTender.get(key) ?? [];
    list.push({
      _id: off._id,
      supplierName: off.supplierName,
      email: off.email,
      status: off.status,
      note: off.note,
      createdAt: off.createdAt,
    });
    offlineInvitesByTender.set(key, list);
  }

  const enrichedForCompany = items.map((tender) => {
    const tBids = bidsByTender.get(tender._id!.toString()) ?? [];
    const tInvites = invitesByTender.get(tender._id!.toString()) ?? [];
    const tOffline = offlineInvitesByTender.get(tender._id!.toString()) ?? [];
    return {
      ...tender,
      bids: tBids,
      invites: tInvites,
      offlineInvites: tOffline,
      bidsCount: tBids.length,
      invitesCount: tInvites.length,
    };
  });

  return NextResponse.json({ items: enrichedForCompany, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireVerifiedCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;

  const body = await req.json();
  const data = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(['rfp', 'rfq', 'tender']).default(DEFAULT_PROCUREMENT_TYPE),
    status: z.enum(['draft', 'published']).default('draft'),
    bidDeadline: z.string().optional(),
    deliveryDeadline: z.string().optional(),
    estimatedValue: z.number().optional(),
    currency: z.string().default('USD'),
    incoterm: z.enum(INCOTERM_CODES).optional(),
    incotermPlace: z.string().max(200).optional(),
    location: z.string().optional(),
    requirements: z.string().optional(),
    termsConditions: z.string().optional(),
    groupIds: z.array(z.string()).min(1, 'Select at least one material or service group'),
    clauses: z.array(tenderClauseInput).default([]),
    boqItems: z.array(tenderBoqItemInput).default([]),
    documents: z.array(tenderDocumentInput).max(TENDER_FILE_MAX_COUNT).default([]),
  }).parse(body);

  const boqItems = normalizeBoqItems(data.boqItems);
  if (data.status === 'published') {
    const blockers = [
      ...getPublishBlockers({
        type: data.type,
        documents: data.documents,
        boqItems,
      }),
      ...getPublishDateIssues(data.bidDeadline, data.deliveryDeadline).blockers,
    ];
    if (blockers.length > 0) {
      return NextResponse.json({ error: blockers[0], blockers }, { status: 400 });
    }
  }

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
      status: data.status,
      bidDeadline: data.bidDeadline ? parseDateEndOfDay(data.bidDeadline) : undefined,
      deliveryDeadline: data.deliveryDeadline ? parseDateEndOfDay(data.deliveryDeadline) : undefined,
      estimatedValue: data.estimatedValue,
      currency: data.currency,
      incoterm: data.incoterm,
      incotermPlace: data.incoterm ? data.incotermPlace : undefined,
      location: data.location,
      requirements: data.requirements,
      termsConditions: data.termsConditions,
      groupIds: data.groupIds.map((id) => new ObjectId(id)),
      clauses: normalizeTenderClauses(data.clauses),
      boqItems,
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
