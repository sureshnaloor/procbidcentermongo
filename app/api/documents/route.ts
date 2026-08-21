import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { saveProfileDocumentFile } from '@/lib/profile-files';
import { PUBLIC_DOCUMENT_CATEGORIES } from '@/lib/constants';

const categoryValues = PUBLIC_DOCUMENT_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const own = await getProfileForUser(auth.user.id);
  const { documents } = await collections();
  const profileId = req.nextUrl.searchParams.get('profileId');

  if (profileId && ObjectId.isValid(profileId)) {
    const isOwn = own?._id?.toString() === profileId;
    if (isOwn) {
      return NextResponse.json(await documents.find({ profileId: new ObjectId(profileId) }).sort({ createdAt: -1 }).toArray());
    }
    return NextResponse.json(
      await documents.find({ profileId: new ObjectId(profileId), visibility: 'public' }).sort({ createdAt: -1 }).toArray()
    );
  }

  if (!own) return NextResponse.json([]);
  return NextResponse.json(await documents.find({ profileId: own._id! }).sort({ createdAt: -1 }).toArray());
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await getProfileForUser(auth.user.id);
  if (!profile) return NextResponse.json({ error: 'Profile required' }, { status: 403 });

  const body = await req.json();
  const data = z.object({
    name: z.string().min(1).optional(),
    fileName: z.string().min(1).optional(),
    fileUrl: z.string().url().optional(),
    fileBase64: z.string().optional(),
    fileType: z.string().optional(),
    fileSize: z.number().optional(),
    visibility: z.enum(['public', 'private', 'selected']).default('public'),
    category: z.enum(categoryValues).optional(),
    description: z.string().optional(),
    grantedToProfileIds: z.array(z.string()).optional(),
  }).parse(body);

  let fileUrl = data.fileUrl;
  let storedName: string | undefined;
  let fileSize = data.fileSize;
  let fileType = data.fileType;
  const displayName = data.name || data.fileName;

  if (data.fileBase64 && (data.fileName || data.name)) {
    const stored = await saveProfileDocumentFile(data.fileName || data.name || 'document', data.fileBase64);
    fileUrl = stored.fileUrl;
    storedName = stored.storedName;
    fileSize = stored.fileSize;
    fileType = data.fileType || stored.ext;
  }

  if (!fileUrl || !displayName) {
    return NextResponse.json({ error: 'A file is required' }, { status: 400 });
  }

  const { documents } = await collections();
  const now = new Date();
  const result = await documents.insertOne({
    profileId: profile._id!,
    name: displayName,
    fileUrl,
    storedName,
    fileType,
    fileSize,
    visibility: data.visibility,
    category: data.category,
    description: data.description,
    grantedToProfileIds: (data.grantedToProfileIds ?? []).map((id) => new ObjectId(id)),
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json(await documents.findOne({ _id: result.insertedId }), { status: 201 });
}
