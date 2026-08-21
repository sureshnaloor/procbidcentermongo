import { createHash } from 'crypto';
import type { IBid } from '@/lib/types';

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortKeys(v)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function canonicalBidPayload(bid: Pick<
  IBid,
  | 'tenderId'
  | 'vendorProfileId'
  | 'currency'
  | 'validityDays'
  | 'totalPrice'
  | 'technicalProposal'
  | 'commercialProposal'
  | 'notes'
  | 'lineItems'
  | 'clauseResponses'
>) {
  return sortKeys({
    tenderId: String(bid.tenderId),
    vendorProfileId: String(bid.vendorProfileId),
    currency: bid.currency ?? '',
    validityDays: bid.validityDays ?? 0,
    totalPrice: bid.totalPrice ?? null,
    technicalProposal: bid.technicalProposal ?? '',
    commercialProposal: bid.commercialProposal ?? '',
    notes: bid.notes ?? '',
    lineItems: (bid.lineItems ?? []).map((item) => ({
      description: item.description ?? '',
      quantity: item.quantity ?? 0,
      originalQuantity: item.originalQuantity ?? null,
      quantityChangeReason: item.quantityChangeReason ?? '',
      unit: item.unit ?? '',
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? 0,
      notes: item.notes ?? '',
      deliveryMode: item.deliveryMode ?? '',
      deliveryValue: item.deliveryValue ?? null,
      deliveryDate: item.deliveryDate ? new Date(item.deliveryDate).toISOString().slice(0, 10) : '',
      customFields: (item.customFields ?? []).map((field) => ({
        label: field.label ?? '',
        value: field.value ?? '',
      })),
    })),
    clauseResponses: (bid.clauseResponses ?? []).map((r) => ({
      kind: r.kind,
      slug: r.slug ?? '',
      accepted: Boolean(r.accepted),
      originalBody: r.originalBody ?? '',
      proposedBody: r.proposedBody ?? '',
    })),
  });
}

export function hashBidDocument(bid: Parameters<typeof canonicalBidPayload>[0]): string {
  return createHash('sha256').update(JSON.stringify(canonicalBidPayload(bid))).digest('hex');
}
