import { getDb } from './mongodb';
import type {
  IUser, IProfile, IMaterialServiceType, IMaterialServiceGroup, IMaterialServiceItem,
  ITender, IBid, IBidHistory, IVendorQualification, IDocument, IMessage,
  IMessageChannel, INotification, IContactSubmission, IClauseTemplate, ITenderInvite, IVendorBlacklist
} from './types';

export async function collections() {
  const db = await getDb();
  return {
    users: db.collection<IUser>('users'),
    profiles: db.collection<IProfile>('profiles'),
    materialServiceTypes: db.collection<IMaterialServiceType>('materialServiceTypes'),
    materialServiceGroups: db.collection<IMaterialServiceGroup>('materialServiceGroups'),
    materialServiceItems: db.collection<IMaterialServiceItem>('materialServiceItems'),
    tenders: db.collection<ITender>('tenders'),
    bids: db.collection<IBid>('bids'),
    bidHistory: db.collection<IBidHistory>('bidHistory'),
    vendorQualifications: db.collection<IVendorQualification>('vendorQualifications'),
    tenderInvites: db.collection<ITenderInvite>('tenderInvites'),
    vendorBlacklist: db.collection<IVendorBlacklist>('vendorBlacklist'),
    clauseTemplates: db.collection<IClauseTemplate>('clauseTemplates'),
    documents: db.collection<IDocument>('documents'),
    messages: db.collection<IMessage>('messages'),
    messageChannels: db.collection<IMessageChannel>('messageChannels'),
    notifications: db.collection<INotification>('notifications'),
    contactSubmissions: db.collection<IContactSubmission>('contactSubmissions'),
  };
}

export async function ensureIndexes() {
  const cols = await collections();
  // Users
  await cols.users.createIndex({ username: 1 }, { unique: true });
  await cols.users.createIndex({ email: 1 }, { unique: true });
  // Profiles
  await cols.profiles.createIndex({ userId: 1 }, { unique: true });
  await cols.profiles.createIndex({ userType: 1 });
  // Master data
  await cols.materialServiceTypes.createIndex({ category: 1 });
  await cols.materialServiceTypes.createIndex({ name: 1, category: 1 }, { unique: true });
  await cols.materialServiceGroups.createIndex({ typeId: 1 });
  await cols.materialServiceGroups.createIndex({ typeId: 1, name: 1 }, { unique: true });
  await cols.materialServiceItems.createIndex({ groupId: 1 });
  await cols.materialServiceItems.createIndex({ groupId: 1, code: 1 }, { unique: true });
  // Tenders
  await cols.tenders.createIndex({ companyProfileId: 1 });
  await cols.tenders.createIndex({ status: 1 });
  await cols.tenders.createIndex({ type: 1 });
  await cols.tenders.createIndex({ title: 'text', description: 'text' });
  // Bids
  await cols.bids.createIndex({ tenderId: 1 });
  await cols.bids.createIndex({ vendorProfileId: 1 });
  await cols.bids.createIndex({ status: 1 });
  // Qualifications
  await cols.vendorQualifications.createIndex({ profileId: 1, groupId: 1 }, { unique: true });
  await cols.tenderInvites.createIndex({ tenderId: 1, vendorProfileId: 1 }, { unique: true });
  await cols.tenderInvites.createIndex({ vendorProfileId: 1, status: 1 });
  await cols.tenderInvites.createIndex({ accessToken: 1 }, { unique: true, sparse: true });
  await cols.vendorBlacklist.createIndex({ companyProfileId: 1, vendorProfileId: 1 }, { unique: true });
  await cols.vendorBlacklist.createIndex({ vendorProfileId: 1 });
  await cols.clauseTemplates.createIndex({ kind: 1, isSystem: 1 }, { unique: true, partialFilterExpression: { isSystem: true } });
  try {
    await cols.clauseTemplates.dropIndex('companyProfileId_1_kind_1');
  } catch {
    // Index may not exist yet
  }
  await cols.clauseTemplates.createIndex(
    { companyProfileId: 1, kind: 1 },
    {
      unique: true,
      name: 'company_seeded_kind_unique',
      partialFilterExpression: {
        kind: { $in: ['safety', 'quality', 'payment', 'delivery', 'compliance', 'scope', 'legal'] },
      },
    }
  );
  await cols.clauseTemplates.createIndex(
    { companyProfileId: 1, slug: 1 },
    {
      unique: true,
      name: 'company_custom_slug_unique',
      partialFilterExpression: { kind: 'custom' },
    }
  );
  // Documents
  await cols.documents.createIndex({ profileId: 1 });
  // Messages
  await cols.messages.createIndex({ senderProfileId: 1 });
  await cols.messages.createIndex({ receiverProfileId: 1 });
  await cols.messages.createIndex({ channelId: 1 });
  await cols.messages.createIndex({ kind: 1 });
  await cols.messages.createIndex({ createdAt: -1 });
  await cols.messages.createIndex({ tenderId: 1, kind: 1 });
  // Message channels
  await cols.messageChannels.createIndex({ slug: 1 }, { unique: true });
  // Notifications
  await cols.notifications.createIndex({ profileId: 1 });
  await cols.notifications.createIndex({ isRead: 1 });
}
