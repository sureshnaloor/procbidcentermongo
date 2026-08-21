import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { collections } from '@/lib/db';
import { requireAdmin, isNextResponse, isSuperAdminUsername } from '@/lib/auth-helpers';

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  const { users } = await collections();
  const admins = await users.find({ role: 'admin' }).toArray();
  return NextResponse.json(admins.map((a) => ({ id: a._id, username: a.username, email: a.email, displayName: a.displayName, isSuperAdmin: isSuperAdminUsername(a.username), createdAt: a.createdAt })));
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;
  if (!auth.user.isSuperAdmin) return NextResponse.json({ error: 'Only super-admin can create admins' }, { status: 403 });

  const body = await req.json();
  const data = z.object({
    username: z.string().min(3).max(255),
    email: z.string().email(),
    password: z.string().min(8),
    displayName: z.string().optional(),
  }).parse(body);

  const { users } = await collections();
  const existing = await users.findOne({ $or: [{ username: data.username }, { email: data.email }] });
  if (existing) return NextResponse.json({ error: 'Username or email already taken' }, { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, 12);
  const now = new Date();
  const result = await users.insertOne({
    username: data.username,
    email: data.email,
    passwordHash,
    displayName: data.displayName || data.username,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
    });
  const admin = await users.findOne({ _id: result.insertedId });
  return NextResponse.json({ id: admin!._id, username: admin!.username, email: admin!.email, displayName: admin!.displayName, isSuperAdmin: false }, { status: 201 });
}
