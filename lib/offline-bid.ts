import * as XLSX from 'xlsx';
import { BOQ_SHEET_NAME, buildSupplierBoqWorkbook, parseSupplierBoq } from '@/lib/boq-sheet';
import type { IBidCharge, IBidClauseResponse, DiscountType, IOfflineSupplier, ITender } from '@/lib/types';
import type { ParsedSupplierBoqLine } from '@/lib/boq-sheet';
import { CHARGE_SUGGESTIONS } from '@/lib/bid-line';

export const OFFLINE_SUMMARY_SHEET = 'Summary';
export const OFFLINE_TERMS_SHEET = 'Terms';
export const OFFLINE_CHARGES_SHEET = 'Charges';

const SUMMARY_LABELS = {
  name: 'Supplier company name',
  email: 'Supplier email',
  contactPerson: 'Contact person',
  phone: 'Phone',
  city: 'City',
  country: 'Country',
  currency: 'Offer currency',
  validityDays: 'Validity days',
  discountType: 'Discount type (percent/amount)',
  discountValue: 'Discount value',
  vatPercent: 'VAT %',
  technicalProposal: 'Technical proposal',
  commercialProposal: 'Commercial proposal',
  notes: 'Notes / remarks',
} as const;

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}

export function buildOfflineBidWorkbook(tender: ITender): Buffer {
  const wb = XLSX.utils.book_new();
  const currency = tender.currency || 'USD';

  const summary = XLSX.utils.aoa_to_sheet([
    ['Offline offer', tender.title],
    ['Package type', (tender.type || '').toUpperCase()],
    ['Package currency', currency],
    ['Incoterm', tender.incoterm ? `${tender.incoterm}${tender.incotermPlace ? ` — ${tender.incotermPlace}` : ''}` : ''],
    ['Bid deadline', tender.bidDeadline ? new Date(tender.bidDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''],
    [],
    ['Supplier details'],
    [SUMMARY_LABELS.name, ''],
    [SUMMARY_LABELS.email, ''],
    [SUMMARY_LABELS.contactPerson, ''],
    [SUMMARY_LABELS.phone, ''],
    [SUMMARY_LABELS.city, ''],
    [SUMMARY_LABELS.country, ''],
    [],
    ['Offer details'],
    [SUMMARY_LABELS.currency, currency],
    [SUMMARY_LABELS.validityDays, 90],
    [SUMMARY_LABELS.discountType, ''],
    [SUMMARY_LABELS.discountValue, ''],
    [SUMMARY_LABELS.vatPercent, ''],
    [SUMMARY_LABELS.technicalProposal, ''],
    [SUMMARY_LABELS.commercialProposal, ''],
    [SUMMARY_LABELS.notes, ''],
  ]);
  setColumnWidths(summary, [28, 70]);
  XLSX.utils.book_append_sheet(wb, summary, OFFLINE_SUMMARY_SHEET);

  const boqItems = tender.boqItems ?? [];
  if (boqItems.length > 0) {
    const boqWb = XLSX.read(buildSupplierBoqWorkbook({ title: tender.title, currency, boqItems }), { type: 'buffer' });
    XLSX.utils.book_append_sheet(wb, boqWb.Sheets[BOQ_SHEET_NAME]!, BOQ_SHEET_NAME);
  }

  const clauses = tender.clauses ?? [];
  if (clauses.length > 0) {
    const termsRows: unknown[][] = [['Kind', 'Title', 'Accepted (Yes/No)', 'Comments', 'Proposed terms']];
    for (const clause of clauses) {
      termsRows.push([clause.kind, clause.title, '', '', '']);
    }
    const terms = XLSX.utils.aoa_to_sheet(termsRows);
    setColumnWidths(terms, [14, 36, 18, 44, 60]);
    XLSX.utils.book_append_sheet(wb, terms, OFFLINE_TERMS_SHEET);
  }

  const chargesRows: unknown[][] = [
    ['Label', 'Type (value/percent)', `Amount (${currency})`],
    ...CHARGE_SUGGESTIONS.map((label) => [label, 'value', '']),
  ];
  const charges = XLSX.utils.aoa_to_sheet(chargesRows);
  setColumnWidths(charges, [36, 22, 18]);
  XLSX.utils.book_append_sheet(wb, charges, OFFLINE_CHARGES_SHEET);

  const help = XLSX.utils.aoa_to_sheet([
    [`Offline offer workbook — ${tender.title}`],
    ['1. Fill the Summary sheet. Supplier company name is required. Discount type is percent or amount; VAT % applies on the discounted amount.'],
    boqItems.length > 0
      ? ['2. Fill the BOQ sheet: Quoted qty and Unit price per line. Line total is calculated. Do not change Line code, Description, Original qty or Unit.']
      : ['2. This package has no BOQ lines.'],
    clauses.length > 0
      ? ['3. On the Terms sheet, mark each clause Accepted (Yes/No) and add Comments or Proposed terms where needed.']
      : ['3. This package has no terms clauses.'],
    ['4. On the Charges sheet, set each line to value (fixed amount) or percent (of discounted value), then fill the amount. Leave blank if not applicable. Add rows for other costs.'],
    ['5. Print all sheets, sign/stamp them, and scan to PDF.'],
    ['6. Email this filled workbook together with the signed PDF to the buyer.'],
    ['The buyer uploads both files on the Offline Bids page; your offer then appears in the bid comparison.'],
  ]);
  setColumnWidths(help, [120]);
  XLSX.utils.book_append_sheet(wb, help, 'Instructions');

  return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

export type ParsedOfflineBid = {
  supplier: IOfflineSupplier;
  offer: {
    currency?: string;
    validityDays?: number;
    discountType?: DiscountType;
    discountValue?: number;
    vatPercent?: number;
    otherCharges?: IBidCharge[];
    technicalProposal?: string;
    commercialProposal?: string;
    notes?: string;
  };
  lineItems: ParsedSupplierBoqLine[];
  clauseResponses: IBidClauseResponse[];
  warnings: string[];
};

function cellText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function summaryRows(wb: XLSX.WorkBook): Map<string, string> {
  const sheet = wb.Sheets[OFFLINE_SUMMARY_SHEET];
  if (!sheet) throw new Error('The workbook has no Summary sheet. Use the template downloaded from the Offline Bids page.');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  const map = new Map<string, string>();
  for (const row of rows) {
    const label = cellText(row[0]).toLowerCase();
    const value = cellText(row[1]);
    if (label && value && !map.has(label)) map.set(label, value);
  }
  return map;
}

function parseTermsSheet(wb: XLSX.WorkBook, tender: ITender, warnings: string[]): IBidClauseResponse[] {
  const sheet = wb.Sheets[OFFLINE_TERMS_SHEET];
  const clauses = tender.clauses ?? [];
  if (!sheet || clauses.length === 0) return [];
  const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][])
    .filter((row) => row.some((cell) => cellText(cell)));
  const byTitle = new Map(clauses.map((c) => [c.title.trim().toLowerCase(), c]));
  const responses: IBidClauseResponse[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const title = cellText(row[1]);
    if (!title) continue;
    const clause = byTitle.get(title.toLowerCase());
    if (!clause) {
      warnings.push(`Terms row ${r + 1}: "${title.slice(0, 60)}" does not match a package clause and was skipped`);
      continue;
    }
    const acceptedRaw = cellText(row[2]).toLowerCase();
    const comments = cellText(row[3]) || undefined;
    const proposedBody = cellText(row[4]) || undefined;
    responses.push({
      kind: clause.kind,
      slug: clause.slug,
      accepted: acceptedRaw === 'yes' || acceptedRaw === 'y' || acceptedRaw === 'true' || acceptedRaw === 'accepted',
      comments,
      originalBody: clause.body,
      proposedBody,
    });
  }
  return responses;
}

function parseChargesSheet(wb: XLSX.WorkBook, warnings: string[]): IBidCharge[] {
  const sheet = wb.Sheets[OFFLINE_CHARGES_SHEET];
  if (!sheet) return [];
  const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][])
    .filter((row) => row.some((cell) => cellText(cell)));
  const charges: IBidCharge[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const label = cellText(row[0]);
    if (!label || label.toLowerCase() === 'label') continue;
    const typeRaw = cellText(row[1]).toLowerCase();
    const type: IBidCharge['type'] = typeRaw.startsWith('percent') || typeRaw === '%' ? 'percent' : 'value';
    const raw = cellText(row[2]).replace(/,/g, '');
    if (!raw) continue;
    const amount = Number(raw.replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(amount)) {
      warnings.push(`Charges row ${r + 1}: "${label}" has a non-numeric amount and was skipped`);
      continue;
    }
    if (amount > 0) charges.push({ label: label.slice(0, 80), type, amount });
  }
  return charges;
}

export function parseOfflineBidWorkbook(buffer: Buffer, tender: ITender): ParsedOfflineBid {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const warnings: string[] = [];

  const summary = summaryRows(wb);
  const supplier: IOfflineSupplier = {
    name: summary.get(SUMMARY_LABELS.name.toLowerCase()) ?? '',
    email: summary.get(SUMMARY_LABELS.email.toLowerCase()) || undefined,
    contactPerson: summary.get(SUMMARY_LABELS.contactPerson.toLowerCase()) || undefined,
    phone: summary.get(SUMMARY_LABELS.phone.toLowerCase()) || undefined,
    city: summary.get(SUMMARY_LABELS.city.toLowerCase()) || undefined,
    country: summary.get(SUMMARY_LABELS.country.toLowerCase()) || undefined,
  };
  if (!supplier.name) {
    throw new Error('Supplier company name is missing on the Summary sheet');
  }

  const validityRaw = summary.get(SUMMARY_LABELS.validityDays.toLowerCase());
  const validityDays = validityRaw ? Number(validityRaw.replace(/[^\d.]/g, '')) : undefined;
  const discountTypeRaw = (summary.get(SUMMARY_LABELS.discountType.toLowerCase()) ?? '').toLowerCase();
  const discountType: DiscountType | undefined = discountTypeRaw.startsWith('percent') || discountTypeRaw === '%'
    ? 'percent'
    : discountTypeRaw.startsWith('amount') || discountTypeRaw === 'value'
      ? 'amount'
      : undefined;
  const discountRaw = summary.get(SUMMARY_LABELS.discountValue.toLowerCase());
  const discountValue = discountRaw ? Number(discountRaw.replace(/[^\d.-]/g, '')) : undefined;
  const vatRaw = summary.get(SUMMARY_LABELS.vatPercent.toLowerCase());
  const vatPercent = vatRaw ? Number(vatRaw.replace(/[^\d.-]/g, '')) : undefined;
  const otherCharges = parseChargesSheet(wb, warnings);
  if (discountValue && !discountType) {
    warnings.push('Discount value is filled but Discount type is missing — set it to percent or amount; the discount was ignored');
  }
  const offer = {
    currency: summary.get(SUMMARY_LABELS.currency.toLowerCase()) || undefined,
    validityDays: validityDays && Number.isFinite(validityDays) ? validityDays : undefined,
    discountType: discountValue ? discountType : undefined,
    discountValue: discountType && discountValue && Number.isFinite(discountValue) ? discountValue : undefined,
    vatPercent: vatPercent && Number.isFinite(vatPercent) ? vatPercent : undefined,
    otherCharges: otherCharges.length > 0 ? otherCharges : undefined,
    technicalProposal: summary.get(SUMMARY_LABELS.technicalProposal.toLowerCase()) || undefined,
    commercialProposal: summary.get(SUMMARY_LABELS.commercialProposal.toLowerCase()) || undefined,
    notes: summary.get(SUMMARY_LABELS.notes.toLowerCase()) || undefined,
  };

  let lineItems: ParsedSupplierBoqLine[] = [];
  const boqItems = tender.boqItems ?? [];
  if (boqItems.length > 0) {
    if (!wb.Sheets[BOQ_SHEET_NAME]) {
      warnings.push('The workbook has no BOQ sheet; the offer was imported without priced lines');
    } else {
      const parsed = parseSupplierBoq(buffer, boqItems);
      lineItems = parsed.lineItems;
      warnings.push(...parsed.warnings);
    }
  }

  const clauseResponses = parseTermsSheet(wb, tender, warnings);

  return { supplier, offer, lineItems, clauseResponses, warnings };
}
