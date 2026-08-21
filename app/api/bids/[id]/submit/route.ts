import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { assertVendorCanOffer } from '@/lib/tender-access';
import { matchesClause } from '@/lib/clauses';
import { hasRegisteredDsc, dscIsValidOn } from '@/lib/dsc';
import { hashBidDocument } from '@/lib/bid-hash';
import { saveBidSignatureFile } from '@/lib/bid-files';
import type { IBidSignature } from '@/lib/types';

const submitBody = z.object({
  signWithDsc: z.boolean().optional(),
  signedPdfName: z.string().max(200).optional(),
  signedPdfBase64: z.string().optional(),
}).optional();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { bids, bidHistory, tenders } = await collections();
  const bid = await bids.findOne({ _id: new ObjectId(id) });
  if (!bid) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const profile = await getProfileForUser(auth.user.id);
  if (!profile || profile.userType !== 'vendor' || bid.vendorProfileId.toString() !== profile._id!.toString()) {
    return NextResponse.json({ error: 'You can only submit your own offers' }, { status: 403 });
  }
  if (bid.status !== 'draft') return NextResponse.json({ error: 'Only draft offers can be submitted' }, { status: 400 });

  const allowed = await assertVendorCanOffer(bid.tenderId, profile._id!);
  if (!allowed.ok) return NextResponse.json({ error: allowed.error }, { status: 403 });

  const tender = await tenders.findOne({ _id: bid.tenderId });
  const requiredClauses = (tender?.clauses ?? []).filter((c) => c.required);
  for (const clause of requiredClauses) {
    const response = (bid.clauseResponses ?? []).find((r) => matchesClause(clause, r));
    if (!response?.accepted) {
      return NextResponse.json({ error: `You must accept or accept with conditions the ${clause.title} terms to submit an offer` }, { status: 400 });
    }
  }

  let payload: z.infer<typeof submitBody> = {};
  try {
    const json = await req.json();
    payload = submitBody.parse(json) ?? {};
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Invalid submit payload' }, { status: 400 });
    }
  }

  const now = new Date();
  const setFields: Record<string, unknown> = { status: 'submitted', submittedAt: now, updatedAt: now };

  if (hasRegisteredDsc(profile.dsc)) {
    if (!payload?.signWithDsc) {
      return NextResponse.json({ error: 'This offer must be digitally signed with your registered DSC' }, { status: 400 });
    }
    if (!dscIsValidOn(profile.dsc, now)) {
      return NextResponse.json({ error: 'Your registered DSC is outside its validity period. Update it in Settings before submitting.' }, { status: 400 });
    }
    const signature: IBidSignature = {
      method: 'dsc',
      signedAt: now,
      holderName: profile.dsc!.holderName!.trim(),
      serialNumber: profile.dsc!.serialNumber!.trim(),
      issuer: profile.dsc?.issuer?.trim() || undefined,
      documentHash: hashBidDocument(bid),
    };
    if (payload.signedPdfBase64 && payload.signedPdfName) {
      try {
        const saved = await saveBidSignatureFile(payload.signedPdfName, payload.signedPdfBase64);
        signature.signedPdfName = payload.signedPdfName;
        signature.signedPdfUrl = saved.fileUrl;
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not store signed file' }, { status: 400 });
      }
    }
    setFields.signature = signature;
  }

  await bids.updateOne({ _id: new ObjectId(id) }, { $set: setFields });
  await bidHistory.insertOne({ bidId: bid._id!, fieldName: 'status', oldValue: bid.status, newValue: 'submitted', changedBy: auth.user.displayName, createdAt: now });
  if (setFields.signature) {
    await bidHistory.insertOne({
      bidId: bid._id!,
      fieldName: 'signature',
      oldValue: '',
      newValue: `dsc:${profile.dsc?.serialNumber}`,
      changedBy: auth.user.displayName,
      createdAt: now,
    });
  }
  return NextResponse.json(await bids.findOne({ _id: new ObjectId(id) }));
}
