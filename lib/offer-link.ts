import { nanoid } from 'nanoid';
import { ObjectId } from 'mongodb';
import { collections } from './db';
import type { ITenderInvite } from './types';

export function createOfferAccessToken(): string {
  return nanoid(24);
}

export function offerPath(token: string): string {
  return `/offer/${token}`;
}

export async function ensureInviteAccessToken(invite: ITenderInvite): Promise<string> {
  if (invite.accessToken) return invite.accessToken;
  const token = createOfferAccessToken();
  const { tenderInvites } = await collections();
  await tenderInvites.updateOne(
    { _id: invite._id },
    { $set: { accessToken: token, updatedAt: new Date() } }
  );
  invite.accessToken = token;
  return token;
}

export async function findInviteByAccessToken(token: string) {
  if (!token || token.length < 8) return null;
  const { tenderInvites } = await collections();
  return tenderInvites.findOne({ accessToken: token });
}

export async function isVendorBlacklisted(companyProfileId: ObjectId, vendorProfileId: ObjectId) {
  const { vendorBlacklist } = await collections();
  const row = await vendorBlacklist.findOne({ companyProfileId, vendorProfileId });
  return Boolean(row);
}
