import { formatDelivery, resolvedBidTotal } from '@/lib/bid-line';
import { clauseKey } from '@/lib/clauses';
import { acceptedWithConditions } from '@/lib/text-diff';
import { MAX_COMPARISON_REMARKS } from '@/lib/types';

export { MAX_COMPARISON_REMARKS };

export const QUOTED_BID_STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'accepted',
  'rejected',
  'withdrawn',
] as const;

export type PaperSize = 'a4' | 'a3';

export function normalizeLineKey(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function recommendedPaper(quotedCount: number): PaperSize {
  return quotedCount >= 4 && quotedCount <= 5 ? 'a3' : 'a4';
}

export function vendorsPerPage(paper: PaperSize, quotedCount: number): number {
  if (quotedCount <= 1) return 1;
  if (paper === 'a3') return Math.min(5, quotedCount);
  if (quotedCount <= 3) return quotedCount;
  if (quotedCount === 4) return 2;
  return 3;
}

export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  const n = Math.max(1, size);
  for (let i = 0; i < items.length; i += n) chunks.push(items.slice(i, i + n));
  return chunks.length ? chunks : [[]];
}

export function findMatchingLine(lineItems: any[] | undefined, description: string, lineCode?: string) {
  const code = lineCode?.trim().toUpperCase();
  if (code) {
    const byCode = (lineItems ?? []).find((item) => String(item.lineCode || '').trim().toUpperCase() === code);
    if (byCode) return byCode;
  }
  const key = normalizeLineKey(description);
  return (lineItems ?? []).find((item) => normalizeLineKey(item.description || '') === key) ?? null;
}

export function extraBidLines(lineItems: any[] | undefined, boqDescriptions: string[]) {
  const boqKeys = new Set(boqDescriptions.map(normalizeLineKey));
  return (lineItems ?? []).filter((item) => !boqKeys.has(normalizeLineKey(item.description || '')));
}

export function findClauseResponse(bid: any, clause: { kind: string; slug?: string; title?: string }) {
  return (bid?.clauseResponses ?? []).find((r: any) => clauseKey(r) === clauseKey(clause)) ?? null;
}

export function clauseStatusLabel(response: any): string {
  if (!response) return 'No response';
  if (!response.accepted) return 'Not accepted';
  if (acceptedWithConditions(response)) return 'Accepted with conditions';
  return 'Accepted as written';
}

export function money(value: number | undefined | null, currency = ''): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const formatted = Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${formatted}` : formatted;
}

export function lineOtherData(item: any): string[] {
  const parts: string[] = [];
  for (const field of item?.customFields ?? []) {
    if (field?.label && field?.value) parts.push(`${field.label}: ${field.value}`);
  }
  if (item?.notes) parts.push(`Remarks: ${item.notes}`);
  if (item?.originalQuantity != null && Number(item.quantity) !== Number(item.originalQuantity) && item.quantityChangeReason) {
    parts.push(`Qty change: ${item.quantityChangeReason}`);
  }
  return parts;
}

export function lineDelivery(item: any): string {
  return formatDelivery(item) || '—';
}

export function vendorPublic(profile: any) {
  if (!profile) return null;
  return {
    _id: profile._id,
    companyName: profile.companyName || 'Supplier',
    contactPerson: profile.contactPerson || '',
    city: profile.city,
    country: profile.country,
  };
}

export function comparisonColumns(bids: any[], includeOriginal: boolean) {
  const columns: any[] = [];
  for (const bid of bids ?? []) {
    const name = bid.vendor?.companyName || 'Supplier';
    const isRevised = Boolean(bid.revisedAt);
    if (includeOriginal && bid.originalVersion) {
      columns.push({
        ...bid,
        ...bid.originalVersion,
        totalPrice: resolvedBidTotal(bid.originalVersion),
        _id: `${bid._id}-original`,
        isOriginal: true,
        vendor: { ...bid.vendor, companyName: `${name} (original)` },
      });
    }
    columns.push({
      ...bid,
      isOriginal: false,
      vendor: {
        ...bid.vendor,
        companyName: isRevised ? `${name} (revised)` : name,
      },
    });
  }
  return columns;
}
