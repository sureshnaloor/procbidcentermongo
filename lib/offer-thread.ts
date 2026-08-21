import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import type { IProfile, ITender } from '@/lib/types';

export async function assertOfferThreadAccess(input: {
  profile: IProfile | null;
  tender: ITender;
  vendorProfileId: ObjectId;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { profile, tender, vendorProfileId } = input;
  if (!profile?._id) {
    return { ok: false, error: 'This conversation is only available to the company and supplier on this package', status: 403 };
  }

  const companyId = tender.companyProfileId.toString();
  const vendorId = vendorProfileId.toString();
  const myId = profile._id.toString();

  const isCompanyParty = profile.userType === 'company' && myId === companyId;
  const isVendorParty = profile.userType === 'vendor' && myId === vendorId;
  if (!isCompanyParty && !isVendorParty) {
    return { ok: false, error: 'This conversation is only visible to the company and this supplier', status: 403 };
  }

  const { bids, tenderInvites } = await collections();
  const hasBid = await bids.findOne({ tenderId: tender._id!, vendorProfileId });
  const hasInvite = await tenderInvites.findOne({ tenderId: tender._id!, vendorProfileId });
  if (!hasBid && !hasInvite) {
    return {
      ok: false,
      error: isVendorParty
        ? 'You can only message the company on packages you are invited to or have offered on'
        : 'You can only message suppliers who are invited or have offered on this package',
      status: 403,
    };
  }

  return { ok: true };
}
