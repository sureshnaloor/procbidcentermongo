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

export const bidLineCustomFieldInput = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(200),
});

export const bidLineItemInput = z.object({
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  deliveryDays: z.number().optional(),
  deliveryMode: z.enum(['days', 'weeks', 'working_weeks', 'date']).optional(),
  deliveryValue: z.number().positive().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  customFields: z.array(bidLineCustomFieldInput).max(MAX_CUSTOM_FIELDS).optional(),
});

export function normalizeStoredLineItem(item: z.infer<typeof bidLineItemInput>) {
  const mode = item.deliveryMode ?? (item.deliveryDays ? 'days' : undefined);
  const deliveryDate = mode === 'date' && item.deliveryDate
    ? (/^\d{4}-\d{2}-\d{2}$/.test(item.deliveryDate) ? new Date(`${item.deliveryDate}T00:00:00`) : new Date(item.deliveryDate))
    : undefined;
  const deliveryValue = mode && mode !== 'date'
    ? (item.deliveryValue ?? item.deliveryDays)
    : undefined;
  return {
    description: item.description,
    quantity: item.quantity,
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
