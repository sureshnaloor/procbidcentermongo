import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { collections } from '@/lib/db';

const registerSchema = z.object({
  username: z.string().min(3).max(255),
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
  userType: z.enum(['company', 'vendor']),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const { users, profiles } = await collections();

    const existingUser = await users.findOne({ $or: [{ username: data.username }, { email: data.email }] });
    if (existingUser) {
      const field = existingUser.username === data.username ? 'Username' : 'Email';
      return NextResponse.json({ error: `${field} already taken` }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const now = new Date();

    const result = await users.insertOne({
      username: data.username,
      email: data.email,
      passwordHash,
      displayName: data.displayName || data.username,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    });

    await profiles.insertOne({
      userId: result.insertedId,
      userType: data.userType,
      companyName: data.companyName || data.displayName || data.username,
      contactPerson: data.contactPerson,
      phone: data.phone,
      country: data.country,
      city: data.city,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? 'Validation error' }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
