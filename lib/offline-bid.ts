import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { BOQ_SHEET_NAME, parseSupplierBoq } from '@/lib/boq-sheet';
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

const HEADER_FILL = 'FF2F5496'; // dark blue
const HEADER_FONT = 'FFFFFFFF'; // white
const TITLE_FILL = 'FFC55A3A'; // copper/primary
const TITLE_FONT = 'FFFFFFFF';
const SUBHEADER_FILL = 'FFE7E6E6'; // light gray

function styleHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: HEADER_FONT } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };
}

function styleSubHeaderCell(cell: ExcelJS.Cell) {
  cell.font = { bold: true };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBHEADER_FILL } };
  cell.alignment = { vertical: 'middle' };
}

function styleTitleRow(ws: ExcelJS.Worksheet, range: string, title: string) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(':')[0]);
  cell.value = title;
  cell.font = { bold: true, size: 14, color: { argb: TITLE_FONT } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

export async function buildOfflineBidWorkbook(tender: ITender): Promise<Buffer> {
  const currency = tender.currency || 'USD';
  const boqItems = tender.boqItems ?? [];
  const clauses = tender.clauses ?? [];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ProSource';
  wb.created = new Date();

  // ─── Summary sheet ─────────────────────────────────────────────────────────
  const summary = wb.addWorksheet(OFFLINE_SUMMARY_SHEET);
  summary.columns = [{ width: 30 }, { width: 70 }];
  styleTitleRow(summary, 'A1:B1', `OFFLINE OFFER — ${tender.title}`);
  summary.getRow(1).height = 28;

  const metaRows = [
    ['Package type', (tender.type || '').toUpperCase()],
    ['Package currency', currency],
    ['Incoterm', tender.incoterm ? `${tender.incoterm}${tender.incotermPlace ? ` — ${tender.incotermPlace}` : ''}` : ''],
    ['Bid deadline', tender.bidDeadline ? new Date(tender.bidDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''],
  ];
  metaRows.forEach(([label, value], i) => {
    const row = summary.getRow(i + 3);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = value as string;
    row.getCell(2).alignment = { wrapText: true };
  });

  let r = 8;
  const supplierHeader = summary.getRow(r);
  summary.mergeCells(`A${r}:B${r}`);
  supplierHeader.getCell(1).value = 'Supplier details';
  styleSubHeaderCell(supplierHeader.getCell(1));
  r++;
  const supplierFields: [string, string][] = [
    [SUMMARY_LABELS.name, ''],
    [SUMMARY_LABELS.email, ''],
    [SUMMARY_LABELS.contactPerson, ''],
    [SUMMARY_LABELS.phone, ''],
    [SUMMARY_LABELS.city, ''],
    [SUMMARY_LABELS.country, ''],
  ];
  supplierFields.forEach(([label, value]) => {
    const row = summary.getRow(r++);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = value;
  });

  r++;
  const offerHeader = summary.getRow(r);
  summary.mergeCells(`A${r}:B${r}`);
  offerHeader.getCell(1).value = 'Offer details';
  styleSubHeaderCell(offerHeader.getCell(1));
  r++;
  const offerFields: [string, string | number][] = [
    [SUMMARY_LABELS.currency, currency],
    [SUMMARY_LABELS.validityDays, 90],
    [SUMMARY_LABELS.discountType, ''],
    [SUMMARY_LABELS.discountValue, ''],
    [SUMMARY_LABELS.vatPercent, ''],
    [SUMMARY_LABELS.technicalProposal, ''],
    [SUMMARY_LABELS.commercialProposal, ''],
    [SUMMARY_LABELS.notes, ''],
  ];
  offerFields.forEach(([label, value]) => {
    const row = summary.getRow(r++);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = value as ExcelJS.ValueType;
  });

  r++;
  const taxedBaseRow = summary.getRow(r);
  taxedBaseRow.getCell(1).value = 'Base after discount + VAT';
  taxedBaseRow.getCell(1).font = { bold: true };
  taxedBaseRow.getCell(2).value = {
    formula: `=(BOQ_TOTAL-IF(B19="percent",BOQ_TOTAL*B20/100,B20))*(1+B21/100)`,
  };
  taxedBaseRow.getCell(2).numFmt = `${currency} #,##0.00`;
  wb.definedNames.add(`'${OFFLINE_SUMMARY_SHEET}'!$B$${r}`, 'TAXED_BASE');
  r++;

  const totalHeader = summary.getRow(r);
  summary.mergeCells(`A${r}:B${r}`);
  totalHeader.getCell(1).value = 'Calculated effective total';
  styleSubHeaderCell(totalHeader.getCell(1));
  r++;
  const totalRow = summary.getRow(r);
  totalRow.getCell(1).value = 'Effective total';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(2).value = {
    formula: '=TAXED_BASE+CHARGES_EFFECTIVE',
  };
  totalRow.getCell(2).numFmt = `${currency} #,##0.00`;
  totalRow.getCell(2).font = { bold: true };

  // ─── BOQ sheet ─────────────────────────────────────────────────────────────
  const boq = wb.addWorksheet(BOQ_SHEET_NAME);
  boq.columns = [
    { width: 12 },  // A line code
    { width: 46 },  // B description
    { width: 12 },  // C original qty
    { width: 10 },  // D unit
    { width: 12 },  // E quoted qty
    { width: 14 },  // F unit price
    { width: 14 },  // G line total
    { width: 30 },  // H qty change reason
    { width: 28 },  // I remarks
    { width: 14 },  // J delivery value
    { width: 14 },  // K delivery mode
  ];
  styleTitleRow(boq, 'A1:K1', `BOQ — ${tender.title}`);
  boq.getRow(1).height = 28;

  const boqHeaders = [
    'Line code', 'Description', 'Original qty', 'Unit', 'Quoted qty',
    'Unit price', 'Line total', 'Qty change reason', 'Remarks', 'Delivery value', 'Delivery mode',
  ];
  const headerRow = boq.getRow(3);
  boqHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    styleHeaderCell(cell);
  });

  const codedBoq = boqItems.map((item, i) => ({
    ...item,
    lineCode: item.lineCode?.trim() || `BOQ-${String(i + 1).padStart(3, '0')}`,
  }));

  codedBoq.forEach((item, i) => {
    const rowIdx = i + 4;
    const row = boq.getRow(rowIdx);
    row.getCell(1).value = item.lineCode;
    row.getCell(2).value = item.description;
    row.getCell(2).alignment = { wrapText: true };
    row.getCell(3).value = item.quantity;
    row.getCell(4).value = item.unit;
    row.getCell(5).value = item.quantity; // prefilled quoted qty
    row.getCell(6).value = '';
    row.getCell(7).value = { formula: `IF(OR(E${rowIdx}="",F${rowIdx}=""),"",E${rowIdx}*F${rowIdx})` };
    row.getCell(7).numFmt = '#,##0.00';
    row.getCell(8).value = '';
    row.getCell(9).value = '';
    row.getCell(9).alignment = { wrapText: true };
    row.getCell(10).value = '';
    row.getCell(11).value = 'days';
  });

  const boqTotalRow = codedBoq.length + 5;
  const boqTotalLabel = boq.getRow(boqTotalRow);
  boqTotalLabel.getCell(1).value = 'TOTAL';
  boqTotalLabel.getCell(1).font = { bold: true };
  boqTotalLabel.getCell(7).value = { formula: `SUM(G4:G${codedBoq.length + 3})` };
  boqTotalLabel.getCell(7).numFmt = `${currency} #,##0.00`;
  boqTotalLabel.getCell(7).font = { bold: true };

  // Define names used by Summary formula.
  wb.definedNames.add(`'${BOQ_SHEET_NAME}'!$G$${boqTotalRow}`, 'BOQ_TOTAL');

  // ─── Commercial summary at the bottom of the BOQ sheet ─────────────────────
  const boqSummaryStart = boqTotalRow + 2;
  boq.mergeCells(`A${boqSummaryStart}:G${boqSummaryStart}`);
  const boqSummaryHeader = boq.getRow(boqSummaryStart).getCell(1);
  boqSummaryHeader.value = 'Commercial summary';
  styleSubHeaderCell(boqSummaryHeader);

  const summaryDiscountFormula = `IF('Summary'!B19="percent",BOQ_TOTAL*'Summary'!B20/100,'Summary'!B20)`;
  const summaryVatFormula = `(BOQ_TOTAL-${summaryDiscountFormula})*'Summary'!B21/100`;

  const addBoqSummaryRow = (offset: number, label: string, formula: string, isTotal = false) => {
    const row = boq.getRow(boqSummaryStart + offset);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true };
    row.getCell(7).value = { formula };
    row.getCell(7).numFmt = `${currency} #,##0.00`;
    if (isTotal) row.getCell(7).font = { bold: true };
  };

  addBoqSummaryRow(1, 'Discount', summaryDiscountFormula);
  addBoqSummaryRow(2, 'VAT', summaryVatFormula);
  addBoqSummaryRow(3, 'Base after discount + VAT', 'TAXED_BASE');
  addBoqSummaryRow(4, 'Other charges', 'CHARGES_EFFECTIVE');
  addBoqSummaryRow(5, 'Effective total', 'TAXED_BASE+CHARGES_EFFECTIVE', true);

  // ─── Terms sheet ───────────────────────────────────────────────────────────
  if (clauses.length > 0) {
    const terms = wb.addWorksheet(OFFLINE_TERMS_SHEET);
    terms.columns = [{ width: 14 }, { width: 36 }, { width: 18 }, { width: 44 }, { width: 60 }];
    styleTitleRow(terms, 'A1:E1', 'Terms & conditions');
    terms.getRow(1).height = 28;
    const termHeaders = ['Kind', 'Title', 'Accepted (Yes/No)', 'Comments', 'Proposed terms'];
    const tHeaderRow = terms.getRow(3);
    termHeaders.forEach((h, i) => {
      const cell = tHeaderRow.getCell(i + 1);
      cell.value = h;
      styleHeaderCell(cell);
    });
    clauses.forEach((clause, i) => {
      const row = terms.getRow(i + 4);
      row.getCell(1).value = clause.kind;
      row.getCell(2).value = clause.title;
      row.getCell(2).alignment = { wrapText: true };
      row.getCell(3).value = '';
      row.getCell(4).value = '';
      row.getCell(4).alignment = { wrapText: true };
      row.getCell(5).value = '';
      row.getCell(5).alignment = { wrapText: true };
    });
  }

  // ─── Charges sheet ─────────────────────────────────────────────────────────
  const charges = wb.addWorksheet(OFFLINE_CHARGES_SHEET);
  charges.columns = [
    { width: 40 },  // A label
    { width: 22 },  // B type
    { width: 18 },  // C amount
    { width: 2 },   // D gap
    { width: 34 },  // E summary label
    { width: 18 },  // F summary value
  ];
  styleTitleRow(charges, 'A1:C1', `Other costs — ${currency}`);
  charges.getRow(1).height = 28;
  const chargeHeaders = ['Label', 'Type (value/percent)', `Amount (${currency})`];
  const cHeaderRow = charges.getRow(3);
  chargeHeaders.forEach((h, i) => {
    const cell = cHeaderRow.getCell(i + 1);
    cell.value = h;
    styleHeaderCell(cell);
  });
  CHARGE_SUGGESTIONS.forEach((label, i) => {
    const row = charges.getRow(i + 4);
    row.getCell(1).value = label;
    row.getCell(1).alignment = { wrapText: true };
    row.getCell(2).value = 'value';
    row.getCell(3).value = '';
    row.getCell(3).numFmt = '#,##0.00';
  });
  const lastChargeRow = CHARGE_SUGGESTIONS.length + 3;
  const chargeSumRow = lastChargeRow + 2;
  const chargeTotal = charges.getRow(chargeSumRow);
  chargeTotal.getCell(1).value = 'TOTAL';
  chargeTotal.getCell(1).font = { bold: true };
  chargeTotal.getCell(3).value = { formula: `SUM(C4:C${lastChargeRow})` };
  chargeTotal.getCell(3).numFmt = `${currency} #,##0.00`;
  chargeTotal.getCell(3).font = { bold: true };
  wb.definedNames.add(`'${OFFLINE_CHARGES_SHEET}'!$C$${chargeSumRow}`, 'CHARGES_SUM');

  // ─── Commercial summary on the Charges sheet (columns E-F) ─────────────────
  const csHeader = charges.getRow(3).getCell(5);
  charges.mergeCells('E3:F3');
  csHeader.value = 'Commercial summary';
  styleSubHeaderCell(csHeader);

  const addChargesSummaryRow = (rowIdx: number, label: string, formula: string, isTotal = false) => {
    const row = charges.getRow(rowIdx);
    row.getCell(5).value = label;
    row.getCell(5).font = { bold: true };
    row.getCell(5).alignment = { wrapText: true };
    row.getCell(6).value = { formula };
    row.getCell(6).numFmt = `${currency} #,##0.00`;
    if (isTotal) row.getCell(6).font = { bold: true };
  };

  addChargesSummaryRow(4, 'BOQ total', 'BOQ_TOTAL');
  addChargesSummaryRow(5, 'Discount', summaryDiscountFormula);
  addChargesSummaryRow(6, 'VAT', summaryVatFormula);
  addChargesSummaryRow(7, 'Base after discount + VAT', 'TAXED_BASE');
  const chargesEffectiveRow = 8;
  addChargesSummaryRow(
    chargesEffectiveRow,
    'Other charges',
    `SUMPRODUCT($C$4:$C$100*(($B$4:$B$100="value")+(($B$4:$B$100="percent")*TAXED_BASE/100)))`
  );
  wb.definedNames.add(`'${OFFLINE_CHARGES_SHEET}'!$F$${chargesEffectiveRow}`, 'CHARGES_EFFECTIVE');
  addChargesSummaryRow(9, 'Effective total', 'TAXED_BASE+CHARGES_EFFECTIVE', true);

  // ─── Instructions sheet ────────────────────────────────────────────────────
  const help = wb.addWorksheet('Instructions');
  help.columns = [{ width: 110 }];
  styleTitleRow(help, 'A1:A1', 'How to fill this workbook');
  help.getRow(1).height = 28;
  const helpRows = [
    `Offline offer workbook — ${tender.title}`,
    '1. Fill the Summary sheet. Supplier company name is required. Discount type is percent or amount; VAT % applies on the discounted amount.',
    boqItems.length > 0
      ? '2. Fill the BOQ sheet: Quoted qty and Unit price per line. Line total is calculated automatically. A commercial summary (discount, VAT, base, charges, effective total) is shown at the bottom of the sheet.'
      : '2. This package has no BOQ lines.',
    clauses.length > 0
      ? '3. On the Terms sheet, mark each clause Accepted (Yes/No) and add Comments or Proposed terms where needed.'
      : '3. This package has no terms clauses.',
    '4. On the Charges sheet, set each line to value (fixed amount) or percent (of discounted value), then fill the amount. Leave blank if not applicable. Add rows for other costs. A commercial summary is also shown on the right side of this sheet.',
    '5. Print all sheets, sign/stamp them, and scan to PDF.',
    '6. Email this filled workbook together with the signed PDF to the buyer.',
    'The buyer uploads both files on the Offline Bids page; your offer then appears in the bid comparison.',
  ];
  helpRows.forEach((text, i) => {
    const row = help.getRow(i + 3);
    row.getCell(1).value = text;
    row.getCell(1).alignment = { wrapText: true };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
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
    if (cellText(row[0]).toLowerCase() === 'kind' && cellText(row[1]).toLowerCase() === 'title') continue; // skip header
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
