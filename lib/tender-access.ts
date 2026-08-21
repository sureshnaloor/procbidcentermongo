import { ObjectId } from 'mongodb';
import { collections } from './db';
import type { TenderInviteStatus } from './types';

export function isOfferAuthorized(status?: TenderInviteStatus | null): boolean {
  return status === 'invited' || status === 'accepted';
}

export async function getInvite(tenderId: ObjectId, vendorProfileId: ObjectId) {
  const { tenderInvites } = await collections();
  return tenderInvites.findOne({ tenderId, vendorProfileId });
}

export async function assertVendorCanOffer(tenderId: ObjectId, vendorProfileId: ObjectId) {
  const invite = await getInvite(tenderId, vendorProfileId);
  if (!isOfferAuthorized(invite?.status)) {
    return { ok: false as const, error: 'You can prepare an offer only after the company invites you or accepts your request' };
  }
  return { ok: true as const, invite };
}
