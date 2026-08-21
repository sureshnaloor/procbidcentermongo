import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAuth, isNextResponse, requireAdmin } from '@/lib/auth-helpers';
import { ObjectId } from 'mongodb';
import { ensureDefaults } from '@/lib/seed-defaults';
import { CHANNEL_KIND_ORDER } from '@/lib/constants';
import type { ChannelKind } from '@/lib/types';

function slugify(name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `channel-${Date.now()}`;
}

function kindOrder(kind: string): number {
  const index = (CHANNEL_KIND_ORDER as readonly string[]).indexOf(kind);
  return index === -1 ? 99 : index;
}

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  await ensureDefaults();
  const { messageChannels } = await collections();
  const channels = await messageChannels.find({}).toArray();
  channels.sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name));
  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const body = await req.json();
  const data = z.object({
    name: z.string().min(1).max(120),
    description: z.string().optional(),
    kind: z.enum(['information', 'announcement', 'alert', 'general']).default('general'),
  }).parse(body);

  const { messageChannels } = await collections();
  const slugBase = slugify(data.name);
  let slug = slugBase;
  let attempt = 1;
  while (await messageChannels.findOne({ slug })) {
    attempt++;
    slug = `${slugBase}-${attempt}`;
  }

  const result = await messageChannels.insertOne({
    name: data.name.trim(),
    slug,
    description: data.description?.trim() || undefined,
    kind: data.kind as ChannelKind,
    isSystem: false,
    createdByUserId: new ObjectId(auth.user.id),
    createdAt: new Date(),
  });
  return NextResponse.json(await messageChannels.findOne({ _id: result.insertedId }), { status: 201 });
}
