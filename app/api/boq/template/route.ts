import { NextResponse } from 'next/server';
import { requireAuth, isNextResponse, requireCompanyProfile } from '@/lib/auth-helpers';
import { buildCompanyBoqWorkbook, xlsxResponse } from '@/lib/boq-sheet';

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const profile = await requireCompanyProfile(auth);
  if (isNextResponse(profile)) return profile;

  return xlsxResponse(buildCompanyBoqWorkbook(), 'ProcBid-BOQ-template.xlsx');
}
