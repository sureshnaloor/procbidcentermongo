import type {
  IBid,
  IBidRevisionDraft,
  IBidRevisionRequest,
  IBidVersionSnapshot,
  BidRevisionSource,
  BidStatus,
} from '@/lib/types';
import { lineItemsTotal, resolvedBidTotal } from '@/lib/bid-line';

export const VENDOR_REVISABLE_STATUSES: BidStatus[] = ['shortlisted'];
export const VERBAL_REVISABLE_STATUSES: BidStatus[] = ['submitted', 'under_review', 'shortlisted', 'accepted', 'rejected'];

export function commercialFields(bid: Pick<
  IBid,
  | 'totalPrice'
  | 'currency'
  | 'validityDays'
  | 'technicalProposal'
  | 'commercialProposal'
  | 'notes'
  | 'lineItems'
  | 'clauseResponses'
  | 'status'
  | 'submittedAt'
>) {
  return {
    totalPrice: bid.totalPrice,
    currency: bid.currency,
    validityDays: bid.validityDays,
    technicalProposal: bid.technicalProposal,
    commercialProposal: bid.commercialProposal,
    notes: bid.notes,
    lineItems: bid.lineItems ?? [],
    clauseResponses: bid.clauseResponses ?? [],
    status: bid.status,
    submittedAt: bid.submittedAt,
  };
}

export function ensureOriginalVersion(bid: IBid, capturedBy: string): IBidVersionSnapshot[] {
  const versions = [...(bid.versions ?? [])];
  if (versions.some((v) => v.kind === 'original')) return versions;
  versions.push({
    version: 1,
    kind: 'original',
    source: 'original_submit',
    capturedAt: new Date(),
    capturedBy,
    ...commercialFields(bid),
  });
  return versions;
}

export function revisedSnapshot(bid: IBid, capturedBy: string, source: BidRevisionSource): IBidVersionSnapshot {
  const versions = bid.versions ?? [];
  const next = (versions.reduce((max, v) => Math.max(max, v.version), 1)) + 1;
  return {
    version: next,
    kind: 'revised',
    source,
    capturedAt: new Date(),
    capturedBy,
    ...commercialFields(bid),
  };
}

export function originalVersion(bid: { versions?: IBidVersionSnapshot[] | null }) {
  return (bid.versions ?? []).find((v) => v.kind === 'original') ?? null;
}

export function applyRevisionDraft(bid: IBid, draft?: IBidRevisionDraft | null): IBid {
  if (!draft) {
    const fromLines = lineItemsTotal(bid.lineItems);
    return (bid.lineItems?.length ?? 0) > 0 ? { ...bid, totalPrice: fromLines } : bid;
  }
  const lineItems = draft.lineItems ?? bid.lineItems;
  const fromLines = lineItemsTotal(lineItems);
  return {
    ...bid,
    totalPrice: (lineItems?.length ?? 0) > 0 ? fromLines : (draft.totalPrice ?? bid.totalPrice),
    currency: draft.currency ?? bid.currency,
    validityDays: draft.validityDays ?? bid.validityDays,
    technicalProposal: draft.technicalProposal ?? bid.technicalProposal,
    commercialProposal: draft.commercialProposal ?? bid.commercialProposal,
    notes: draft.notes ?? bid.notes,
    lineItems,
    clauseResponses: draft.clauseResponses ?? bid.clauseResponses,
  };
}

export function shouldOverlayDraft(
  bid: IBid,
  opts: { isVendorOwner: boolean; isCompanyOwner: boolean }
) {
  const request = bid.revisionRequest;
  if (!request?.open || !bid.revisionDraft) return false;
  if (opts.isVendorOwner && request.source === 'vendor_invite') return true;
  if (opts.isCompanyOwner && request.source === 'company_verbal') return true;
  return false;
}

export function buildRevisionRequest(
  source: IBidRevisionRequest['source'],
  requestedBy: string,
  note?: string
): IBidRevisionRequest {
  return {
    open: true,
    source,
    note: note?.trim() || undefined,
    requestedAt: new Date(),
    requestedBy,
  };
}

export function syncLatestRevisionSnapshot(bid: IBid): IBidVersionSnapshot[] {
  const versions = (bid.versions ?? []).map((v) => ({
    ...v,
    totalPrice: resolvedBidTotal(v) ?? v.totalPrice,
  }));
  if (bid.revisionRequest?.open) return versions;
  const liveTotal = resolvedBidTotal(bid);
  if (liveTotal == null) return versions;
  const lastIdx = versions.reduce((found, v, i) => (v.kind === 'revised' ? i : found), -1);
  if (lastIdx < 0) return versions;
  const latest = versions[lastIdx];
  if (Number(latest.totalPrice) === liveTotal) return versions;
  versions[lastIdx] = {
    ...latest,
    totalPrice: liveTotal,
    currency: bid.currency ?? latest.currency,
    validityDays: bid.validityDays ?? latest.validityDays,
    technicalProposal: bid.technicalProposal ?? latest.technicalProposal,
    commercialProposal: bid.commercialProposal ?? latest.commercialProposal,
    notes: bid.notes ?? latest.notes,
    lineItems: bid.lineItems ?? latest.lineItems,
    clauseResponses: bid.clauseResponses ?? latest.clauseResponses,
  };
  return versions;
}

export function presentRevisionHistory<T extends { fieldName?: string; oldValue?: string; newValue?: string }>(
  history: T[] | undefined,
  versions: IBidVersionSnapshot[]
): T[] {
  const rows = history ?? [];
  const original = versions.find((v) => v.kind === 'original');
  const revised = versions.filter((v) => v.kind === 'revised');
  const submitIndexes = rows
    .map((row, i) => (row.fieldName === 'revision_submitted' ? i : -1))
    .filter((i) => i >= 0)
    .reverse();
  const next = rows.map((row) => ({ ...row }));
  submitIndexes.forEach((historyIndex, n) => {
    const version = revised[n];
    if (!version) return;
    const previous = n === 0 ? original : revised[n - 1];
    next[historyIndex] = {
      ...next[historyIndex],
      oldValue: String(previous?.totalPrice ?? next[historyIndex].oldValue ?? ''),
      newValue: String(version.totalPrice ?? next[historyIndex].newValue ?? ''),
    };
  });
  return next;
}
