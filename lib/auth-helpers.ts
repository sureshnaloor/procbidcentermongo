import { auth } from './auth';
import { collections } from './db';
import { ObjectId } from 'mongodb';
import type { IProfile } from './types';
import { NextResponse } from 'next/server';

export type AuthSession = {
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    role: 'user' | 'admin';
    isSuperAdmin: boolean;
    userType?: 'company' | 'vendor' | null;
  };
};

export function unauthorized(msg = 'Authentication required') {
  return NextResponse.json({ error: msg }, { status: 401 });
}

export function forbidden(msg = 'Access denied') {
  return NextResponse.json({ error: msg }, { status: 403 });
}

export function notFound(msg = 'Not found') {
  return NextResponse.json({ error: msg }, { status: 404 });
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await auth();
  if (!session?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return session as any;
}

export async function requireAuth(): Promise<AuthSession | NextResponse> {
  const session = await getSession();
  if (!session) return unauthorized();
  return session;
}

export async function requireAdmin(): Promise<AuthSession | NextResponse> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== 'admin') return forbidden('Admin access required');
  return session;
}

export async function requireSuperAdmin(): Promise<AuthSession | NextResponse> {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!session.user.isSuperAdmin) return forbidden('Super-admin access required');
  return session;
}

export async function getProfileForUser(userId: string): Promise<IProfile | null> {
  const { profiles } = await collections();
  return profiles.findOne({ userId: new ObjectId(userId) }) as Promise<IProfile | null>;
}

export async function requireCompanyProfile(
  session: AuthSession
): Promise<IProfile | NextResponse> {
  const profile = await getProfileForUser(session.user.id);
  if (!profile) return forbidden('Company profile required');
  if (profile.userType !== 'company') return forbidden('EPC Company access required');
  return profile;
}

export async function requireVendorProfile(
  session: AuthSession
): Promise<IProfile | NextResponse> {
  const profile = await getProfileForUser(session.user.id);
  if (!profile) return forbidden('Vendor profile required');
  if (profile.userType !== 'vendor') return forbidden('Supplier/Vendor access required');
  return profile;
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

export function isSuperAdminUsername(username: string): boolean {
  const sa = process.env.SUPERADMIN_USERNAME ?? '';
  return sa !== '' && username === sa;
}
