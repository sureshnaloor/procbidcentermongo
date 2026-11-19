import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { ObjectId } from 'mongodb';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';
import { collections } from '@/lib/db';

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_/\\]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  let buffer: Buffer;
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    const body = await req.json().catch(() => ({}));
    if (!body?.fileBase64) {
      return NextResponse.json({ error: 'fileBase64 or multipart file is required' }, { status: 400 });
    }
    const payload = body.fileBase64.includes(',') ? body.fileBase64.split(',')[1]! : body.fileBase64;
    buffer = Buffer.from(payload, 'base64');
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    return NextResponse.json({ error: 'Unable to parse spreadsheet. Ensure it is a valid .xlsx or .csv file.' }, { status: 400 });
  }

  const sheetName = workbook.SheetNames.find(
    (s) => s.toLowerCase().includes('material') || s.toLowerCase().includes('item')
  ) || workbook.SheetNames[0];

  if (!sheetName || !workbook.Sheets[sheetName]) {
    return NextResponse.json({ error: 'Spreadsheet has no readable sheets' }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName]!;
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rawData.length === 0) {
    return NextResponse.json({ error: 'Spreadsheet is empty' }, { status: 400 });
  }

  let headerRowIndex = -1;
  let groupCol = -1;
  let codeCol = -1;
  let descCol = -1;
  let unitCol = -1;
  let typeCol = -1;

  for (let r = 0; r < Math.min(rawData.length, 25); r++) {
    const row = (rawData[r] || []) as unknown[];
    const normalized = row.map(normalizeHeader);

    const cIdx = normalized.findIndex((h) => h === 'item code' || h === 'code' || h === 'material code' || h === 'item no');
    const gIdx = normalized.findIndex((h) => h === 'group name' || h === 'group' || h === 'material group');

    if (cIdx !== -1 && gIdx !== -1) {
      headerRowIndex = r;
      codeCol = cIdx;
      groupCol = gIdx;
      descCol = normalized.findIndex((h) => h.includes('desc') || h.includes('specification') || h.includes('detail'));
      unitCol = normalized.findIndex((h) => h === 'unit' || h === 'uom' || h === 'unit of measure');
      typeCol = normalized.findIndex((h) => h.includes('type') || h.includes('discipline'));
      break;
    }
  }

  if (headerRowIndex === -1 || codeCol === -1 || groupCol === -1) {
    return NextResponse.json({
      error: 'Could not find required "Group Name" and "Item Code" columns in the header row. Please use the official template.',
    }, { status: 400 });
  }

  const { materialServiceItems, materialServiceGroups, materialServiceTypes } = await collections();

  // Pre-load all groups and types for fast in-memory matching
  const allGroups = await materialServiceGroups.find({}).toArray();
  const allTypes = await materialServiceTypes.find({}).toArray();
  const typeMap = new Map(allTypes.map((t) => [t._id!.toString(), t]));

  let totalRows = 0;
  let createdItems = 0;
  let updatedItems = 0;
  const errors: string[] = [];

  const now = new Date();

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const row = (rawData[r] || []) as unknown[];
    const groupName = cellText(row[groupCol]);
    const itemCode = cellText(row[codeCol]);

    if (!groupName && !itemCode) continue; // blank row
    totalRows++;
    const rowNum = r + 1;

    if (!groupName) {
      errors.push(`Row ${rowNum}: Missing Group Name for code "${itemCode}"`);
      continue;
    }
    if (!itemCode) {
      errors.push(`Row ${rowNum}: Missing Item Code for group "${groupName}"`);
      continue;
    }

    const typeHint = typeCol !== -1 ? cellText(row[typeCol]) : '';
    const desc = descCol !== -1 ? cellText(row[descCol]) : '';
    const unit = unitCol !== -1 ? cellText(row[unitCol]) : '';

    // Match group
    const matchedGroups = allGroups.filter((g) => g.name.toLowerCase() === groupName.toLowerCase());
    let targetGroup: typeof allGroups[0] | undefined;

    if (matchedGroups.length === 1) {
      targetGroup = matchedGroups[0];
    } else if (matchedGroups.length > 1) {
      if (typeHint) {
        targetGroup = matchedGroups.find((g) => {
          const pType = typeMap.get(g.typeId.toString());
          return pType && pType.name.toLowerCase() === typeHint.toLowerCase();
        });
      }
      if (!targetGroup) targetGroup = matchedGroups[0];
    }

    if (!targetGroup) {
      errors.push(`Row ${rowNum}: Group "${groupName}" does not exist. Please create or bulk upload the group first.`);
      continue;
    }

    try {
      const existing = await materialServiceItems.findOne({
        groupId: targetGroup._id,
        code: itemCode,
      });

      if (existing) {
        await materialServiceItems.updateOne(
          { _id: existing._id },
          {
            $set: {
              description: desc || existing.description,
              unit: unit || existing.unit,
              updatedAt: now,
            },
          }
        );
        updatedItems++;
      } else {
        await materialServiceItems.insertOne({
          groupId: targetGroup._id!,
          code: itemCode,
          description: desc || undefined,
          unit: unit || undefined,
          createdAt: now,
          updatedAt: now,
        });
        createdItems++;
      }
    } catch (err: any) {
      errors.push(`Row ${rowNum} ("${itemCode}"): ${err?.message || 'Failed to save item'}`);
    }
  }

  return NextResponse.json({
    success: true,
    totalRows,
    createdItems,
    updatedItems,
    errors,
  });
}
