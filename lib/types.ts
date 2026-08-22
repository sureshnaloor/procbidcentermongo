import type { ObjectId } from 'mongodb';

// ─── Auth ───────────────────────────────────────────────────────────────────
export interface IUser {
  _id?: ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt?: Date;
}

// ─── Profile ─────────────────────────────────────────────────────────────────
export interface IProfile {
  _id?: ObjectId;
  userId: ObjectId;
  userType: 'company' | 'vendor';
  companyName?: string;
  registrationNumber?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  country?: string;
  city?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  yearEstablished?: number;
  employeeCount?: number;
  annualTurnover?: number;
  turnoverCurrency?: string;
  turnoverYear?: number;
  taxId?: string;
  industry?: string;
  designation?: string;
  dsc?: IDigitalSignatureCertificate;
  capabilityGroupIds?: ObjectId[];
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDigitalSignatureCertificate {
  enabled: boolean;
  holderName?: string;
  serialNumber?: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
}

export interface IBidSignature {
  method: 'dsc';
  signedAt: Date;
  holderName: string;
  serialNumber: string;
  issuer?: string;
  documentHash: string;
  signedPdfName?: string;
  signedPdfUrl?: string;
}

// ─── Master Data ─────────────────────────────────────────────────────────────
export interface IMaterialServiceType {
  _id?: ObjectId;
  category: 'material' | 'service';
  name: string;
  description?: string;
  createdAt: Date;
}

export interface IMaterialServiceGroup {
  _id?: ObjectId;
  typeId: ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface IMaterialServiceItem {
  _id?: ObjectId;
  groupId: ObjectId;
  code: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Tender ──────────────────────────────────────────────────────────────────
export type TenderStatus = 'draft' | 'published' | 'closed' | 'awarded' | 'cancelled';
export type TenderType = 'rfp' | 'rfq' | 'tender';
export type TenderDocumentCategory = 'boq' | 'scope' | 'drawing' | 'terms' | 'other';
export type ClauseKind = 'safety' | 'quality' | 'payment' | 'delivery' | 'compliance' | 'scope' | 'legal' | 'custom';

export interface ITenderBoqItem {
  lineCode?: string;
  description: string;
  quantity: number;
  unit: string;
  groupId?: ObjectId;
  itemId?: ObjectId;
}

export interface ITenderClause {
  kind: ClauseKind;
  slug?: string;
  title: string;
  body: string;
  required: boolean;
}

export interface IClauseTemplate {
  _id?: ObjectId;
  kind: ClauseKind;
  slug?: string;
  title: string;
  body: string;
  isSystem: boolean;
  companyProfileId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenderDocument {
  _id?: ObjectId;
  category: TenderDocumentCategory;
  name: string;
  fileUrl: string;
  storedName: string;
  fileType?: string;
  fileSize?: number;
  createdAt: Date;
}

export interface ITender {
  _id?: ObjectId;
  companyProfileId: ObjectId;
  title: string;
  description?: string;
  type: TenderType;
  status: TenderStatus;
  bidDeadline?: Date;
  deliveryDeadline?: Date;
  estimatedValue?: number;
  currency: string;
  incoterm?: string;
  incotermPlace?: string;
  location?: string;
  requirements?: string;
  termsConditions?: string;
  groupIds: ObjectId[];
  clauses?: ITenderClause[];
  boqItems?: ITenderBoqItem[];
  documents: ITenderDocument[];
  comparisonRemarks?: IComparisonRemark[];
  createdAt: Date;
  updatedAt: Date;
}

export const MAX_COMPARISON_REMARKS = 5;

export interface IComparisonRemark {
  level: number;
  userId: ObjectId;
  userName: string;
  designation: string;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Bid ─────────────────────────────────────────────────────────────────────
export type BidStatus = 'draft' | 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';

export type DeliveryMode = 'days' | 'weeks' | 'working_weeks' | 'date';

export interface IBidCustomField {
  label: string;
  value: string;
}

export interface IBidLineItem {
  _id?: ObjectId;
  lineCode?: string;
  description: string;
  quantity: number;
  originalQuantity?: number;
  quantityChangeReason?: string;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  deliveryDays?: number;
  deliveryMode?: DeliveryMode;
  deliveryValue?: number;
  deliveryDate?: Date;
  notes?: string;
  customFields?: IBidCustomField[];
}

export interface IOfflineSupplier {
  name: string;
  email?: string;
  contactPerson?: string;
  phone?: string;
  city?: string;
  country?: string;
}

export type OfflineInviteStatus = 'pending' | 'approved';

export interface IOfflineInvite {
  _id?: ObjectId;
  tenderId: ObjectId;
  companyProfileId: ObjectId;
  supplierName: string;
  email: string;
  status: OfflineInviteStatus;
  note?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
}

export type DiscountType = 'percent' | 'amount';

export interface IBidCharge {
  label: string;
  type?: 'value' | 'percent';
  amount: number;
}

export interface IBid {
  _id?: ObjectId;
  tenderId: ObjectId;
  vendorProfileId: ObjectId;
  status: BidStatus;
  isOffline?: boolean;
  offlineSupplier?: IOfflineSupplier;
  offlineWorkbook?: IBidSignedOffer;
  discountType?: DiscountType;
  discountValue?: number;
  vatPercent?: number;
  otherCharges?: IBidCharge[];
  totalPrice?: number;
  currency: string;
  validityDays: number;
  technicalProposal?: string;
  commercialProposal?: string;
  notes?: string;
  submittedAt?: Date;
  withdrawnAt?: Date;
  signature?: IBidSignature;
  lineItems: IBidLineItem[];
  clauseResponses?: IBidClauseResponse[];
  versions?: IBidVersionSnapshot[];
  revisionRequest?: IBidRevisionRequest;
  revisionDraft?: IBidRevisionDraft;
  revisedAt?: Date;
  signedOffers?: IBidSignedOffer[];
  createdAt: Date;
  updatedAt: Date;
}

export type BidRevisionSource = 'vendor_invite' | 'company_verbal' | 'original_submit';

export interface IBidRevisionRequest {
  open: boolean;
  pendingApproval?: boolean;
  source: 'vendor_invite' | 'company_verbal';
  initiatedBy?: 'company' | 'vendor';
  note?: string;
  requestedAt: Date;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface IBidSignedOffer {
  name: string;
  fileUrl: string;
  storedName: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface IBidRevisionDraft {
  totalPrice?: number;
  currency?: string;
  validityDays?: number;
  technicalProposal?: string;
  commercialProposal?: string;
  notes?: string;
  discountType?: DiscountType;
  discountValue?: number;
  vatPercent?: number;
  otherCharges?: IBidCharge[];
  lineItems?: IBidLineItem[];
  clauseResponses?: IBidClauseResponse[];
  savedAt: Date;
}

export interface IBidVersionSnapshot {
  version: number;
  kind: 'original' | 'revised';
  source: BidRevisionSource;
  capturedAt: Date;
  capturedBy: string;
  note?: string;
  status: BidStatus;
  totalPrice?: number;
  currency: string;
  validityDays: number;
  technicalProposal?: string;
  commercialProposal?: string;
  notes?: string;
  discountType?: DiscountType;
  discountValue?: number;
  vatPercent?: number;
  otherCharges?: IBidCharge[];
  lineItems: IBidLineItem[];
  clauseResponses?: IBidClauseResponse[];
  submittedAt?: Date;
}

export interface IBidClauseResponse {
  kind: ClauseKind;
  slug?: string;
  accepted: boolean;
  comments?: string;
  originalBody?: string;
  proposedBody?: string;
}

export interface IBidHistory {
  _id?: ObjectId;
  bidId: ObjectId;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  createdAt: Date;
}

// ─── Vendor Qualifications ───────────────────────────────────────────────────
export type QualificationStatus = 'pending' | 'approved' | 'rejected';

export type TenderInviteStatus = 'invited' | 'requested' | 'accepted' | 'declined' | 'revoked';

export interface ITenderInvite {
  _id?: ObjectId;
  tenderId: ObjectId;
  companyProfileId: ObjectId;
  vendorProfileId: ObjectId;
  status: TenderInviteStatus;
  note?: string;
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVendorBlacklist {
  _id?: ObjectId;
  companyProfileId: ObjectId;
  vendorProfileId: ObjectId;
  reason?: string;
  relatedTenderId?: ObjectId;
  relatedBidId?: ObjectId;
  createdAt: Date;
}

export interface IVendorQualification {
  _id?: ObjectId;
  profileId: ObjectId;
  groupId: ObjectId;
  status: QualificationStatus;
  qualifiedBy?: ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Documents ───────────────────────────────────────────────────────────────
export type DocumentVisibility = 'public' | 'private' | 'selected';

export interface IDocument {
  _id?: ObjectId;
  profileId: ObjectId;
  name: string;
  fileUrl: string;
  storedName?: string;
  fileType?: string;
  fileSize?: number;
  visibility: DocumentVisibility;
  category?: string;
  description?: string;
  grantedToProfileIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Messages ────────────────────────────────────────────────────────────────
export type MessageKind = 'dm' | 'channel' | 'offer_thread';
export type ChannelKind = 'information' | 'announcement' | 'alert' | 'general';

export interface IMessage {
  _id?: ObjectId;
  senderProfileId?: ObjectId;
  receiverProfileId?: ObjectId;
  channelId?: ObjectId;
  kind: MessageKind;
  visibility: 'private' | 'public';
  tenderId?: ObjectId;
  bidId?: ObjectId;
  subject?: string;
  content: string;
  isSystem?: boolean;
  systemEvent?: string;
  isRead: boolean;
  editedAt?: Date;
  createdAt: Date;
}

export interface IMessageChannel {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  kind: ChannelKind;
  isSystem?: boolean;
  createdByUserId?: ObjectId;
  createdAt: Date;
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationType =
  | 'tender_published'
  | 'bid_received'
  | 'bid_status_changed'
  | 'bid_deadline'
  | 'vendor_qualified'
  | 'message_received'
  | 'tender_invite'
  | 'invite_requested'
  | 'invite_accepted'
  | 'invite_declined'
  | 'revision_requested'
  | 'revision_request_received'
  | 'revision_request_declined';

export interface INotification {
  _id?: ObjectId;
  profileId: ObjectId;
  type: NotificationType;
  title: string;
  content?: string;
  relatedId?: ObjectId;
  relatedType?: string;
  isRead: boolean;
  createdAt: Date;
}

// ─── Contact ─────────────────────────────────────────────────────────────────
export interface IContactSubmission {
  _id?: ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
}

// ─── Session ─────────────────────────────────────────────────────────────────
export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: 'user' | 'admin';
  isSuperAdmin: boolean;
  userType?: 'company' | 'vendor' | null;
}
