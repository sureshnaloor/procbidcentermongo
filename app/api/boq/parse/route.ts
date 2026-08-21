import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isNextResponse } from '@/lib/auth-helpers';
import { decodeBase64File, parseCompanyBoq, parseSupplierBoq } from '@/lib/boq-sheet';
import { collections } from '@/lib/db';
import { ObjectId } from 'mongodb';
import { fileExtension } from '@/lib/tender-files';

const bodySchema = z.object({
  mode: z.enum(['company', 'supplier']),
  fileName: z.string().min(1).max(255),
  fileBase64: z.string().min(1),
  tenderId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  let data: z.infer<typeof bodySchema>;
  try {
    data = bodySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || 'Invalid file payload' }, { status: 400 });
    }
    throw err;
  }

  const ext = fileExtension(data.fileName);
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    return NextResponse.json({ error: 'Upload an Excel or CSV file (.xlsx, .xls, .csv)' }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = decodeBase64File(data.fileBase64);
  } catch {
    return NextResponse.json({ error: 'Could not read the uploaded file' }, { status: 400 });
  }
  if (buffer.byteLength > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds the 20 MB limit' }, { status: 400 });
  }

  try {
    if (data.mode === 'company') {
      const parsed = parseCompanyBoq(buffer);
      return NextResponse.json(parsed);
    }

    if (!data.tenderId || !ObjectId.isValid(data.tenderId)) {
      return NextResponse.json({ error: 'tenderId is required to import a supplier BOQ' }, { status: 400 });
    }
    const { tenders } = await collections();
    const tender = await tenders.findOne({ _id: new ObjectId(data.tenderId) });
    if (!tender) return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    const parsed = parseSupplierBoq(buffer, tender.boqItems ?? []);
    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not parse the BOQ file' }, { status: 400 });
  }
}
