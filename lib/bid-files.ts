import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { isSafeStoredName, mimeForExtension } from '@/lib/tender-files';

const BID_FILE_MAX_BYTES = 20 * 1024 * 1024;
const SIGNATURE_ALLOWED = new Set(['pdf', 'p7s', 'p7b', 'sig']);
const OFFER_DOC_ALLOWED = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp']);
const WORKBOOK_ALLOWED = new Set(['xlsx', 'xls']);

export const BID_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'bids');

function decodeBase64(fileBase64: string): Buffer {
  const payload = fileBase64.includes(',') ? fileBase64.split(',')[1]! : fileBase64;
  return Buffer.from(payload, 'base64');
}

export function getBidUploadPath(storedName: string): string {
  return path.join(BID_UPLOAD_DIR, storedName);
}

export async function saveBidSignatureFile(
  fileName: string,
  fileBase64: string
): Promise<{ storedName: string; fileUrl: string; fileSize: number; ext: string }> {
  const buffer = decodeBase64(fileBase64);
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (!SIGNATURE_ALLOWED.has(ext)) {
    throw new Error('Attach a DSC-signed PDF or PKCS#7 signature file (.pdf, .p7s, .p7b, .sig)');
  }
  if (buffer.byteLength > BID_FILE_MAX_BYTES) {
    throw new Error('Signed file exceeds the 20 MB limit');
  }
  const storedName = `${nanoid(16)}.${ext}`;
  await mkdir(BID_UPLOAD_DIR, { recursive: true });
  await writeFile(getBidUploadPath(storedName), buffer);
  return {
    storedName,
    fileUrl: `/api/files/bids/${storedName}`,
    fileSize: buffer.byteLength,
    ext,
  };
}

export async function deleteBidSignatureFile(storedName: string): Promise<void> {
  if (!isSafeStoredName(storedName)) return;
  try {
    await unlink(getBidUploadPath(storedName));
  } catch {
    // File may already be gone
  }
}

export async function saveBidOfferDocumentFile(
  fileName: string,
  fileBase64: string
): Promise<{ storedName: string; fileUrl: string; fileSize: number; ext: string }> {
  const buffer = decodeBase64(fileBase64);
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (!OFFER_DOC_ALLOWED.has(ext)) {
    throw new Error('Upload a signed PDF or scan (.pdf, .jpg, .png)');
  }
  if (buffer.byteLength > BID_FILE_MAX_BYTES) {
    throw new Error('Signed offer exceeds the 20 MB limit');
  }
  const storedName = `${nanoid(16)}.${ext}`;
  await mkdir(BID_UPLOAD_DIR, { recursive: true });
  await writeFile(getBidUploadPath(storedName), buffer);
  return {
    storedName,
    fileUrl: `/api/files/bids/${storedName}`,
    fileSize: buffer.byteLength,
    ext,
  };
}

export async function saveBidWorkbookFile(
  fileName: string,
  fileBase64: string
): Promise<{ storedName: string; fileUrl: string; fileSize: number; ext: string }> {
  const buffer = decodeBase64(fileBase64);
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (!WORKBOOK_ALLOWED.has(ext)) {
    throw new Error('Upload the filled Excel workbook (.xlsx, .xls)');
  }
  if (buffer.byteLength > BID_FILE_MAX_BYTES) {
    throw new Error('Workbook exceeds the 20 MB limit');
  }
  const storedName = `${nanoid(16)}.${ext}`;
  await mkdir(BID_UPLOAD_DIR, { recursive: true });
  await writeFile(getBidUploadPath(storedName), buffer);
  return {
    storedName,
    fileUrl: `/api/files/bids/${storedName}`,
    fileSize: buffer.byteLength,
    ext,
  };
}

export { isSafeStoredName, mimeForExtension };