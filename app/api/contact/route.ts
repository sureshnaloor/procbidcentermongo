import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { collections } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    subject: z.string().min(1),
    message: z.string().min(1),
  }).parse(body);
  await (await collections()).contactSubmissions.insertOne({ ...data, createdAt: new Date() });
  return NextResponse.json({ success: true }, { status: 201 });
}
