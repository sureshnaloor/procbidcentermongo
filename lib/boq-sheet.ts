import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { MIN_QTY_CHANGE_REASON, quantityChangeError } from '@/lib/bid-line';

export const BOQ_SHEET_NAME = 'BOQ';
export const BOQ_MAX_LINES = 500;

export const SUPPLIER_HEADERS = [
  'Line code',
  'Description',
  'Original qty',
  'Unit',
  'Quoted qty',
  'Unit price',
  'Line total',
  'Qty change reason',
  'Remarks',
  'Delivery value',
  'Delivery mode',
] as const;

export const COMPANY_HEADERS = ['Line code', 'Description', 'Quantity', 'Unit'] as const;

export type ParsedCompanyBoqItem = {
  lineCode: string;
  description: string;
  quantity: number;
  unit: string;
};

export type ParsedSupplierBoqLine = {
  lineCode?: string;
  description: string;
  quantity: number;
  originalQuantity?: number;
  quantityChangeReason?: string;
  unit: string;
  unitPrice: number;
  notes?: string;
  deliveryMode?: 'days' | 'weeks' | 'working_weeks' | 'date';
  deliveryValue?: number;
};

const DESC_KEYS = [
  'description', 'item description', 'item', 'material', 'particulars', 'particular',
  'boq item', 'scope', 'details', 'item name', 'description of item', 'material description',
  'service description',
];
const CODE_KEYS = [
  'line code', 'linecode', 'item no', 'item no.', 'item number', 'sl no', 'sl. no', 's.no',
  'sr no', 'sr. no', 'code', 'item code', 'boq no', 'boq code',
];
const QTY_KEYS = [
  'qty', 'quantity', 'nos', 'qnty', 'req qty', 'required qty', 'boq qty', 'enquiry qty',
];
const ORIGINAL_QTY_KEYS = ['original qty', 'original quantity', 'invited qty', 'buyer qty'];
const QUOTED_QTY_KEYS = ['quoted qty', 'quoted quantity', 'offer qty', 'offered qty', 'supplier qty'];
const UNIT_KEYS = ['unit', 'uom', 'unit of measure', 'units'];
const PRICE_KEYS = ['unit price', 'rate', 'unit rate', 'price', 'unitprice', 'rate (usd)', 'unit rate (usd)'];
const REASON_KEYS = ['qty change reason', 'quantity change reason', 'justification', 'qty reason', 'quantity justification'];
const NOTES_KEYS = ['remarks', 'notes', 'remark', 'comments', 'comment'];
const DELIVERY_KEYS = ['delivery', 'delivery days', 'delivery value', 'lead time', 'lead time days'];
const DELIVERY_MODE_KEYS = ['delivery mode', 'lead time unit'];

function lineKey(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_/\\]+/g, ' ')
    .replace(/[^a-z0-9. ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchKey(header: string, keys: string[]): boolean {
  return keys.some((key) => {
    if (header === key) return true;
    if (key.length <= 4) return false;
    return header.startsWith(`${key} `) || header.endsWith(` ${key}`);
  });
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function cellText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function decodeBase64File(fileBase64: string): Buffer {
  const payload = fileBase64.includes(',') ? fileBase64.split(',')[1]! : fileBase64;
  return Buffer.from(payload, 'base64');
}

export function lineCodeForIndex(index: number): string {
  return `BOQ-${String(index + 1).padStart(3, '0')}`;
}

export function withLineCodes<T extends { lineCode?: string | null }>(items: T[]): (T & { lineCode: string })[] {
  return items.map((item, i) => ({
    ...item,
    lineCode: item.lineCode?.trim() || lineCodeForIndex(i),
  }));
}

function pickSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  const named = workbook.Sheets[BOQ_SHEET_NAME];
  if (named) return named;
  const first = workbook.SheetNames[0];
  if (!first) throw new Error('The spreadsheet has no sheets');
  return workbook.Sheets[first]!;
}

function sheetMatrix(buffer: Buffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = pickSheet(workbook);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) as unknown[][];
  return rows.filter((row) => row.some((cell) => cellText(cell)));
}

function findHeaderRow(rows: unknown[][]): { headerIndex: number; map: Record<string, number> } {
  const limit = Math.min(rows.length, 25);
  for (let i = 0; i < limit; i++) {
    const headers = (rows[i] ?? []).map((cell) => normalizeHeader(cell));
    const map: Record<string, number> = {};
    headers.forEach((header, col) => {
      if (!header) return;
      if (map.lineCode == null && matchKey(header, CODE_KEYS)) map.lineCode = col;
      else if (map.description == null && matchKey(header, DESC_KEYS)) map.description = col;
      else if (map.originalQty == null && matchKey(header, ORIGINAL_QTY_KEYS)) map.originalQty = col;
      else if (map.quotedQty == null && matchKey(header, QUOTED_QTY_KEYS)) map.quotedQty = col;
      else if (map.unitPrice == null && matchKey(header, PRICE_KEYS)) map.unitPrice = col;
      else if (map.qty == null && matchKey(header, QTY_KEYS)) map.qty = col;
      else if (map.unit == null && matchKey(header, UNIT_KEYS)) map.unit = col;
      else if (map.reason == null && matchKey(header, REASON_KEYS)) map.reason = col;
      else if (map.notes == null && matchKey(header, NOTES_KEYS)) map.notes = col;
      else if (map.deliveryMode == null && matchKey(header, DELIVERY_MODE_KEYS)) map.deliveryMode = col;
      else if (map.delivery == null && matchKey(header, DELIVERY_KEYS)) map.delivery = col;
    });
    if (map.description != null && (map.qty != null || map.originalQty != null || map.quotedQty != null)) {
      return { headerIndex: i, map };
    }
  }
  throw new Error('Could not find a BOQ header row. Include columns for Description and Quantity.');
}

function skipDescription(description: string): boolean {
  const key = description.toLowerCase();
  return !description || key === 'total' || key.startsWith('grand total') || key === 'description';
}

export function parseCompanyBoq(buffer: Buffer): { items: ParsedCompanyBoqItem[]; warnings: string[] } {
  const rows = sheetMatrix(buffer);
  const { headerIndex, map } = findHeaderRow(rows);
  const items: ParsedCompanyBoqItem[] = [];
  const warnings: string[] = [];
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const description = cellText(row[map.description]);
    if (skipDescription(description)) continue;
    const quantity = parseNumber(row[map.originalQty ?? map.qty ?? -1]);
    if (quantity == null || quantity <= 0) {
      warnings.push(`Row ${r + 1}: skipped "${description.slice(0, 60)}" because quantity is missing or zero`);
      continue;
    }
    items.push({
      lineCode: cellText(row[map.lineCode ?? -1]) || lineCodeForIndex(items.length),
      description: description.slice(0, 500),
      quantity,
      unit: (cellText(row[map.unit ?? -1]) || 'unit').slice(0, 40),
    });
    if (items.length >= BOQ_MAX_LINES) {
      warnings.push(`Only the first ${BOQ_MAX_LINES} lines were imported`);
      break;
    }
  }
  if (items.length === 0) {
    throw new Error('No BOQ lines with a description and quantity were found in the file');
  }
  return { items: withLineCodes(items), warnings };
}

const DELIVERY_MODES = new Set(['days', 'weeks', 'working_weeks', 'date']);

function parseDeliveryMode(value: unknown): 'days' | 'weeks' | 'working_weeks' | 'date' | undefined {
  const raw = normalizeHeader(value).replace(/ /g, '_');
  if (DELIVERY_MODES.has(raw)) return raw as 'days' | 'weeks' | 'working_weeks' | 'date';
  if (raw === 'day') return 'days';
  if (raw === 'week') return 'weeks';
  if (raw === 'working week' || raw === 'working_week') return 'working_weeks';
  return undefined;
}

export function parseSupplierBoq(
  buffer: Buffer,
  boqItems: Array<{ lineCode?: string; description: string; quantity: number; unit: string }>
): { lineItems: ParsedSupplierBoqLine[]; warnings: string[] } {
  const rows = sheetMatrix(buffer);
  const { headerIndex, map } = findHeaderRow(rows);
  const imported: ParsedSupplierBoqLine[] = [];
  const warnings: string[] = [];

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const description = cellText(row[map.description]);
    if (skipDescription(description)) continue;
    const quotedQty = parseNumber(row[map.quotedQty ?? map.qty ?? -1]);
    const originalQty = parseNumber(row[map.originalQty ?? -1]);
    const quantity = quotedQty ?? originalQty;
    if (quantity == null || quantity < 0) {
      warnings.push(`Row ${r + 1}: skipped "${description.slice(0, 60)}" because quoted quantity is missing`);
      continue;
    }
    imported.push({
      lineCode: cellText(row[map.lineCode ?? -1]) || undefined,
      description: description.slice(0, 500),
      quantity,
      originalQuantity: originalQty,
      quantityChangeReason: cellText(row[map.reason ?? -1]) || undefined,
      unit: (cellText(row[map.unit ?? -1]) || 'unit').slice(0, 40),
      unitPrice: parseNumber(row[map.unitPrice ?? -1]) ?? 0,
      notes: cellText(row[map.notes ?? -1]) || undefined,
      deliveryValue: parseNumber(row[map.delivery ?? -1]),
      deliveryMode: parseDeliveryMode(row[map.deliveryMode ?? -1]),
    });
    if (imported.length >= BOQ_MAX_LINES) break;
  }

  if (imported.length === 0) {
    throw new Error('No BOQ lines were found. Include Description and Quantity, then upload again.');
  }

  const byCode = new Map(imported.filter((l) => l.lineCode).map((l) => [l.lineCode!.toUpperCase(), l]));
  const byDesc = new Map(imported.map((l) => [lineKey(l.description), l]));
  const used = new Set<ParsedSupplierBoqLine>();
  const lineItems: ParsedSupplierBoqLine[] = [];
  const codedBoq = withLineCodes(boqItems);

  for (const boq of codedBoq) {
    const match = (boq.lineCode && byCode.get(boq.lineCode.toUpperCase()))
      || byDesc.get(lineKey(boq.description));
    if (!match) {
      warnings.push(`No quote row for ${boq.lineCode}: ${boq.description}`);
      lineItems.push({
        lineCode: boq.lineCode,
        description: boq.description,
        quantity: boq.quantity,
        originalQuantity: boq.quantity,
        unit: boq.unit,
        unitPrice: 0,
      });
      continue;
    }
    used.add(match);
    const originalQuantity = boq.quantity;
    const next: ParsedSupplierBoqLine = {
      ...match,
      lineCode: boq.lineCode,
      description: boq.description,
      unit: match.unit || boq.unit,
      originalQuantity,
    };
    const qtyError = quantityChangeError(next);
    if (qtyError) warnings.push(`${boq.lineCode}: ${qtyError}`);
    lineItems.push(next);
  }

  for (const extra of imported) {
    if (used.has(extra)) continue;
    warnings.push(`Extra line added: ${extra.description}`);
    lineItems.push({
      ...extra,
      originalQuantity: extra.originalQuantity,
    });
  }

  return { lineItems, warnings };
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet['!cols'] = widths.map((wch) => ({ wch }));
}

export function buildCompanyBoqWorkbook(items?: Array<{ lineCode?: string; description: string; quantity: number; unit: string }>): Buffer {
  const wb = XLSX.utils.book_new();
  const header = [...COMPANY_HEADERS];
  const data = (items && items.length > 0)
    ? withLineCodes(items).map((item) => [item.lineCode, item.description, item.quantity, item.unit])
    : [['BOQ-001', '', '', 'unit']];
  const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
  setColumnWidths(sheet, [14, 60, 14, 12]);
  XLSX.utils.book_append_sheet(wb, sheet, BOQ_SHEET_NAME);

  const help = XLSX.utils.aoa_to_sheet([
    ['ProcBid BOQ template'],
    ['Fill Description, Quantity and Unit. Line code is optional — it is assigned automatically if left blank.'],
    ['Save as .xlsx and upload it on the package form. The rows become the structured BOQ suppliers quote against.'],
    ['Suppliers later download a fillable quote sheet with extra columns for unit price and quoted quantity.'],
  ]);
  setColumnWidths(help, [120]);
  XLSX.utils.book_append_sheet(wb, help, 'Instructions');
  return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

export function buildSupplierBoqWorkbook(opts: {
  title: string;
  currency: string;
  boqItems: Array<{ lineCode?: string; description: string; quantity: number; unit: string }>;
  quotes?: ParsedSupplierBoqLine[];
}): Buffer {
  const wb = XLSX.utils.book_new();
  const coded = withLineCodes(opts.boqItems);
  const quoteByCode = new Map((opts.quotes ?? []).filter((q) => q.lineCode).map((q) => [q.lineCode!.toUpperCase(), q]));
  const quoteByDesc = new Map((opts.quotes ?? []).map((q) => [lineKey(q.description), q]));

  const rows: unknown[][] = [[...SUPPLIER_HEADERS]];
  coded.forEach((item, i) => {
    const quote = quoteByCode.get(item.lineCode.toUpperCase()) || quoteByDesc.get(lineKey(item.description));
    const excelRow = i + 2;
    rows.push([
      item.lineCode,
      item.description,
      item.quantity,
      item.unit,
      quote?.quantity ?? item.quantity,
      quote?.unitPrice ?? '',
      { f: `IF(OR(E${excelRow}="",F${excelRow}=""),"",E${excelRow}*F${excelRow})` },
      quote?.quantityChangeReason ?? '',
      quote?.notes ?? '',
      quote?.deliveryValue ?? '',
      quote?.deliveryMode ?? 'days',
    ]);
  });

  const extras = (opts.quotes ?? []).filter((q) => {
    if (q.lineCode && quoteByCode.has(q.lineCode.toUpperCase()) && coded.some((c) => c.lineCode.toUpperCase() === q.lineCode!.toUpperCase())) {
      return false;
    }
    return !coded.some((c) => lineKey(c.description) === lineKey(q.description));
  });
  extras.forEach((quote, n) => {
    const excelRow = coded.length + n + 2;
    rows.push([
      quote.lineCode || '',
      quote.description,
      quote.originalQuantity ?? '',
      quote.unit,
      quote.quantity,
      quote.unitPrice,
      { f: `IF(OR(E${excelRow}="",F${excelRow}=""),"",E${excelRow}*F${excelRow})` },
      quote.quantityChangeReason ?? '',
      quote.notes ?? '',
      quote.deliveryValue ?? '',
      quote.deliveryMode ?? 'days',
    ]);
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: false });
  setColumnWidths(sheet, [12, 55, 14, 10, 14, 14, 14, 36, 28, 14, 16]);
  XLSX.utils.book_append_sheet(wb, sheet, BOQ_SHEET_NAME);

  const help = XLSX.utils.aoa_to_sheet([
    [`Fillable BOQ — ${opts.title}`],
    [`Currency: ${opts.currency}`],
    ['Do not change Line code, Description, Original qty or Unit. Those identify the buyer line.'],
    ['Fill Quoted qty and Unit price. Line total is calculated.'],
    [`If Quoted qty differs from Original qty, Qty change reason is required (at least ${MIN_QTY_CHANGE_REASON} characters).`],
    ['Delivery mode: days, weeks, working_weeks, or date. Delivery value is the number of days/weeks.'],
    ['You may add extra rows at the bottom for items not on the buyer BOQ.'],
    ['Save the file and upload it on Prepare offer. You can still edit lines in the form after import.'],
  ]);
  setColumnWidths(help, [120]);
  XLSX.utils.book_append_sheet(wb, help, 'Instructions');
  return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

export function xlsxResponse(buffer: Buffer, filename: string): NextResponse {
  const safe = filename.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  });
}
