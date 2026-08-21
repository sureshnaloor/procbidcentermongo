import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser, requireCompanyProfile, requireVendorProfile } from '@/lib/auth-helpers';
import { notify } from '@/lib/notify';
import { isOfferAuthorized } from '@/lib/tender-access';
import type { ITenderInvite, TenderInviteStatus } from '@/lib/types';

async function loadTender(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const { tenders } = await collections();
  return tenders.findOne({ _id: new ObjectId(id) });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  const tender = await loadTender(id);
  if (!tender) return NextResponse.json([]);

  const profile = await getProfileForUser(auth.user.id);
  const { tenderInvites, profiles } = await collections();
  const isAdmin = auth.user.role === 'admin';
  const isOwner = profile?.userType === 'company' && profile._id!.toString() === tender.companyProfileId.toString();

  if (isAdmin || isOwner) {
    const invites = await tenderInvites.find({ tenderId: tender._id! }).sort({ createdAt: -1 }).toArray();
    const vendorIds = invites.map((i) => i.vendorProfileId);
    const vendors = vendorIds.length ? await profiles.find({ _id: { $in: vendorIds } }).toArray() : [];
    const byId = new Map(vendors.map((v) => [v._id!.toString(), v]));
    return NextResponse.json(invites.map((i) => ({
      ...i,
      vendor: byId.get(i.vendorProfileId.toString()) ?? null,
      canOffer: isOfferAuthorized(i.status),
    })));
  }

  if (profile?.userType === 'vendor') {
    const mine = await tenderInvites.find({ tenderId: tender._id!, vendorProfileId: profile._id! }).toArray();
    return NextResponse.json(mine.map((i) => ({ ...i, canOffer: isOfferAuthorized(i.status) })));
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  const tender = await loadTender(id);
  if (!tender) return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  if (tender.status !== 'published') {
    return NextResponse.json({ error: 'Invites are only available on published tenders' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const data = z.object({
    action: z.enum(['invite', 'request']).default('request'),
    vendorProfileId: z.string().optional(),
    note: z.string().max(500).optional(),
  }).parse(body);

  const { tenderInvites, profiles } = await collections();
  const now = new Date();

  if (data.action === 'invite') {
    const company = await requireCompanyProfile(auth);
    if (isNextResponse(company)) return company;
    if (company._id!.toString() !== tender.companyProfileId.toString()) {
      return NextResponse.json({ error: 'Only the company that created this tender can invite suppliers' }, { status: 403 });
    }
    if (!data.vendorProfileId || !ObjectId.isValid(data.vendorProfileId)) {
      return NextResponse.json({ error: 'Supplier is required' }, { status: 400 });
    }
    const vendor = await profiles.findOne({ _id: new ObjectId(data.vendorProfileId), userType: 'vendor' });
    if (!vendor) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });

    const existing = await tenderInvites.findOne({ tenderId: tender._id!, vendorProfileId: vendor._id! });
    let invite: ITenderInvite | null;
    if (existing) {
      const nextStatus: TenderInviteStatus = existing.status === 'requested' ? 'accepted' : 'invited';
      await tenderInvites.updateOne(
        { _id: existing._id },
        { $set: { status: nextStatus, note: data.note, updatedAt: now } }
      );
      invite = await tenderInvites.findOne({ _id: existing._id });
    } else {
      const result = await tenderInvites.insertOne({
        tenderId: tender._id!,
        companyProfileId: company._id!,
        vendorProfileId: vendor._id!,
        status: 'invited',
        note: data.note,
        createdAt: now,
        updatedAt: now,
      });
      invite = await tenderInvites.findOne({ _id: result.insertedId });
    }

    await notify({
      profileId: vendor._id!,
      type: 'tender_invite',
      title: `Invited to tender: ${tender.title}`,
      content: 'You can now prepare an offer for this tender.',
      relatedId: tender._id,
      relatedType: 'tender',
    });
    return NextResponse.json(invite, { status: existing ? 200 : 201 });
  }

  const vendor = await requireVendorProfile(auth);
  if (isNextResponse(vendor)) return vendor;

  const existing = await tenderInvites.findOne({ tenderId: tender._id!, vendorProfileId: vendor._id! });
  if (existing) {
    if (isOfferAuthorized(existing.status)) return NextResponse.json(existing);
    if (existing.status === 'requested') return NextResponse.json(existing);
    await tenderInvites.updateOne(
      { _id: existing._id },
      { $set: { status: 'requested', note: data.note, updatedAt: now } }
    );
    const updated = await tenderInvites.findOne({ _id: existing._id });
    await notify({
      profileId: tender.companyProfileId,
      type: 'invite_requested',
      title: `${vendor.companyName || 'A supplier'} requested to offer on ${tender.title}`,
      relatedId: tender._id,
      relatedType: 'tender',
    });
    return NextResponse.json(updated);
  }

  const result = await tenderInvites.insertOne({
    tenderId: tender._id!,
    companyProfileId: tender.companyProfileId,
    vendorProfileId: vendor._id!,
    status: 'requested',
    note: data.note,
    createdAt: now,
    updatedAt: now,
  });
  await notify({
    profileId: tender.companyProfileId,
    type: 'invite_requested',
    title: `${vendor.companyName || 'A supplier'} requested to offer on ${tender.title}`,
    relatedId: tender._id,
    relatedType: 'tender',
  });
  return NextResponse.json(await tenderInvites.findOne({ _id: result.insertedId }), { status: 201 });
}
