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
    role: 'user' | 'admin' | 'company' | 'vendor';
    isSuperAdmin: boolean;
    userType?: 'company' | 'vendor' | 'admin' | null;
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

export async function ensureProfileForUser(user: {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  role?: string;
  isSuperAdmin?: boolean;
}): Promise<IProfile> {
  const { profiles } = await collections();
  let profile = await profiles.findOne({ userId: new ObjectId(user.id) });
  if (!profile) {
    const now = new Date();
    const isAdmin = user.role === 'admin' || user.isSuperAdmin;
    const userType = isAdmin ? 'admin' : (user.role === 'company' || user.role === 'vendor' ? user.role : 'company');
    const doc: IProfile = {
      userId: new ObjectId(user.id),
      userType: userType as any,
      companyName: isAdmin ? (user.isSuperAdmin ? 'Super Admin' : 'Admin') : (user.displayName || user.username),
      contactPerson: user.displayName || user.username,
      isVerified: isAdmin ? true : false,
      createdAt: now,
      updatedAt: now,
    };
    const res = await profiles.insertOne(doc);
    profile = { ...doc, _id: res.insertedId };
  }
  return profile;
}

export async function requireCompanyProfile(
  session: AuthSession
): Promise<IProfile | NextResponse> {
  const profile = await getProfileForUser(session.user.id);
  if (!profile) return forbidden('Company profile required');
  if (profile.userType !== 'company') return forbidden('EPC Company access required');
  return profile;
}

export async function requireVerifiedCompanyProfile(
  session: AuthSession
): Promise<IProfile | NextResponse> {
  const profile = await requireCompanyProfile(session);
  if (isNextResponse(profile)) return profile;
  if (!profile.isVerified) {
    return forbidden('Account verification required. Your account is pending Superadmin verification before you can create or publish tenders.');
  }
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

export async function requireVerifiedVendorProfile(
  session: AuthSession
): Promise<IProfile | NextResponse> {
  const profile = await requireVendorProfile(session);
  if (isNextResponse(profile)) return profile;
  if (!profile.isVerified) {
    return forbidden('Account verification required. Your account is pending Superadmin verification before you can participate in bids.');
  }
  return profile;
}

export function isNextResponse(v: unknown): v is NextResponse {
  return v instanceof NextResponse;
}

export function isSuperAdminUsername(username: string): boolean {
  const sa = process.env.SUPERADMIN_USERNAME ?? '';
  return sa !== '' && username === sa;
}
