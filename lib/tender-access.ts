import { ObjectId } from 'mongodb';
import { collections } from './db';
import type { TenderInviteStatus } from './types';
import { isVendorBlacklisted } from './offer-link';

export function isOfferAuthorized(status?: TenderInviteStatus | null): boolean {
  return status === 'invited' || status === 'accepted';
}

export function isBidDeadlineOpen(deadline?: Date | null): boolean {
  if (!deadline) return true;
  return deadline.getTime() >= Date.now();
}

export async function getInvite(tenderId: ObjectId, vendorProfileId: ObjectId) {
  const { tenderInvites } = await collections();
  return tenderInvites.findOne({ tenderId, vendorProfileId });
}

export async function assertVendorCanOffer(tenderId: ObjectId, vendorProfileId: ObjectId) {
  const { tenders } = await collections();
  const tender = await tenders.findOne({ _id: tenderId });
  if (!tender) return { ok: false as const, error: 'Tender not found' };
  if (await isVendorBlacklisted(tender.companyProfileId, vendorProfileId)) {
    return { ok: false as const, error: 'You cannot prepare an offer for this package' };
  }
  const invite = await getInvite(tenderId, vendorProfileId);
  if (!isOfferAuthorized(invite?.status)) {
    return { ok: false as const, error: 'You can prepare an offer only after the company invites you or accepts your request' };
  }
  return { ok: true as const, invite, tender };
}
