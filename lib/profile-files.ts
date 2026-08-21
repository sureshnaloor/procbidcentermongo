import { mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import {
  fileExtension,
  isSafeStoredName,
  mimeForExtension,
  validateTenderFile,
} from '@/lib/tender-files';

export const PROFILE_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'profiles');

function decodeBase64(fileBase64: string): Buffer {
  const payload = fileBase64.includes(',') ? fileBase64.split(',')[1]! : fileBase64;
  return Buffer.from(payload, 'base64');
}

export function getProfileUploadPath(storedName: string): string {
  return path.join(PROFILE_UPLOAD_DIR, storedName);
}

export async function saveProfileDocumentFile(
  fileName: string,
  fileBase64: string
): Promise<{ storedName: string; fileUrl: string; fileSize: number; ext: string }> {
  const buffer = decodeBase64(fileBase64);
  const ext = validateTenderFile(fileName, buffer.byteLength);
  const storedName = `${nanoid(16)}.${ext}`;

  await mkdir(PROFILE_UPLOAD_DIR, { recursive: true });
  await writeFile(getProfileUploadPath(storedName), buffer);

  return {
    storedName,
    fileUrl: `/api/files/profiles/${storedName}`,
    fileSize: buffer.byteLength,
    ext,
  };
}

export async function deleteProfileDocumentFile(storedName: string): Promise<void> {
  if (!isSafeStoredName(storedName)) return;
  try {
    await unlink(getProfileUploadPath(storedName));
  } catch {
    // File may already be gone
  }
}

export { fileExtension, isSafeStoredName, mimeForExtension };
