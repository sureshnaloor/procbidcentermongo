import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { isSafeStoredName, getTenderUploadPath, mimeForExtension } from '@/lib/tender-files';
import path from 'path';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!isSafeStoredName(filename)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const filePath = getTenderUploadPath(filename);
  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const data = await readFile(filePath);
  const ext = path.extname(filename).slice(1);
  return new NextResponse(data, {
    headers: { 'Content-Type': mimeForExtension(ext), 'Cache-Control': 'private, max-age=3600' },
  });
}
