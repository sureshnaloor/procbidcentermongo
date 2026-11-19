"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { EngagementDialog } from "@/components/engagement-dialog";
import {
  ArrowLeft,
  Building2,
  Shield,
  Star,
  Award,
  Plus,
  Loader2,
  Trash2,
  Calendar,
  User,
  ThumbsUp,
  AlertTriangle,
  Activity,
  MessageSquare,
  Sparkles,
} from "lucide-react";

const CRITERIA = [
  { key: "quality", label: "Quality & Compliance", hint: "Material specifications, inspection reports, zero-defect adherence" },
  { key: "delivery", label: "On-Time Delivery", hint: "Schedule adherence, lead time reliability, logistics handling" },
  { key: "pricing", label: "Pricing Competitiveness", hint: "Commercial transparency, discounts, quotation accuracy" },
  { key: "technical", label: "Technical Capability", hint: "Engineering expertise, submittals, documentation completeness" },
  { key: "responsiveness", label: "Responsiveness & Agility", hint: "Query turnaround, proactive communication, problem resolution" },
] as const;

export default function VendorEvaluationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: vendorId } = use(params);
  const { data: session } = useSession();
  const qc = useQueryClient();

  const userType = (session?.user as any)?.userType;
  const isCompany = userType === "company" || (session?.user as any)?.role === "admin";

  const [showEngagementDialog, setShowEngagementDialog] = useState(false);
  const [showEvalForm, setShowEvalForm] = useState(false);

  // New Evaluation Form State
  const [period, setPeriod] = useState("");
  const [scores, setScores] = useState({
    quality: 4,
    delivery: 4,
    pricing: 4,
    technical: 4,
    responsiveness: 4,
  });
  const [recommendation, setRecommendation] = useState<string>("approved");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch Vendor Profile
  const { data: vendor, isLoading: loadingVendor } = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => fetch(`/api/profile/${vendorId}`).then((r) => r.json()),
  });

  // Fetch Engagement stats
  const { data: engagement, isLoading: loadingEngagement } = useQuery({
    queryKey: ["engagement", vendorId],
    queryFn: () => fetch(`/api/engagement?vendorId=${vendorId}`).then((r) => r.json()),
    enabled: isCompany,
  });

  // Fetch Evaluations
  const { data: evaluations = [], isLoading: loadingEvals } = useQuery<any[]>({
    queryKey: ["evaluations", vendorId],
    queryFn: () => fetch(`/api/evaluations?vendorId=${vendorId}`).then((r) => r.json()),
  });

  const createEvaluation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorProfileId: vendorId,
          periodOrProject: period.trim() || undefined,
          scores,
          recommendation,
          strengths: strengths.trim() || undefined,
          areasForImprovement: improvements.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record evaluation");
      return data;
    },
    onSuccess: () => {
      toast.success("Evaluation scorecard saved successfully");
      setShowEvalForm(false);
      setPeriod("");
      setStrengths("");
      setImprovements("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["evaluations", vendorId] });
      qc.invalidateQueries({ queryKey: ["engagement", vendorId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEvaluation = useMutation({
    mutationFn: async (evalId: string) => {
      const res = await fetch(`/api/evaluations/${evalId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete evaluation");
      return data;
    },
    onSuccess: () => {
      toast.success("Evaluation deleted");
      qc.invalidateQueries({ queryKey: ["evaluations", vendorId] });
      qc.invalidateQueries({ queryKey: ["engagement", vendorId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (loadingVendor) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor || vendor.userType !== "vendor") {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Supplier profile not found.
      </div>
    );
  }

  // Calculate Aggregates
  const stats = engagement?.stats;
  const avgOverall = evaluations.length
    ? Math.round(evaluations.reduce((acc, e) => acc + e.overallScore, 0) / evaluations.length)
    : null;

  const avgCriteria = evaluations.length
    ? {
        quality: (evaluations.reduce((acc, e) => acc + (e.scores?.quality || 0), 0) / evaluations.length).toFixed(1),
        delivery: (evaluations.reduce((acc, e) => acc + (e.scores?.delivery || 0), 0) / evaluations.length).toFixed(1),
        pricing: (evaluations.reduce((acc, e) => acc + (e.scores?.pricing || 0), 0) / evaluations.length).toFixed(1),
        technical: (evaluations.reduce((acc, e) => acc + (e.scores?.technical || 0), 0) / evaluations.length).toFixed(1),
        responsiveness: (evaluations.reduce((acc, e) => acc + (e.scores?.responsiveness || 0), 0) / evaluations.length).toFixed(1),
      }
    : null;

  const latestEval = evaluations[0];

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

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-12">
      {/* Top Header */}
      <div>
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Suppliers
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)]">
                  {vendor.companyName || "Supplier"}
                </h1>
                {vendor.isVerified && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
                    <Shield className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[vendor.city, vendor.country].filter(Boolean).join(", ") || "Registered Supplier"} &bull;{" "}
                Performance Grading &amp; Scorecard History
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl h-9 text-xs"
              onClick={() => setShowEngagementDialog(true)}
            >
              <Activity className="h-3.5 w-3.5 text-primary" />
              Bids &amp; Activity
            </Button>

            <Link href={`/messages/dm/${vendor._id}`}>
              <Button size="sm" variant="secondary" className="gap-1.5 rounded-xl h-9 text-xs">
                <MessageSquare className="h-3.5 w-3.5" /> Message
              </Button>
            </Link>

            {isCompany && (
              <Button
                size="sm"
                className="gap-1.5 rounded-xl h-9 text-xs shadow-xs"
                onClick={() => setShowEvalForm((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" />
                {showEvalForm ? "Close Form" : "New Evaluation"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Aggregate Scorecard Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Grade Card */}
        <Card className="rounded-2xl border-border bg-card shadow-xs md:col-span-1 flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Overall Performance Grade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-baseline gap-3">
              <div
                className={`text-5xl font-black px-4 py-2 rounded-2xl border ${getGradeColor(
                  latestEval?.grade || "B"
                )}`}
              >
                {latestEval?.grade || "—"}
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{avgOverall ? `${avgOverall}%` : "No score"}</div>
                <div className="text-xs text-muted-foreground">
                  {evaluations.length} evaluation{evaluations.length === 1 ? "" : "s"} recorded
                </div>
              </div>
            </div>

            {latestEval?.recommendation && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-[11px] text-muted-foreground mb-1">Current Recommendation:</div>
                {getRecommendationBadge(latestEval.recommendation)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commercial Engagement KPI */}
        <Card className="rounded-2xl border-border bg-card shadow-xs md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tender Participation &amp; Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0">
            <div className="bg-muted/30 p-3 rounded-xl border border-border/60">
              <div className="text-xs text-muted-foreground">Tenders Engaged</div>
              <div className="text-xl font-bold text-foreground mt-1">{stats?.totalEngagements ?? 0}</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-xl border border-border/60">
              <div className="text-xs text-muted-foreground">Bids Submitted</div>
              <div className="text-xl font-bold text-foreground mt-1">{stats?.totalBidsSubmitted ?? 0}</div>
            </div>
            <div className="bg-muted/30 p-3 rounded-xl border border-border/60">
              <div className="text-xs text-muted-foreground">Tenders Won</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                {stats?.totalAwarded ?? 0}{" "}
                <span className="text-xs font-normal text-muted-foreground">({stats?.winRatePercent ?? 0}%)</span>
              </div>
            </div>
            <div className="bg-muted/30 p-3 rounded-xl border border-border/60">
              <div className="text-xs text-muted-foreground">Total Quoted</div>
              <div className="text-xl font-bold text-foreground mt-1">
                ${(stats?.totalQuotedValue ?? 0).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Criteria Breakdown */}
      {avgCriteria && (
        <Card className="rounded-2xl border-border bg-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Evaluation Criteria Breakdown (5-Point Scale)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CRITERIA.map((crit) => {
              const val = Number((avgCriteria as any)[crit.key] || 0);
              const percent = (val / 5) * 100;
              return (
                <div key={crit.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{crit.label}</span>
                    <span className="font-mono font-bold text-foreground">
                      {val} <span className="text-muted-foreground font-normal">/ 5.0</span>
                    </span>
                  </div>
                  <Progress value={percent} className="h-2" />
                  <p className="text-[11px] text-muted-foreground">{crit.hint}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* New Evaluation Form */}
      {showEvalForm && isCompany && (
        <Card className="rounded-2xl border-primary/40 bg-card shadow-md animate-scale-in">
          <CardHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-bold">New Supplier Evaluation Scorecard</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluate {vendor.companyName} based on delivery performance, technical accuracy, and commercial terms.
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="period-input">Review Period or Project Name</Label>
                <Input
                  id="period-input"
                  placeholder="e.g. 2026 Q1 Review or Pipeline Package 2"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Procurement Recommendation</Label>
                <Select value={recommendation} onValueChange={setRecommendation}>
                  <SelectTrigger id="recommendation-select">
                    <SelectValue placeholder="Select recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preferred">Preferred Supplier (Top Tier)</SelectItem>
                    <SelectItem value="approved">Approved Supplier</SelectItem>
                    <SelectItem value="conditional">Conditional Approval</SelectItem>
                    <SelectItem value="under_review">Under Review / Performance Monitoring</SelectItem>
                    <SelectItem value="not_recommended">Not Recommended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Score Sliders / Selectors */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Score Rating (1 = Poor, 5 = Excellent)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CRITERIA.map((crit) => {
                  const currentScore = (scores as any)[crit.key];
                  return (
                    <div
                      key={crit.key}
                      className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{crit.label}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setScores((p) => ({ ...p, [crit.key]: star }))}
                              className={`p-1 rounded hover:scale-110 transition-transform ${
                                star <= currentScore ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
                              }`}
                            >
                              <Star className="h-4 w-4 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{crit.hint}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Qualitative Feedback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="strengths-input">Key Strengths</Label>
                <Textarea
                  id="strengths-input"
                  placeholder="e.g. Prompt responses, competitive pricing on cables..."
                  rows={3}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="improvements-input">Areas for Improvement</Label>
                <Textarea
                  id="improvements-input"
                  placeholder="e.g. Documentation submittals occasionally delayed..."
                  rows={3}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes-input">Internal Notes / Summary</Label>
              <Input
                id="notes-input"
                placeholder="Optional internal remarks for the procurement committee"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowEvalForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createEvaluation.mutate()}
                disabled={createEvaluation.isPending}
                className="gap-1.5"
              >
                {createEvaluation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                Save Evaluation Scorecard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Evaluations List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Scorecard History</h2>
          <span className="text-xs text-muted-foreground">{evaluations.length} total</span>
        </div>

        {loadingEvals ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : evaluations.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card p-6">
            <Award className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">No evaluations recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {isCompany
                ? "Click 'New Evaluation' above to create the first scorecard for this supplier."
                : "Your company has not received any formal scorecards from this client yet."}
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
                      {isCompany && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Delete this evaluation?")) deleteEvaluation.mutate(ev._id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 5 Dimensions Pills */}
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

                  {/* Feedback Comments */}
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
      </div>

      {/* Engagement Activity Dialog */}
      <EngagementDialog
        open={showEngagementDialog}
        onOpenChange={setShowEngagementDialog}
        vendorId={vendorId}
        vendorName={vendor.companyName}
        isCompanyViewer={true}
      />
    </div>
  );
}
