import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireVendorProfile } from '@/lib/auth-helpers';
import { saveBidOfferDocumentFile } from '@/lib/bid-files';
import type { IBidSignedOffer } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const vendor = await requireVendorProfile(auth);
  if (isNextResponse(vendor)) return vendor;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = z.object({
    fileName: z.string().min(1).max(255),
    fileBase64: z.string().min(1),
  }).parse(await req.json());

  const { bids } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (bid.vendorProfileId.toString() !== vendor._id!.toString()) {
    return NextResponse.json({ error: 'You can only upload a signed offer on your own bid' }, { status: 403 });
  }
  if (bid.status === 'draft') {
    return NextResponse.json({ error: 'Submit the offer before uploading a signed copy' }, { status: 400 });
  }

  const stored = await saveBidOfferDocumentFile(body.fileName, body.fileBase64);
  const doc: IBidSignedOffer = {
    name: body.fileName,
    fileUrl: stored.fileUrl,
    storedName: stored.storedName,
    fileType: stored.ext,
    fileSize: stored.fileSize,
    uploadedAt: new Date(),
    uploadedBy: auth.user.displayName,
  };
  await bids.updateOne(
    { _id: bid._id! },
    { $push: { signedOffers: doc }, $set: { updatedAt: new Date() } }
  );
  return NextResponse.json(await bids.findOne({ _id: bid._id! }));
}
