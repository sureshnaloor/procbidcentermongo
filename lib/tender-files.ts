import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

const TENDER_FILE_EXTENSIONS = [
  'pdf','doc','docx','xls','xlsx','ppt','pptx','dwg','dxf',
  'png','jpg','jpeg','gif','webp','zip','rar','7z','txt','csv','tif','tiff'
];
const TENDER_FILE_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
export const TENDER_FILE_MAX_COUNT = 10;
export const TENDER_FILE_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set<string>(TENDER_FILE_EXTENSIONS);

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  dwg: 'application/acad',
  dxf: 'image/vnd.dxf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  txt: 'text/plain',
  csv: 'text/csv',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

export const TENDER_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'tenders');

export function fileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase().replace('.', '');
}

export function mimeForExtension(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? 'application/octet-stream';
}

export function isSafeStoredName(filename: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(filename);
}

export function getTenderUploadPath(storedName: string): string {
  return path.join(TENDER_UPLOAD_DIR, storedName);
}

function decodeBase64(fileBase64: string): Buffer {
  const payload = fileBase64.includes(',') ? fileBase64.split(',')[1]! : fileBase64;
  return Buffer.from(payload, 'base64');
}

export function validateTenderFile(fileName: string, size: number): string {
  const ext = fileExtension(fileName);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`File type ".${ext || 'unknown'}" is not allowed for "${fileName}"`);
  }
  if (size > TENDER_FILE_MAX_BYTES) {
    throw new Error(`"${fileName}" exceeds the ${Math.round(TENDER_FILE_MAX_BYTES / (1024 * 1024))} MB limit`);
  }
  return ext;
}

export async function saveTenderDocumentFile(
  fileName: string,
  fileBase64: string
): Promise<{ storedName: string; fileUrl: string; fileSize: number; ext: string }> {
  const buffer = decodeBase64(fileBase64);
  const ext = validateTenderFile(fileName, buffer.byteLength);
  const storedName = `${nanoid(16)}.${ext}`;

  await mkdir(TENDER_UPLOAD_DIR, { recursive: true });
  await writeFile(getTenderUploadPath(storedName), buffer);

  return {
    storedName,
    fileUrl: `/api/files/tenders/${storedName}`,
    fileSize: buffer.byteLength,
    ext,
  };
}

export async function deleteTenderDocumentFile(storedName: string): Promise<void> {
  if (!isSafeStoredName(storedName)) return;
  try {
    await unlink(getTenderUploadPath(storedName));
  } catch {
    // File may already be gone
  }
}
