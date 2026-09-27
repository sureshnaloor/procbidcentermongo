"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Printer, FileSpreadsheet, Trophy } from "lucide-react";
import { BidComparisonStatement } from "@/components/bid-comparison-statement";
import { AwardTenderDialog } from "@/components/tender-status-dialogs";
import { MAX_COMPARISON_REMARKS, comparisonColumns, recommendedPaper, type PaperSize } from "@/lib/comparison";
import { downloadBoqFile } from "@/lib/boq-browser";

export default function ComparisonStatementPage({ params }: { params: Promise<{ tenderId: string }> }) {
  const { tenderId } = use(params);
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [paper, setPaper] = useState<PaperSize>("a4");
  const [includeOriginal, setIncludeOriginal] = useState(false);
  const [designation, setDesignation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [editLevel, setEditLevel] = useState<number | null>(null);
  const [awardOpen, setAwardOpen] = useState(false);
  const [awardBidId, setAwardBidId] = useState<string | undefined>(undefined);

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["comparison", tenderId],
    queryFn: () => fetch(`/api/comparisons/${tenderId}`).then(async (r) => {
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || "Failed to load comparison");
      return json;
    }),
  });

  const displayBids = useMemo(() => comparisonColumns(data?.bids ?? [], includeOriginal), [data, includeOriginal]);
  const quotedCount = data?.bids?.length ?? 0;
  const autoPaper = useMemo(() => recommendedPaper(quotedCount), [quotedCount]);

  useEffect(() => {
    if (data) setPaper(autoPaper);
  }, [autoPaper, data]);

  useEffect(() => {
    if (profile?.designation) setDesignation(profile.designation);
  }, [profile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    if (!data) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [data]);

  const saveRemark = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/comparisons/${tenderId}/remarks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remarks,
          designation,
          level: editLevel ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save remark");
      return json;
    },
    onSuccess: () => {
      toast.success(editLevel ? `Level ${editLevel} remark updated` : "Company remark added");
      setRemarks("");
      setEditLevel(null);
      qc.invalidateQueries({ queryKey: ["comparison", tenderId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const awardMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/tenders/${tenderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "awarded", ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to award tender");
      return json;
    },
    onSuccess: () => {
      toast.success("Tender awarded — suppliers have been notified");
      setAwardOpen(false);
      qc.invalidateQueries({ queryKey: ["comparison", tenderId] });
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }
  if (!data?.tender) {
    return <p className="text-center text-muted-foreground py-16">Comparison statement not found or access denied.</p>;
  }

  const existingRemarks: any[] = data.remarks ?? [];
  const canAdd = existingRemarks.length < MAX_COMPARISON_REMARKS;

  // Award decision (company/admin only, while the package is open or already awarded)
  const isAdmin = (session as { user?: { role?: string } } | null)?.user?.role === "admin";
  const canAward =
    (profile?.userType === "company" || isAdmin) &&
    ["published", "awarded"].includes(data.tender.status);
  const awardableBids = (data.bids ?? []).filter((b: any) => b.status && b.status !== "draft");
  const currentAwardedBidId = data.tender.awardedBidId ? String(data.tender.awardedBidId) : "";

  function startEdit(remark: any) {
    setEditLevel(remark.level);
    setRemarks(remark.remarks || "");
    setDesignation(remark.designation || profile?.designation || "");
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <style>{`@page { size: ${paper === "a3" ? "A3" : "A4"} landscape; margin: 10mm; }`}</style>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/comparisons">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">Comparison statement</h1>
            <p className="text-sm text-muted-foreground">{data.tender.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeOriginal}
                onChange={(e) => setIncludeOriginal(e.target.checked)}
                id="include-original-bids"
              />
              Include original bid also
            </label>
            <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={paper}
            onChange={(e) => setPaper(e.target.value as PaperSize)}
            id="comparison-paper-size"
          >
            <option value="a4">A4 landscape{quotedCount > 3 ? " (2–3 suppliers per page)" : ""}</option>
            <option value="a3">A3 landscape{quotedCount >= 4 ? " (up to 5 suppliers)" : ""}</option>
          </select>
          <Button onClick={() => window.print()} id="print-comparison-btn">
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
          <Button
            variant="outline"
            id="excel-comparison-btn"
            onClick={async () => {
              try {
                await downloadBoqFile(
                  `/api/comparisons/${tenderId}/excel${includeOriginal ? "?includeOriginal=1" : ""}`,
                  "comparison.xlsx"
                );
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not download Excel");
              }
            }}
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <BidComparisonStatement data={{ ...data, bids: displayBids }} paper={paper} />

      {canAward && awardableBids.length > 0 && (
        <Card className="print:hidden glass card-3d border-0 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-[family-name:var(--font-heading)] flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Award decision
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.tender.status === "awarded"
                ? "This package is awarded. Pick a different supplier to correct the award."
                : "Ready to finalize? Award the winning supplier directly from here — all participants will be notified."}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {awardableBids.map((b: any) => {
                const isWinner = currentAwardedBidId && String(b._id) === currentAwardedBidId;
                const supplierName = b.vendor?.companyName || b.offlineSupplier?.name || "Supplier";
                return (
                  <div
                    key={String(b._id)}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                      isWinner
                        ? "border-amber-500/50 bg-amber-500/[0.07]"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate flex items-center gap-1.5">
                        {supplierName}
                        {isWinner && (
                          <span className="badge-celebrate-chip inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0">
                            <Trophy className="h-2.5 w-2.5" /> Awarded
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {b.currency || data.tender.currency} {b.totalPrice != null ? Number(b.totalPrice).toLocaleString() : "—"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isWinner ? "outline" : "default"}
                      className="shrink-0 gap-1"
                      onClick={() => {
                        setAwardBidId(String(b._id));
                        setAwardOpen(true);
                      }}
                      id={`award-bidder-${String(b._id).slice(-6)}`}
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      {isWinner ? "Review" : data.tender.status === "awarded" ? "Switch to this" : "Award"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <AwardTenderDialog
        open={awardOpen}
        onOpenChange={setAwardOpen}
        tender={data.tender}
        bids={data.bids ?? []}
        initialBidId={awardBidId}
        isPending={awardMutation.isPending}
        onConfirm={(payload) => awardMutation.mutate(payload)}
      />

      <Card className="print:hidden glass card-3d border-0 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-[family-name:var(--font-heading)]">Add company remarks</CardTitle>
          <p className="text-xs text-muted-foreground">
            Up to {MAX_COMPARISON_REMARKS} levels. Each entry stores the reviewer&apos;s name, designation, and remarks.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="remark-designation">Your designation</Label>
              <Input
                id="remark-designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Procurement Manager"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <div className="h-9 flex items-center text-sm text-muted-foreground">
                {editLevel ? `Editing level ${editLevel}` : canAdd ? `Next available (currently ${existingRemarks.length} of ${MAX_COMPARISON_REMARKS})` : "All 5 levels are filled"}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="remark-text">Remarks</Label>
            <Textarea
              id="remark-text"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Commercial / technical recommendation, exceptions, or award note"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => saveRemark.mutate()}
              disabled={saveRemark.isPending || (!canAdd && !editLevel)}
              id="save-comparison-remark-btn"
            >
              {saveRemark.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editLevel ? `Update level ${editLevel}` : "Add remark"}
            </Button>
            {editLevel && (
              <Button variant="outline" onClick={() => { setEditLevel(null); setRemarks(""); }}>
                Cancel edit
              </Button>
            )}
          </div>
          {existingRemarks.length > 0 && (
            <div className="space-y-2 pt-2">
              {existingRemarks.map((remark: any) => (
                <div key={remark.level} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">Level {remark.level} · {remark.userName}{remark.designation ? `, ${remark.designation}` : ""}</div>
                    {(String(remark.userId) === (session as { user?: { id?: string; role?: string } } | null)?.user?.id
                      || (session as { user?: { role?: string } } | null)?.user?.role === "admin") && (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(remark)}>Edit</Button>
                    )}
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap mt-1">{remark.remarks}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
