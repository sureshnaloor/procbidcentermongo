import { z } from 'zod';

export const DELIVERY_MODES = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'working_weeks', label: 'Working weeks' },
  { value: 'date', label: 'Date' },
] as const;

export type DeliveryMode = (typeof DELIVERY_MODES)[number]['value'];

export const CUSTOM_FIELD_SUGGESTIONS = [
  'Country of origin',
  'OEM name',
  'Brand name',
  'Part number',
  'Catalog number',
  'Vendor approval number',
] as const;

export const MAX_CUSTOM_FIELDS = 6;
export const MIN_QTY_CHANGE_REASON = 15;

export const bidLineCustomFieldInput = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(200),
});

export const bidLineItemInput = z.object({
  description: z.string(),
  quantity: z.number(),
  originalQuantity: z.number().optional(),
  quantityChangeReason: z.string().max(1000).optional(),
  unit: z.string(),
  unitPrice: z.number(),
  deliveryDays: z.number().optional(),
  deliveryMode: z.enum(['days', 'weeks', 'working_weeks', 'date']).optional(),
  deliveryValue: z.number().positive().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  customFields: z.array(bidLineCustomFieldInput).max(MAX_CUSTOM_FIELDS).optional(),
}).superRefine((item, ctx) => {
  const error = quantityChangeError({
    quantity: item.quantity,
    originalQuantity: item.originalQuantity,
    quantityChangeReason: item.quantityChangeReason,
  });
  if (error) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantityChangeReason'], message: error });
  }
});

export function quantityWasChanged(item: { quantity?: number; originalQuantity?: number | null }): boolean {
  if (item.originalQuantity == null) return false;
  return Number(item.quantity) !== Number(item.originalQuantity);
}

export function quantityChangeError(item: {
  quantity?: number;
  originalQuantity?: number | null;
  quantityChangeReason?: string;
}): string | null {
  if (!quantityWasChanged(item)) return null;
  const reason = item.quantityChangeReason?.trim() ?? '';
  if (reason.length < MIN_QTY_CHANGE_REASON) {
    return `A clear justification is required when quantity is changed (at least ${MIN_QTY_CHANGE_REASON} characters).`;
  }
  return null;
}

export function normalizeStoredLineItem(item: z.infer<typeof bidLineItemInput>) {
  const mode = item.deliveryMode ?? (item.deliveryDays ? 'days' : undefined);
  const deliveryDate = mode === 'date' && item.deliveryDate
    ? (/^\d{4}-\d{2}-\d{2}$/.test(item.deliveryDate) ? new Date(`${item.deliveryDate}T00:00:00`) : new Date(item.deliveryDate))
    : undefined;
  const deliveryValue = mode && mode !== 'date'
    ? (item.deliveryValue ?? item.deliveryDays)
    : undefined;
  const originalQuantity = item.originalQuantity != null && Number.isFinite(item.originalQuantity)
    ? item.originalQuantity
    : undefined;
  const changed = originalQuantity != null && item.quantity !== originalQuantity;
  return {
    description: item.description,
    quantity: item.quantity,
    originalQuantity,
    quantityChangeReason: changed ? item.quantityChangeReason?.trim() || undefined : undefined,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalPrice: item.quantity * item.unitPrice,
    deliveryMode: mode,
    deliveryValue,
    deliveryDate: deliveryDate && !Number.isNaN(deliveryDate.getTime()) ? deliveryDate : undefined,
    deliveryDays: mode === 'days' ? deliveryValue : item.deliveryDays,
    notes: item.notes,
    customFields: (item.customFields ?? [])
      .filter((field) => field.label.trim() && field.value.trim())
      .slice(0, MAX_CUSTOM_FIELDS)
      .map((field) => ({ label: field.label.trim(), value: field.value.trim() })),
  };
}

export function formatDelivery(item: {
  deliveryMode?: string | null;
  deliveryValue?: number | null;
  deliveryDate?: string | Date | null;
  deliveryDays?: number | null;
}): string | null {
  const mode = item.deliveryMode || (item.deliveryDays ? 'days' : null);
  if (mode === 'date' && item.deliveryDate) {
    const date = item.deliveryDate instanceof Date ? item.deliveryDate : new Date(item.deliveryDate);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
  const value = item.deliveryValue ?? item.deliveryDays;
  if (!value) return null;
  if (mode === 'weeks') return `${value} week${value === 1 ? '' : 's'}`;
  if (mode === 'working_weeks') return `${value} working week${value === 1 ? '' : 's'}`;
  return `${value} day${value === 1 ? '' : 's'}`;
}

export function lineItemsTotal(lineItems?: Array<{ quantity?: number; unitPrice?: number; totalPrice?: number }> | null): number {
  return (lineItems ?? []).reduce((sum, item) => {
    const computed = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    return sum + (Number.isFinite(computed) ? computed : 0);
  }, 0);
}

export function resolvedBidTotal(bid: { totalPrice?: number | null; lineItems?: Array<{ quantity?: number; unitPrice?: number; totalPrice?: number }> | null }): number | undefined {
  const fromLines = lineItemsTotal(bid.lineItems);
  if ((bid.lineItems?.length ?? 0) > 0) return fromLines;
  if (bid.totalPrice == null || Number.isNaN(Number(bid.totalPrice))) return undefined;
  return Number(bid.totalPrice);
}
