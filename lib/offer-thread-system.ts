import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';

export async function postOfferThreadSystemMessage(input: {
  tenderId: ObjectId;
  companyProfileId: ObjectId;
  vendorProfileId: ObjectId;
  actorProfileId: ObjectId;
  bidId?: ObjectId;
  content: string;
  event: string;
}) {
  const receiverId = input.actorProfileId.toString() === input.companyProfileId.toString()
    ? input.vendorProfileId
    : input.companyProfileId;
  const { messages } = await collections();
  await messages.insertOne({
    senderProfileId: input.actorProfileId,
    receiverProfileId: receiverId,
    kind: 'offer_thread',
    visibility: 'private',
    tenderId: input.tenderId,
    bidId: input.bidId,
    content: input.content.trim(),
    isSystem: true,
    systemEvent: input.event,
    isRead: true,
    createdAt: new Date(),
  });
}

export function systemMessageText(event: string, note?: string) {
  const extra = note?.trim() ? ` Note: ${note.trim()}` : '';
  switch (event) {
    case 'ask_to_revise':
      return `Asked supplier to revise this offer.${extra}`;
    case 'request_to_revise':
      return `Supplier requested a revision to this offer.${extra}`;
    case 'revision_approved':
      return `Company approved the revision request. The supplier may now revise and resubmit.${extra}`;
    case 'revision_declined':
      return `Company declined the revision request.${extra}`;
    case 'revision_submitted':
      return `Revised offer submitted.${extra}`;
    case 'verbal_revision_opened':
      return `Company opened a revision based on a telephonic/verbal agreement.${extra}`;
    default:
      return extra.trim() || event;
  }
}
