import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ ok: true, db: db.databaseName });
  } catch (err) {
    const message = err instanceof Error ? err.message.split('\n')[0] : 'unknown';
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}
