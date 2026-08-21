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
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { BidComparisonStatement } from "@/components/bid-comparison-statement";
import { MAX_COMPARISON_REMARKS, recommendedPaper, type PaperSize } from "@/lib/comparison";

export default function ComparisonStatementPage({ params }: { params: Promise<{ tenderId: string }> }) {
  const { tenderId } = use(params);
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [paper, setPaper] = useState<PaperSize>("a4");
  const [designation, setDesignation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [editLevel, setEditLevel] = useState<number | null>(null);

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

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }
  if (!data?.tender) {
    return <p className="text-center text-muted-foreground py-16">Comparison statement not found or access denied.</p>;
  }

  const existingRemarks: any[] = data.remarks ?? [];
  const canAdd = existingRemarks.length < MAX_COMPARISON_REMARKS;

  function startEdit(remark: any) {
    setEditLevel(remark.level);
    setRemarks(remark.remarks || "");
    setDesignation(remark.designation || profile?.designation || "");
  }

  return (
    <div className="space-y-4">
      <style>{`@page { size: ${paper === "a3" ? "A3" : "A4"} landscape; margin: 10mm; }`}</style>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/comparisons">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Comparison statement</h1>
            <p className="text-sm text-muted-foreground">{data.tender.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <BidComparisonStatement data={data} paper={paper} />

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Add company remarks</CardTitle>
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
