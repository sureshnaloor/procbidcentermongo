import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isNextResponse, getProfileForUser } from '@/lib/auth-helpers';
import { loadComparisonStatement } from '@/lib/comparison-load';
import { buildComparisonWorkbook, comparisonExcelResponse } from '@/lib/comparison-excel';

export async function GET(req: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;
  const { tenderId } = await params;
  const profile = await getProfileForUser(auth.user.id);
  const result = await loadComparisonStatement(tenderId, profile, auth.user.role === 'admin');
  if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
  const includeOriginal = req.nextUrl.searchParams.get('includeOriginal') === '1';
  const buffer = buildComparisonWorkbook(result.data, includeOriginal);
  const title = String(result.data.tender.title || 'comparison').replace(/[^\w.-]+/g, '-').slice(0, 60);
  return comparisonExcelResponse(buffer, `${title}-comparison.xlsx`);
}
