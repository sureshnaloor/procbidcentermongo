import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAdmin, isNextResponse } from '@/lib/auth-helpers';
import { collections } from '@/lib/db';
import { getOrCreateTaxonomyType } from '@/lib/seed-defaults';

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

  const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('group')) || workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) {
    return NextResponse.json({ error: 'Spreadsheet has no readable sheets' }, { status: 400 });
  }

  const sheet = workbook.Sheets[sheetName]!;
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rawData.length === 0) {
    return NextResponse.json({ error: 'Spreadsheet is empty' }, { status: 400 });
  }

  // Find header row
  let headerRowIndex = -1;
  let categoryCol = -1;
  let typeCol = -1;
  let groupCol = -1;
  let descCol = -1;

  for (let r = 0; r < Math.min(rawData.length, 25); r++) {
    const row = (rawData[r] || []) as unknown[];
    const normalized = row.map(normalizeHeader);

    const gIdx = normalized.findIndex((h) => h === 'group name' || h === 'group' || h === 'sub discipline' || h === 'material group');
    if (gIdx !== -1) {
      headerRowIndex = r;
      groupCol = gIdx;
      typeCol = normalized.findIndex((h) => h === 'type name' || h === 'type' || h === 'material type' || h === 'service type' || h === 'discipline');
      categoryCol = normalized.findIndex((h) => h === 'category' || h === 'type category' || h === 'kind');
      descCol = normalized.findIndex((h) => h.includes('desc') || h.includes('remark') || h.includes('note'));
      break;
    }
  }

  if (headerRowIndex === -1 || groupCol === -1) {
    return NextResponse.json({
      error: 'Could not find required "Group Name" column in the header row. Please use the official template.',
    }, { status: 400 });
  }

  const { materialServiceGroups, materialServiceTypes } = await collections();

  let totalRows = 0;
  let createdTypes = 0;
  let createdGroups = 0;
  let updatedGroups = 0;
  const errors: string[] = [];
  const typeCache = new Map<string, any>();

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const row = (rawData[r] || []) as unknown[];
    const groupName = cellText(row[groupCol]);
    if (!groupName) continue; // skip blank rows

    totalRows++;
    const rowNum = r + 1;

    let categoryRaw = categoryCol !== -1 ? cellText(row[categoryCol]).toLowerCase() : 'material';
    let category: 'material' | 'service' = 'material';
    if (categoryRaw.startsWith('serv')) category = 'service';

    let typeName = typeCol !== -1 ? cellText(row[typeCol]) : '';
    if (!typeName) {
      typeName = category === 'material' ? 'General Materials' : 'General Services';
    }

    const desc = descCol !== -1 ? cellText(row[descCol]) : '';

    try {
      const typeKey = `${category}:::${typeName.toLowerCase()}`;
      let typeDoc = typeCache.get(typeKey);
      if (!typeDoc) {
        const existingType = await materialServiceTypes.findOne({
          category,
          name: { $regex: new RegExp(`^${typeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });

        if (existingType) {
          typeDoc = existingType;
        } else {
          typeDoc = await getOrCreateTaxonomyType(category, typeName);
          createdTypes++;
        }
        typeCache.set(typeKey, typeDoc);
      }

      // Check if group exists under this type
      const existingGroup = await materialServiceGroups.findOne({
        typeId: typeDoc._id,
        name: { $regex: new RegExp(`^${groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      if (existingGroup) {
        if (desc && desc !== existingGroup.description) {
          await materialServiceGroups.updateOne({ _id: existingGroup._id }, { $set: { description: desc } });
          updatedGroups++;
        }
      } else {
        await materialServiceGroups.insertOne({
          typeId: typeDoc._id,
          name: groupName,
          description: desc || undefined,
          createdAt: new Date(),
        });
        createdGroups++;
      }
    } catch (err: any) {
      errors.push(`Row ${rowNum} ("${groupName}"): ${err?.message || 'Failed to process'}`);
    }
  }

  return NextResponse.json({
    success: true,
    totalRows,
    createdTypes,
    createdGroups,
    updatedGroups,
    errors,
  });
}
