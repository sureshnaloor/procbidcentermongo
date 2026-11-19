"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Building2,
  Shield,
  FileText,
  DollarSign,
  Trophy,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Star,
  Award,
  ThumbsUp,
  AlertTriangle,
  User,
  Loader2,
  Sparkles,
} from "lucide-react";

const CRITERIA = [
  { key: "quality", label: "Quality & Compliance", hint: "Material specifications, inspection reports, zero-defect adherence" },
  { key: "delivery", label: "On-Time Delivery", hint: "Schedule adherence, lead time reliability, logistics handling" },
  { key: "pricing", label: "Pricing Competitiveness", hint: "Commercial transparency, discounts, quotation accuracy" },
  { key: "technical", label: "Technical Capability", hint: "Engineering expertise, submittals, documentation completeness" },
  { key: "responsiveness", label: "Responsiveness & Agility", hint: "Query turnaround, proactive communication, problem resolution" },
] as const;

export default function CompanyBidsAndEvalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = use(params);
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});

  // Fetch Company Profile
  const { data: company, isLoading: loadingCompany } = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => fetch(`/api/profile/${companyId}`).then((r) => r.json()),
  });

  // Fetch Engagement Data (bids + evaluations with this company)
  const { data: engagementData, isLoading: loadingEngagement } = useQuery({
    queryKey: ["engagement", companyId],
    queryFn: () => fetch(`/api/engagement?companyId=${companyId}`).then((r) => r.json()),
  });

  if (loadingCompany || loadingEngagement) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company || company.userType !== "company") {
    return <div className="text-center py-16 text-muted-foreground">Company not found</div>;
  }

  const stats = engagementData?.stats;
  const engagements = engagementData?.engagements ?? [];
  const evaluations = engagementData?.evaluations ?? [];

  const getStatusBadge = (status: string, isAwarded: boolean) => {
    if (isAwarded) {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
          <Trophy className="h-3 w-3" /> Awarded
        </Badge>
      );
    }
    switch (status) {
      case "submitted":
        return <Badge variant="secondary" className="text-[11px]">Submitted</Badge>;
      case "shortlisted":
        return <Badge variant="outline" className="border-primary text-primary text-[11px]">Shortlisted</Badge>;
      case "revision_requested":
        return <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px]">Revision Requested</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="text-[11px]">Not Awarded</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] capitalize">{status}</Badge>;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
      case "B":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
      case "C":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      default:
        return "bg-rose-500/10 text-rose-600 border-rose-500/30";
    }
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case "preferred":
        return <Badge className="bg-emerald-600 text-white">Preferred Supplier</Badge>;
      case "approved":
        return <Badge variant="secondary" className="text-primary font-medium">Approved</Badge>;
      case "conditional":
        return <Badge variant="outline" className="text-amber-600 border-amber-500">Conditional</Badge>;
      case "under_review":
        return <Badge variant="outline" className="text-orange-600 border-orange-500">Under Review</Badge>;
      case "not_recommended":
        return <Badge variant="destructive">Not Recommended</Badge>;
      default:
        return <Badge variant="outline">{rec}</Badge>;
    }
  };

  const avgCriteria = evaluations.length
    ? {
        quality: (evaluations.reduce((acc: number, e: any) => acc + (e.scores?.quality || 0), 0) / evaluations.length).toFixed(1),
        delivery: (evaluations.reduce((acc: number, e: any) => acc + (e.scores?.delivery || 0), 0) / evaluations.length).toFixed(1),
        pricing: (evaluations.reduce((acc: number, e: any) => acc + (e.scores?.pricing || 0), 0) / evaluations.length).toFixed(1),
        technical: (evaluations.reduce((acc: number, e: any) => acc + (e.scores?.technical || 0), 0) / evaluations.length).toFixed(1),
        responsiveness: (evaluations.reduce((acc: number, e: any) => acc + (e.scores?.responsiveness || 0), 0) / evaluations.length).toFixed(1),
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* Top Header */}
      <div>
        <Link
          href={`/companies/${companyId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {company.companyName}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)]">
                  {company.companyName || "Company"}
                </h1>
                {company.isVerified && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
                    <Shield className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[company.city, company.country].filter(Boolean).join(", ") || "EPC Company"} &bull; Commercial Participation &amp; Performance Review
              </p>
            </div>
          </div>

          <Link href={`/messages/dm/${company._id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs h-9">
              Direct Message
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bids">
        <TabsList className="glass border-0">
          <TabsTrigger value="bids" className="gap-2">
            <FileText className="h-4 w-4" /> My Bids &amp; Tenders ({engagements.length})
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-2">
            <Award className="h-4 w-4" /> Performance &amp; Evaluation ({evaluations.length})
          </TabsTrigger>
        </TabsList>

        {/* Bids Tab */}
        <TabsContent value="bids" className="space-y-4 mt-4">
          {/* Quick Metrics */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card border border-border p-3 rounded-xl shadow-xs text-center">
                <div className="text-xs text-muted-foreground">Tenders Engaged</div>
                <div className="text-xl font-bold text-foreground mt-1">{stats.totalEngagements}</div>
              </div>
              <div className="bg-card border border-border p-3 rounded-xl shadow-xs text-center">
                <div className="text-xs text-muted-foreground">Bids Submitted</div>
                <div className="text-xl font-bold text-foreground mt-1">{stats.totalBidsSubmitted}</div>
              </div>
              <div className="bg-card border border-border p-3 rounded-xl shadow-xs text-center">
                <div className="text-xs text-muted-foreground">Tenders Won</div>
                <div className="text-xl font-bold text-emerald-600 mt-1">
                  {stats.totalAwarded} <span className="text-xs font-normal text-muted-foreground">({stats.winRatePercent}%)</span>
                </div>
              </div>
              <div className="bg-card border border-border p-3 rounded-xl shadow-xs text-center">
                <div className="text-xs text-muted-foreground">Total Quoted</div>
                <div className="text-xl font-bold text-foreground mt-1">
                  ${stats.totalQuotedValue.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Engagements list */}
          {engagements.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/20">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No bid activity found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                You have not participated in or submitted any offers for tenders published by {company.companyName}.
              </p>
            </div>
          ) : (
            engagements.map((eng: any) => {
              const hasBid = eng.bid !== null;
              const isLineOpen = !!expandedLines[eng.tenderId];

              return (
                <div
                  key={eng.tenderId}
                  className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/tenders/${eng.tenderId}`}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {eng.tenderTitle}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {eng.tenderType}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {eng.bidDeadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Deadline: {new Date(eng.bidDeadline).toLocaleDateString()}
                          </span>
                        )}
                        <span className="capitalize">Tender: {eng.tenderStatus}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      {hasBid ? (
                        getStatusBadge(eng.bid.status, eng.isAwardedToThisVendor)
                      ) : (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          Invited (No Bid)
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Bid Pricing Details */}
                  {hasBid ? (
                    <div className="bg-muted/30 rounded-xl p-3 border border-border/60 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-muted-foreground">Your Submitted Price: </span>
                          <span className="font-bold text-sm text-foreground">
                            {eng.bid.currency} {Number(eng.bid.totalPrice).toLocaleString()}
                          </span>
                          {eng.bid.discountValue ? (
                            <span className="text-[11px] text-emerald-600 ml-1.5 font-medium">
                              (incl. {eng.bid.discountType === "percent" ? `${eng.bid.discountValue}%` : `$${eng.bid.discountValue}`} discount)
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {eng.bid.validityDays && (
                            <span className="text-muted-foreground text-[11px]">
                              Validity: {eng.bid.validityDays} days
                            </span>
                          )}
                          <Link href={`/bids/${eng.bid.bidId}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1">
                              View Offer <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {eng.bid.notes && (
                        <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                          &ldquo;{eng.bid.notes}&rdquo;
                        </p>
                      )}

                      {/* Line Items Preview */}
                      {eng.bid.lineItemsCount > 0 && (
                        <div className="border-t border-border/40 pt-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            onClick={() =>
                              setExpandedLines((prev) => ({ ...prev, [eng.tenderId]: !isLineOpen }))
                            }
                          >
                            {isLineOpen ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {isLineOpen
                              ? `Hide quoted items (${eng.bid.lineItemsCount})`
                              : `Show quoted items (${eng.bid.lineItemsCount})`}
                          </button>

                          {isLineOpen && (
                            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {eng.bid.lineItemsPreview.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-[11px] bg-card p-1.5 rounded-lg border border-border/60"
                                >
                                  <span className="truncate max-w-[65%] font-medium text-foreground">
                                    {item.description}
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    {item.quantity} {item.unit} &times; {eng.bid.currency} {Number(item.unitPrice).toLocaleString()} ={" "}
                                    <span className="font-semibold text-foreground">
                                      {eng.bid.currency} {Number(item.totalPrice).toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-2.5">
                      Invited to bid on this tender on{" "}
                      {eng.invite?.createdAt ? new Date(eng.invite.createdAt).toLocaleDateString() : "earlier date"}
                      . No bid submission was completed.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations" className="space-y-4 mt-4">
          {/* Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="rounded-2xl border-border bg-card shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Assigned Rating Grade
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-3">
                  <div
                    className={`text-5xl font-black px-4 py-2 rounded-2xl border ${getGradeColor(
                      evaluations[0]?.grade || "B"
                    )}`}
                  >
                    {evaluations[0]?.grade || "—"}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {stats?.averageScore ? `${stats.averageScore}%` : "No score"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {evaluations.length} evaluation{evaluations.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                {evaluations[0]?.recommendation && (
                  <div className="pt-3 mt-3 border-t border-border/50">
                    <div className="text-[11px] text-muted-foreground mb-1">Status:</div>
                    {getRecommendationBadge(evaluations[0].recommendation)}
                  </div>
                )}
              </CardContent>
            </Card>

            {avgCriteria && (
              <Card className="rounded-2xl border-border bg-card shadow-xs md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Criteria Averages (5-Point Scale)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-0">
                  {CRITERIA.map((crit) => {
                    const val = Number((avgCriteria as any)[crit.key] || 0);
                    const percent = (val / 5) * 100;
                    return (
                      <div key={crit.key} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{crit.label}</span>
                          <span className="font-mono font-bold text-foreground">{val} / 5.0</span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Evaluations List */}
          {evaluations.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card p-6">
              <Award className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No evaluation scorecards on record</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {company.companyName} has not published a formal performance scorecard for your company yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluations.map((ev: any) => (
                <Card key={ev._id} className="rounded-2xl border-border bg-card shadow-xs">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-xl font-black px-2.5 py-1 rounded-xl border ${getGradeColor(ev.grade)}`}>
                          Grade {ev.grade}
                        </span>
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {ev.periodOrProject || "General Evaluation"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(ev.createdAt).toLocaleDateString()}
                            </span>
                            {ev.evaluatorName && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {ev.evaluatorName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getRecommendationBadge(ev.recommendation)}
                        <span className="font-mono text-sm font-bold text-foreground ml-2">
                          {ev.overallScore}%
                        </span>
                      </div>
                    </div>

                    {/* Criteria pills */}
                    {ev.scores && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/50">
                        <div>
                          <span className="text-muted-foreground">Quality: </span>
                          <span className="font-bold">{ev.scores.quality}/5</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Delivery: </span>
                          <span className="font-bold">{ev.scores.delivery}/5</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pricing: </span>
                          <span className="font-bold">{ev.scores.pricing}/5</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Technical: </span>
                          <span className="font-bold">{ev.scores.technical}/5</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Agility: </span>
                          <span className="font-bold">{ev.scores.responsiveness}/5</span>
                        </div>
                      </div>
                    )}

                    {/* Qualitative feedback */}
                    {(ev.strengths || ev.areasForImprovement || ev.notes) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        {ev.strengths && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center gap-1 font-semibold text-emerald-600 mb-1">
                              <ThumbsUp className="h-3 w-3" /> Strengths
                            </div>
                            <p className="text-muted-foreground">{ev.strengths}</p>
                          </div>
                        )}
                        {ev.areasForImprovement && (
                          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                            <div className="flex items-center gap-1 font-semibold text-amber-600 mb-1">
                              <AlertTriangle className="h-3 w-3" /> Improvement Areas
                            </div>
                            <p className="text-muted-foreground">{ev.areasForImprovement}</p>
                          </div>
                        )}
                        {ev.notes && (
                          <div className="sm:col-span-2 text-muted-foreground italic text-[11px]">
                            Note: {ev.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
