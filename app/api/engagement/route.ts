import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { collections } from '@/lib/db';
import { requireAuth, getProfileForUser, isNextResponse } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const userProfile = await getProfileForUser(auth.user.id);
  if (!userProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const searchParams = req.nextUrl.searchParams;
  let companyId = searchParams.get('companyId');
  let vendorId = searchParams.get('vendorId');

  // Enforce role-based access
  if (userProfile.userType === 'company') {
    companyId = userProfile._id!.toString();
    if (!vendorId || !ObjectId.isValid(vendorId)) {
      return NextResponse.json({ error: 'Valid vendorId query parameter is required' }, { status: 400 });
    }
  } else if (userProfile.userType === 'vendor') {
    vendorId = userProfile._id!.toString();
    if (!companyId || !ObjectId.isValid(companyId)) {
      return NextResponse.json({ error: 'Valid companyId query parameter is required' }, { status: 400 });
    }
  } else if (auth.user.role === 'admin' || auth.user.isSuperAdmin) {
    if (!companyId || !ObjectId.isValid(companyId) || !vendorId || !ObjectId.isValid(vendorId)) {
      return NextResponse.json({ error: 'Both companyId and vendorId are required for administrators' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { profiles, tenders, bids, tenderInvites, vendorEvaluations } = await collections();

  const companyOid = new ObjectId(companyId);
  const vendorOid = new ObjectId(vendorId);

  const [companyProfile, vendorProfile] = await Promise.all([
    profiles.findOne({ _id: companyOid }),
    profiles.findOne({ _id: vendorOid }),
  ]);

  if (!companyProfile || !vendorProfile) {
    return NextResponse.json({ error: 'Company or Vendor profile not found' }, { status: 404 });
  }

  // Find all tenders for this company
  const companyTenders = await tenders.find({ companyProfileId: companyOid }).sort({ createdAt: -1 }).toArray();
  const tenderIds = companyTenders.map((t) => t._id!);

  // Find bids submitted by this vendor for this company's tenders
  const vendorBids = tenderIds.length
    ? await bids.find({ vendorProfileId: vendorOid, tenderId: { $in: tenderIds } }).sort({ createdAt: -1 }).toArray()
    : [];

  // Find invites for this vendor on this company's tenders
  const invites = tenderIds.length
    ? await tenderInvites.find({ vendorProfileId: vendorOid, tenderId: { $in: tenderIds } }).toArray()
    : [];

  // Find evaluations between this company and vendor
  const evaluations = await vendorEvaluations
    .find({ companyProfileId: companyOid, vendorProfileId: vendorOid })
    .sort({ createdAt: -1 })
    .toArray();

  const tenderMap = new Map(companyTenders.map((t) => [t._id!.toString(), t]));
  const inviteMap = new Map(invites.map((i) => [i.tenderId.toString(), i]));

  // Build list of all engaged tenders
  const engagedTenderIdSet = new Set<string>();
  vendorBids.forEach((b) => engagedTenderIdSet.add(b.tenderId.toString()));
  invites.forEach((i) => engagedTenderIdSet.add(i.tenderId.toString()));

  const engagements = Array.from(engagedTenderIdSet).map((tId) => {
    const t = tenderMap.get(tId);
    const b = vendorBids.find((bid) => bid.tenderId.toString() === tId);
    const inv = inviteMap.get(tId);

    const isAwarded = t?.awardedToVendorId?.toString() === vendorOid.toString() || b?.status === 'accepted';

    return {
      tenderId: tId,
      tenderTitle: t?.title || 'Untitled Tender',
      tenderType: t?.type || 'rfq',
      tenderStatus: t?.status || 'published',
      estimatedValue: t?.estimatedValue,
      currency: t?.currency || 'USD',
      bidDeadline: t?.bidDeadline,
      deliveryDeadline: t?.deliveryDeadline,
      isAwardedToThisVendor: isAwarded,
      awardedAt: t?.awardedAt,
      invite: inv ? { status: inv.status, createdAt: inv.createdAt } : null,
      bid: b
        ? {
            bidId: b._id,
            status: b.status,
            totalPrice: b.totalPrice ?? 0,
            currency: b.currency || t?.currency || 'USD',
            validityDays: b.validityDays,
            submittedAt: b.submittedAt,
            notes: b.notes,
            discountType: b.discountType,
            discountValue: b.discountValue,
            vatPercent: b.vatPercent,
            otherCharges: b.otherCharges || [],
            lineItemsCount: (b.lineItems || []).length,
            lineItemsPreview: (b.lineItems || []).slice(0, 5).map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unit: l.unit,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice,
            })),
          }
        : null,
    };
  });

  // Sort engagements with most recent first
  engagements.sort((a, b) => {
    const timeA = a.bid?.submittedAt ? new Date(a.bid.submittedAt).getTime() : 0;
    const timeB = b.bid?.submittedAt ? new Date(b.bid.submittedAt).getTime() : 0;
    return timeB - timeA;
  });

  // Calculate statistics
  const totalBidsSubmitted = engagements.filter((e) => e.bid !== null).length;
  const totalAwarded = engagements.filter((e) => e.isAwardedToThisVendor).length;
  const totalQuotedValue = engagements.reduce((sum, e) => sum + (e.bid?.totalPrice || 0), 0);
  const totalAwardedValue = engagements
    .filter((e) => e.isAwardedToThisVendor)
    .reduce((sum, e) => sum + (e.bid?.totalPrice || 0), 0);

  const avgScore = evaluations.length
    ? Math.round(evaluations.reduce((sum, ev) => sum + ev.overallScore, 0) / evaluations.length)
    : null;
  const latestEvaluation = evaluations[0] || null;

  return NextResponse.json({
    company: {
      _id: companyProfile._id,
      companyName: companyProfile.companyName || 'Company',
      city: companyProfile.city,
      country: companyProfile.country,
      logoUrl: companyProfile.logoUrl,
    },
    vendor: {
      _id: vendorProfile._id,
      companyName: vendorProfile.companyName || 'Supplier',
      city: vendorProfile.city,
      country: vendorProfile.country,
      isVerified: vendorProfile.isVerified,
      logoUrl: vendorProfile.logoUrl,
    },
    stats: {
      totalEngagements: engagements.length,
      totalBidsSubmitted,
      totalAwarded,
      winRatePercent: totalBidsSubmitted > 0 ? Math.round((totalAwarded / totalBidsSubmitted) * 100) : 0,
      totalQuotedValue,
      totalAwardedValue,
      evaluationCount: evaluations.length,
      averageScore: avgScore,
      latestGrade: latestEvaluation?.grade || null,
      latestRecommendation: latestEvaluation?.recommendation || null,
    },
    engagements,
    evaluations,
  });
}
