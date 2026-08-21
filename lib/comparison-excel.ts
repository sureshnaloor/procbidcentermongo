import * as XLSX from 'xlsx';
import { NextResponse } from 'next/server';
import { comparisonColumns, extraBidLines, findClauseResponse, findMatchingLine, lineDelivery, lineOtherData, clauseStatusLabel } from '@/lib/comparison';
import { CLAUSE_KIND_LABELS, type ClauseKindConst } from '@/lib/constants';

function names(list: { name: string }[]) {
  return list.length ? list.map((item) => item.name).join(', ') : '—';
}

function clauseTitle(clause: any) {
  if (clause.title) return clause.title;
  return CLAUSE_KIND_LABELS[(clause.kind as ClauseKindConst) ?? 'custom'] ?? clause.kind;
}

export function buildComparisonWorkbook(data: any, includeOriginal: boolean): Buffer {
  const bids = comparisonColumns(data.bids ?? [], includeOriginal);
  const tender = data.tender;
  const currency = tender.currency || 'USD';
  const boqItems: any[] = tender.boqItems ?? [];
  const extraRows = extraBidLines(
    bids.flatMap((bid: any) => bid.lineItems ?? []),
    boqItems.map((item: any) => item.description)
  );
  const extraKeys = [...new Set(extraRows.map((item: any) => item.description))];
  const lineRows = [
    ...boqItems.map((item: any) => ({
      lineCode: item.lineCode,
      description: item.description,
      originalQuantity: item.quantity,
      unit: item.unit,
    })),
    ...extraKeys
      .filter((desc) => !boqItems.some((item: any) => item.description === desc))
      .map((description) => {
        const sample = extraRows.find((item: any) => item.description === description);
        return {
          lineCode: sample?.lineCode,
          description,
          originalQuantity: sample?.originalQuantity ?? sample?.quantity,
          unit: sample?.unit || '',
        };
      }),
  ];

  const wb = XLSX.utils.book_new();
  const summary = [
    ['Comparison statement', tender.title],
    ['Company', data.company?.companyName || ''],
    ['Location', tender.location || ''],
    ['Type', tender.type || ''],
    ['Status', tender.status || ''],
    ['Currency', currency],
    ['Estimate', tender.estimatedValue ?? ''],
    [],
    ['Invited', names(data.participation?.invited ?? [])],
    ['Quoted', names(data.participation?.quoted ?? [])],
    ['Did not quote', names(data.participation?.notQuoted ?? [])],
    ['Rejected', names(data.participation?.rejected ?? [])],
    [],
    ['Supplier', 'Status', 'Offer total', 'Validity days', 'Currency'],
    ...bids.map((bid: any) => [
      bid.vendor?.companyName || 'Supplier',
      bid.status,
      bid.totalPrice ?? '',
      bid.validityDays ?? '',
      bid.currency || currency,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

  const header = ['Line', 'Description', 'Original qty', 'Unit', ...bids.flatMap((bid: any) => {
    const name = bid.vendor?.companyName || 'Supplier';
    return [`${name} qty`, `${name} rate`, `${name} value`, `${name} delivery`, `${name} notes`];
  })];
  const lines = lineRows.map((row, idx) => {
    const cells: unknown[] = [
      idx + 1,
      row.description,
      row.originalQuantity ?? '',
      row.unit || '',
    ];
    for (const bid of bids) {
      const line = findMatchingLine(bid.lineItems, row.description, row.lineCode);
      if (!line) {
        cells.push('Not quoted', '', '', '', '');
        continue;
      }
      cells.push(
        line.quantity ?? '',
        line.unitPrice ?? '',
        line.totalPrice ?? (Number(line.quantity) * Number(line.unitPrice || 0)),
        lineDelivery(line) || '',
        lineOtherData(line).join('; ')
      );
    }
    return cells;
  });
  const totals = ['', 'Offer total', '', '', ...bids.flatMap((bid: any) => ['' , '', bid.totalPrice ?? '', '', ''])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...lines, totals]), 'Line items');

  const terms = (tender.clauses ?? []).filter((c: any) => c.kind !== 'payment');
  const termHeader = ['Clause', ...bids.map((bid: any) => bid.vendor?.companyName || 'Supplier')];
  const termRows = terms.map((clause: any) => [
    clauseTitle(clause),
    ...bids.map((bid: any) => {
      const response = findClauseResponse(bid, clause);
      return clauseStatusLabel(response);
    }),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([termHeader, ...termRows]), 'Terms');

  const remarkRows = [
    ['Level', 'Name', 'Designation', 'Remarks'],
    ...(data.remarks ?? []).map((r: any) => [r.level, r.userName, r.designation, r.remarks]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(remarkRows), 'Company remarks');

  return Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}

export function comparisonExcelResponse(buffer: Buffer, filename: string) {
  const safe = filename.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safe}"`,
      'Cache-Control': 'no-store',
    },
  });
}
