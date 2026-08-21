import type { TenderDocumentCategory, TenderType } from '@/lib/types';

export const PROCUREMENT_TYPES: Record<
  TenderType,
  {
    value: TenderType;
    label: string;
    fullLabel: string;
    summary: string;
    publishRequirement: string;
  }
> = {
  rfq: {
    value: 'rfq',
    label: 'RFQ',
    fullLabel: 'RFQ (Request for Quotation)',
    summary:
      'Use when materials or services are well defined, with clear specifications and quantities. Suppliers quote against a fixed BOQ.',
    publishRequirement: 'A BOQ with materials or services and quantities',
  },
  rfp: {
    value: 'rfp',
    label: 'RFP',
    fullLabel: 'RFP (Request for Proposal)',
    summary:
      'Use when the final outcome is clear but the approach is vendor-dependent. Different suppliers can propose different roadmaps and methods to reach the deliverable.',
    publishRequirement: 'A complete scope document',
  },
  tender: {
    value: 'tender',
    label: 'Tender',
    fullLabel: 'Tender',
    summary:
      'Use for reasonably well-defined, large engineering packages that mix services and materials and need formal compliance and tender terms.',
    publishRequirement: 'Compliance / tender terms',
  },
};

export const DEFAULT_PROCUREMENT_TYPE: TenderType = 'rfq';

export const TENDER_DOCUMENT_CATEGORIES = [
  { value: 'boq', label: 'Bill of Quantities (BOQ)' },
  { value: 'scope', label: 'Scope of Work' },
  { value: 'terms', label: 'Compliance / Tender Terms' },
  { value: 'drawing', label: 'Drawing / Specification' },
  { value: 'other', label: 'Other Attachment' },
] as const;

export const DOCUMENT_CATEGORY_VALUES = TENDER_DOCUMENT_CATEGORIES.map((c) => c.value) as [
  TenderDocumentCategory,
  ...TenderDocumentCategory[],
];

export function documentCategoryLabel(category: string): string {
  return TENDER_DOCUMENT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function defaultDocumentCategory(type: TenderType): TenderDocumentCategory {
  if (type === 'rfq') return 'boq';
  if (type === 'rfp') return 'scope';
  return 'terms';
}

export type PublishDoc = { category?: string | null };
export type PublishBoqItem = { description?: string | null; quantity?: number | null };

export function hasBoqLineItems(items?: PublishBoqItem[] | null): boolean {
  return (items ?? []).some(
    (item) => Boolean(item.description?.trim()) && Number(item.quantity) > 0,
  );
}

export function hasDocumentCategory(
  documents: PublishDoc[] | null | undefined,
  category: TenderDocumentCategory,
): boolean {
  return (documents ?? []).some((doc) => doc.category === category);
}

export function getPublishBlockers(input: {
  type: TenderType;
  documents?: PublishDoc[] | null;
  boqItems?: PublishBoqItem[] | null;
}): string[] {
  const documents = input.documents ?? [];
  const boqItems = input.boqItems ?? [];

  if (input.type === 'rfq') {
    if (!hasDocumentCategory(documents, 'boq') && !hasBoqLineItems(boqItems)) {
      return [
        'Attach a BOQ with materials or services and quantities before publishing this RFQ.',
      ];
    }
    return [];
  }

  if (input.type === 'rfp') {
    if (!hasDocumentCategory(documents, 'scope')) {
      return ['Attach a complete scope document before publishing this RFP.'];
    }
    return [];
  }

  if (!hasDocumentCategory(documents, 'terms')) {
    return ['Attach compliance / tender terms before publishing this tender.'];
  }
  return [];
}

export function canPublish(input: {
  type: TenderType;
  documents?: PublishDoc[] | null;
  boqItems?: PublishBoqItem[] | null;
}): boolean {
  return getPublishBlockers(input).length === 0;
}

/** Bid deadline shorter than this (calendar days) triggers a "are you sure" warning. */
export const SHORT_BID_DEADLINE_DAYS = 3;
/** Project end shorter than this (calendar days) triggers a "are you sure" warning. */
export const SHORT_PROJECT_END_DAYS = 7;
/** Span between bid deadline and project end shorter than this triggers a warning. */
export const SHORT_DELIVERY_WINDOW_DAYS = 7;

export function parseDeadlineEnd(value: string | Date): Date {
  if (value instanceof Date) return new Date(value.getTime());
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:59`);
  return new Date(value);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calendarDaysFromToday(date: Date): number {
  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(date);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function getPublishDateIssues(
  bidDeadline?: string | Date | null,
  deliveryDeadline?: string | Date | null,
): { blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!bidDeadline) blockers.push('Set a bid submission deadline before publishing.');
  if (!deliveryDeadline) blockers.push('Set a project delivery / end date before publishing.');
  if (!bidDeadline || !deliveryDeadline) return { blockers, warnings };

  const bid = parseDeadlineEnd(bidDeadline);
  const projectEnd = parseDeadlineEnd(deliveryDeadline);
  if (!isValidDate(bid)) blockers.push('The bid deadline is not a valid date.');
  if (!isValidDate(projectEnd)) blockers.push('The project end date is not a valid date.');
  if (!isValidDate(bid) || !isValidDate(projectEnd)) return { blockers, warnings };

  const now = Date.now();
  if (bid.getTime() <= now) blockers.push('The bid deadline must be in the future.');
  if (projectEnd.getTime() <= now) blockers.push('The project end date must be in the future.');
  if (projectEnd.getTime() < bid.getTime()) {
    blockers.push('Project end must be on or after the bid submission deadline.');
  }

  if (blockers.length > 0) return { blockers, warnings };

  const bidDays = calendarDaysFromToday(bid);
  const endDays = calendarDaysFromToday(projectEnd);
  const windowDays = calendarDaysFromToday(projectEnd) - calendarDaysFromToday(bid);

  if (bidDays < SHORT_BID_DEADLINE_DAYS) {
    warnings.push(
      `The bid deadline is only ${bidDays} day(s) away. Confirm this is enough time for suppliers to respond.`,
    );
  }
  if (endDays < SHORT_PROJECT_END_DAYS) {
    warnings.push(
      `The project end date is only ${endDays} day(s) away. Confirm this duration is sufficient.`,
    );
  }
  if (windowDays >= 0 && windowDays < SHORT_DELIVERY_WINDOW_DAYS) {
    warnings.push(
      `Only ${windowDays} day(s) remain between the bid deadline and project end. Confirm this is enough to deliver.`,
    );
  }

  return { blockers, warnings };
}
