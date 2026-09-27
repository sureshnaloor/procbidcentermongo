"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText, CalendarClock, Calendar, MapPin, Loader2, Building2, Pencil, DollarSign, RefreshCw, AlertTriangle, Clock, Archive, Trophy, XCircle, CheckCircle2, Eye, Lock, Ban } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import { DeadlineCountdown } from "@/components/deadline-countdown";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  SectionFilterBar, matchesDateFilters, matchesSearch, usePersistentFilters, yearsFrom,
  type SectionFilterState,
} from "@/components/list-filters";
import {
  CloseTenderDialog,
  CancelTenderDialog,
  AwardTenderDialog,
  EditRemarksDialog,
  TenderSummaryModal,
} from "@/components/tender-status-dialogs";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary",
  published: "success",
  closed: "outline",
  awarded: "default",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed (External Award)",
  awarded: "Awarded",
  cancelled: "Cancelled",
};

const BID_STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary",
  submitted: "default",
  under_review: "warning",
  shortlisted: "success",
  accepted: "success",
  rejected: "destructive",
  withdrawn: "outline",
};

function statusLabel(status?: string) {
  return (status || "").replace(/_/g, " ");
}

export default function TendersPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [browseAll, setBrowseAll] = useState(false);
  const filterUid = (session?.user as any)?.id ?? "anon";
  const [activeFilters, setActiveFilters] = usePersistentFilters(`filters:tenders:active:${filterUid}`);
  const [archivedFilters, setArchivedFilters] = usePersistentFilters(`filters:tenders:archived:${filterUid}`);

  // Dialog states for company actions
  const [summaryTender, setSummaryTender] = useState<any | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [actionTender, setActionTender] = useState<any | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const [editRemarksOpen, setEditRemarksOpen] = useState(false);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const isCompany = profile?.userType === "company";
  const isVendor = profile?.userType === "vendor";
  const vendorMine = isVendor && !browseAll;

  const qParams = new URLSearchParams({ limit: "100" });
  if (vendorMine) qParams.set("mine", "1");

  const { data, isLoading } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", vendorMine],
    queryFn: () => fetch(`/api/tenders?${qParams}`).then((r) => r.json()),
    enabled: !!session && !loadingProfile,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/tenders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update tender");
      return resData;
    },
    onSuccess: (_data, variables) => {
      setCloseOpen(false);
      setCancelOpen(false);
      setAwardOpen(false);
      setEditRemarksOpen(false);
      setActionTender(null);
      const st = variables.payload.status;
      if (st === "awarded") toast.success("Tender marked as awarded");
      else if (st === "closed") toast.success("Tender closed (external award recorded)");
      else if (st === "cancelled") toast.success("Tender cancelled");
      else toast.success("Tender remarks updated");
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const tenders = data?.items ?? [];

  const isArchivedTender = (t: any) => {
    return ["closed", "awarded", "cancelled"].includes(t.status);
  };

  const supplierNamesOf = (t: any): string[] => {
    const names = new Set<string>();
    for (const b of t.bids ?? []) {
      const n = b.vendor?.companyName || b.offlineSupplier?.name;
      if (n) names.add(n);
    }
    for (const i of t.invites ?? []) {
      if (i.vendor?.companyName) names.add(i.vendor.companyName);
    }
    for (const o of t.offlineInvites ?? []) {
      if (o.supplierName) names.add(o.supplierName);
    }
    return [...names];
  };

  // Options stay derived from the full (unfiltered) list so dropdowns remain stable
  const counterpartOptions = [...new Set(
    tenders.flatMap((t: any) => (isVendor ? [t.company?.companyName] : supplierNamesOf(t)))
  )].filter(Boolean).sort((a: string, b: string) => a.localeCompare(b)) as string[];
  const yearOptions = yearsFrom(tenders.map((t: any) => t.createdAt));

  const matchesTender = (t: any, f: SectionFilterState): boolean => {
    if (!matchesSearch([t.title, t.description], f.search)) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.type && t.type !== f.type) return false;
    if (!matchesDateFilters(t.createdAt, f)) return false;
    if (f.counterpart) {
      if (isVendor) {
        if ((t.company?.companyName ?? "") !== f.counterpart) return false;
      } else if (!supplierNamesOf(t).includes(f.counterpart)) return false;
    }
    return true;
  };

  const activeTenders = tenders.filter((t: any) => !isArchivedTender(t) && matchesTender(t, activeFilters));
  const archivedTenders = tenders.filter((t: any) => isArchivedTender(t) && matchesTender(t, archivedFilters));
  const hasActiveAny = tenders.some((t: any) => !isArchivedTender(t));
  const hasArchivedAny = tenders.some((t: any) => isArchivedTender(t));

  const handleOpenSummary = (t: any) => {
    setSummaryTender(t);
    setSummaryOpen(true);
  };

  const handleOpenAward = (t: any) => {
    setActionTender(t);
    setAwardOpen(true);
  };

  const handleOpenClose = (t: any) => {
    setActionTender(t);
    setCloseOpen(true);
  };

  const handleOpenCancel = (t: any) => {
    setActionTender(t);
    setCancelOpen(true);
  };

  const handleOpenEditRemarks = (t: any) => {
    setActionTender(t);
    setEditRemarksOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
            Tenders
          </h1>
          {isVendor && (
            <p className="text-sm text-muted-foreground mt-1">
              {vendorMine
                ? "Packages you were invited to, or where your request was approved."
                : "All published packages you can request to join."}
            </p>
          )}
          {!isVendor && <p className="text-sm text-muted-foreground mt-1">Create, publish, and manage your RFQs, RFPs, and tenders.</p>}
        </div>
        <div className="flex items-center gap-2">
          {isCompany && (
            profile?.isVerified ? (
              <Link href="/tenders/new">
                <Button size="sm" id="new-tender-top-btn"><Plus /> New Tender</Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled title="Super Admin verification required" id="new-tender-top-btn">
                <Plus className="opacity-50" /> New Tender (Pending Verification)
              </Button>
            )
          )}
          {isVendor && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBrowseAll((v) => !v)}
              id="toggle-vendor-tenders-btn"
            >
              {browseAll ? "My packages" : "Browse all published"}
            </Button>
          )}
        </div>
      </div>

      {isLoading || loadingProfile ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/20">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            {isVendor && vendorMine
              ? "No invited or approved packages yet."
              : isVendor
                ? "No published tenders to bid on yet."
                : "No tenders found"}
          </p>
          {isCompany && (
            <Link href="/tenders/new"><Button variant="outline" className="mt-4" size="sm">Create your first tender</Button></Link>
          )}
          {isVendor && vendorMine && (
            <Button variant="outline" className="mt-4" size="sm" onClick={() => setBrowseAll(true)}>Browse published packages</Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active / Current Tenders — has its own filter bar */}
          {hasActiveAny && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Current & Active Packages
                  <Badge variant="secondary" className="text-xs font-mono">{activeTenders.length}</Badge>
                </h2>
              </div>
              <SectionFilterBar
                value={activeFilters}
                onChange={setActiveFilters}
                years={yearOptions}
                searchPlaceholder="Search active packages…"
                statusOptions={[
                  ...(!isVendor ? [{ value: "draft", label: "Draft" }] : []),
                  { value: "published", label: "Published (Active)" },
                ]}
                showType
                counterpartLabel={isVendor ? "EPC Company" : "Supplier"}
                counterpartPlural={isVendor ? "EPC Companies" : "Suppliers"}
                counterpartOptions={counterpartOptions}
                idPrefix="active-tender"
              />
              {activeTenders.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground bg-muted/10">
                  No active packages match these filters.
                </div>
              ) : (
                <div className="grid gap-4 stagger-children">
                  {activeTenders.map((t: any) => (
                    isVendor ? (
                      <VendorTenderCard key={t._id} tender={t} onOpenSummary={handleOpenSummary} />
                    ) : (
                      <CompanyTenderCard
                        key={t._id}
                        tender={t}
                        onOpenSummary={handleOpenSummary}
                        onAward={handleOpenAward}
                        onClose={handleOpenClose}
                        onCancel={handleOpenCancel}
                        onEditRemarks={handleOpenEditRemarks}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Archived / Past Tenders — has its own filter bar */}
          {hasArchivedAny && (
            <div className="space-y-3 pt-6 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Archived & Past Tenders
                    <Badge variant="outline" className="text-xs font-mono">{archivedTenders.length}</Badge>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Concluded packages: Awarded, Closed (awarded outside platform), or Cancelled.
                  </p>
                </div>
              </div>
              <SectionFilterBar
                value={archivedFilters}
                onChange={setArchivedFilters}
                years={yearOptions}
                searchPlaceholder="Search archived packages…"
                statusOptions={[
                  { value: "awarded", label: "Awarded" },
                  { value: "closed", label: "Closed (External Award)" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                showType
                counterpartLabel={isVendor ? "EPC Company" : "Supplier"}
                counterpartPlural={isVendor ? "EPC Companies" : "Suppliers"}
                counterpartOptions={counterpartOptions}
                idPrefix="archived-tender"
              />
              {archivedTenders.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground bg-muted/10">
                  No archived packages match these filters.
                </div>
              ) : (
                <div className="grid gap-4 opacity-90">
                  {archivedTenders.map((t: any) => (
                    isVendor ? (
                      <VendorTenderCard key={t._id} tender={t} isArchived onOpenSummary={handleOpenSummary} />
                    ) : (
                      <CompanyTenderCard
                        key={t._id}
                        tender={t}
                        isArchived
                        onOpenSummary={handleOpenSummary}
                        onAward={handleOpenAward}
                        onClose={handleOpenClose}
                        onCancel={handleOpenCancel}
                        onEditRemarks={handleOpenEditRemarks}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Package Summary & Bids Details Modal */}
      <TenderSummaryModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        tender={summaryTender}
        canEditRemarks={isCompany}
        onEditRemarks={() => {
          if (summaryTender) {
            setActionTender(summaryTender);
            setEditRemarksOpen(true);
          }
        }}
        onEditAward={() => {
          if (summaryTender) {
            setActionTender(summaryTender);
            setAwardOpen(true);
          }
        }}
      />

      {/* Status Action Confirmation Dialogs */}
      {actionTender && (
        <>
          <CloseTenderDialog
            open={closeOpen}
            onOpenChange={setCloseOpen}
            tenderTitle={actionTender.title}
            isPending={updateStatusMutation.isPending}
            onConfirm={(remarks) =>
              updateStatusMutation.mutate({
                id: actionTender._id,
                payload: { status: "closed", statusRemarks: remarks },
              })
            }
          />

          <CancelTenderDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            tenderTitle={actionTender.title}
            isPending={updateStatusMutation.isPending}
            onConfirm={(remarks) =>
              updateStatusMutation.mutate({
                id: actionTender._id,
                payload: { status: "cancelled", statusRemarks: remarks },
              })
            }
          />

          <AwardTenderDialog
            open={awardOpen}
            onOpenChange={setAwardOpen}
            tender={actionTender}
            bids={actionTender.bids || []}
            isPending={updateStatusMutation.isPending}
            onConfirm={(payload) =>
              updateStatusMutation.mutate({
                id: actionTender._id,
                payload: { status: "awarded", ...payload },
              })
            }
          />

          <EditRemarksDialog
            open={editRemarksOpen}
            onOpenChange={setEditRemarksOpen}
            tender={actionTender}
            isPending={updateStatusMutation.isPending}
            onSave={(remarks) =>
              updateStatusMutation.mutate({
                id: actionTender._id,
                payload: { statusRemarks: remarks },
              })
            }
          />
        </>
      )}
    </div>
  );
}

function CompanyTenderCard({
  tender: t,
  isArchived,
  onOpenSummary,
  onAward,
  onClose,
  onCancel,
  onEditRemarks,
}: {
  tender: any;
  isArchived?: boolean;
  onOpenSummary: (t: any) => void;
  onAward: (t: any) => void;
  onClose: (t: any) => void;
  onCancel: (t: any) => void;
  onEditRemarks: (t: any) => void;
}) {
  const isPastDue = t.bidDeadline ? new Date(t.bidDeadline).getTime() < Date.now() : false;
  const isPublished = t.status === "published";
  const needsAction = isPublished && isPastDue;
  const isOpenWithFutureDeadline = isPublished && !isPastDue && Boolean(t.bidDeadline);
  const bidsCount = t.bidsCount ?? (Array.isArray(t.bids) ? t.bids.length : 0);

  return (
    <Card className={`card-3d hover:border-primary/30 group border-0 ${isArchived ? "bg-muted/15 border-border/40" : ""}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                {PROCUREMENT_TYPES[t.type as keyof typeof PROCUREMENT_TYPES]?.label ?? t.type}
              </Badge>
              <Badge variant={STATUS_COLORS[t.status] ?? "outline"} className="shrink-0 font-medium">
                {STATUS_LABELS[t.status] ?? t.status}
              </Badge>
              {t.createdAt && (
                <Badge variant="secondary" className="text-[11px] font-medium gap-1 bg-muted/70 text-foreground border-border shrink-0">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  Issued: <span className="font-bold">{format(new Date(t.createdAt), "dd MMM yyyy")}</span>
                </Badge>
              )}
              {needsAction && (
                <Badge variant="destructive" className="shrink-0 animate-pulse flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-3 w-3" />
                  Due Date Passed — Action Required
                </Badge>
              )}
              {isOpenWithFutureDeadline && (
                <Badge variant="secondary" className="shrink-0 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
                  <Clock className="h-3 w-3 animate-pulse" />
                  <DeadlineCountdown deadline={t.bidDeadline} className="font-mono text-[11px] font-semibold" />
                </Badge>
              )}
              {/* Bids details button */}
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2 gap-1 rounded-md shrink-0 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenSummary(t);
                }}
                id={`bids-details-badge-${t._id}`}
              >
                <FileText className="h-3 w-3 text-muted-foreground" />
                Bids & Summary Details ({bidsCount})
              </Button>
            </div>
            <Link href={`/tenders/${t._id}`} className="font-semibold text-foreground group-hover:text-primary transition-colors truncate block">
              {t.title}
            </Link>
            {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
          </div>
          <div className="text-right shrink-0">
            {t.estimatedValue && (
              <div className="font-semibold text-foreground">{t.currency} {t.estimatedValue.toLocaleString()}</div>
            )}
          </div>
        </div>

        {/* Awarded Outcome Details */}
        {t.status === "awarded" && (
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-foreground flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                Awarded to: <strong className="text-primary font-bold">{t.awardedVendorName || "Awarded Bidder"}</strong>
                {t.awardedAmount != null && (
                  <span className="ml-1.5 font-mono text-foreground font-semibold">
                    ({t.awardedCurrency || t.currency} {Number(t.awardedAmount).toLocaleString()})
                  </span>
                )}
              </span>
              {t.awardMasked && (
                <Badge variant="outline" className="text-[10px] font-semibold gap-1 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10 shrink-0" title="Winner name and price are hidden from other suppliers">
                  <Lock className="h-3 w-3" /> Masked
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAward(t);
                }}
                id={`change-award-btn-${t._id}`}
              >
                <Trophy className="h-3 w-3 mr-1 text-amber-500" /> Change Award
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs px-2"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEditRemarks(t);
                }}
              >
                <Pencil className="h-3 w-3 mr-1" /> Edit Remarks
              </Button>
            </div>
            {t.statusRemarks && (
              <div className="text-[11px] text-muted-foreground w-full italic pt-1 border-t border-primary/20">
                Remarks: {t.statusRemarks}
              </div>
            )}
          </div>
        )}

        {/* Closed Outcome Details */}
        {t.status === "closed" && (
          <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-foreground flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
              <span>Closed: Awarded to external supplier outside platform</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditRemarks(t);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit Remarks
            </Button>
            {t.statusRemarks && (
              <div className="text-[11px] text-muted-foreground w-full italic pt-1 border-t border-border">
                Remarks: {t.statusRemarks}
              </div>
            )}
          </div>
        )}

        {/* Cancelled Outcome Details */}
        {t.status === "cancelled" && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-xs text-destructive flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              <span>Cancelled Package</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2 text-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditRemarks(t);
              }}
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit Remarks
            </Button>
            {t.statusRemarks && (
              <div className="text-[11px] text-destructive/90 w-full italic pt-1 border-t border-destructive/20">
                Reason: {t.statusRemarks}
              </div>
            )}
          </div>
        )}

        {/* Flash alert banner for tenders past due date with action buttons */}
        {needsAction && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-between gap-2 animate-pulse flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>Due date passed. Take action:</span>
            </div>
            <div className="flex items-center gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => onAward(t)} id={`award-card-btn-${t._id}`}>
                <Trophy className="h-3.5 w-3.5 mr-1" /> Award
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onClose(t)} id={`close-card-btn-${t._id}`}>
                Close
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => onCancel(t)} id={`cancel-card-btn-${t._id}`}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-1 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-3.5 flex-wrap">
            {t.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t.location}</span>}
            {t.createdAt && (
              <span className="flex items-center gap-1 font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/50">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Issued: {format(new Date(t.createdAt), "dd MMM yyyy")}
              </span>
            )}
            {t.bidDeadline && (
              <span className={`flex items-center gap-1 ${needsAction ? "text-destructive font-medium" : ""}`}>
                <CalendarClock className="h-3.5 w-3.5" />
                Deadline: {format(new Date(t.bidDeadline), "dd MMM yyyy")}
              </span>
            )}
            {isOpenWithFutureDeadline && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Clock className="h-3.5 w-3.5" />
                <DeadlineCountdown deadline={t.bidDeadline} />
              </span>
            )}
            <span>Posted {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/tenders/${t._id}`}>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                <Eye className="h-3 w-3" /> View Package
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VendorTenderCard({
  tender: t,
  isArchived,
  onOpenSummary,
}: {
  tender: any;
  isArchived?: boolean;
  onOpenSummary: (t: any) => void;
}) {
  const myBids = Array.isArray(t.myBids) ? t.myBids : [];
  const submitted = myBids.filter((b: any) => b.status && b.status !== "draft");
  const draft = myBids.find((b: any) => b.status === "draft");
  const canOffer = Boolean(t.participation?.canPrepareOffer);
  const authorized = t.participation?.status === "invited" || t.participation?.status === "accepted";
  const awaiting = !submitted.length && authorized;
  const deadlineOpen = !t.bidDeadline || new Date(t.bidDeadline).getTime() >= Date.now();
  const isWinningBid = (b: any) =>
    b.status === "accepted" || (t.awardedBidId && String(b._id) === String(t.awardedBidId));
  const wonAward = t.status === "awarded" && submitted.some(isWinningBid);
  const lostAward = t.status === "awarded" && submitted.length > 0 && !wonAward;

  const qc = useQueryClient();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineError, setDeclineError] = useState(false);
  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/tenders/${t._id}/invites/${t.participation.inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined", reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decline invite");
      return data;
    },
    onSuccess: () => {
      toast.success("Invitation declined — the company has been notified with your note");
      setDeclineOpen(false);
      setDeclineReason("");
      setDeclineError(false);
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const handleDeclineSubmit = () => {
    if (!declineReason.trim()) {
      setDeclineError(true);
      toast.error("Please share a short reason — it is required so the company understands your decline.");
      return;
    }
    declineMutation.mutate(declineReason.trim());
  };

  return (
    <Card className={`card-3d hover:border-primary/30 border-0 ${isArchived ? "bg-muted/15 border-border/40" : ""}`}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                {PROCUREMENT_TYPES[t.type as keyof typeof PROCUREMENT_TYPES]?.label ?? t.type}
              </Badge>
              <Badge variant={STATUS_COLORS[t.status] ?? "outline"} className="shrink-0 font-medium">
                {STATUS_LABELS[t.status] ?? t.status}
              </Badge>
              {wonAward && (
                <span className="badge-celebrate-chip inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
                  <Trophy className="h-3 w-3" /> Awarded — Congratulations!
                </span>
              )}
              {lostAward && (
                <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Not awarded this time
                </Badge>
              )}
              {t.createdAt && (
                <Badge variant="secondary" className="text-[11px] font-medium gap-1 bg-muted/70 text-foreground border-border shrink-0">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  Issued: <span className="font-bold">{format(new Date(t.createdAt), "dd MMM yyyy")}</span>
                </Badge>
              )}
              {t.participation?.status === "requested" && <Badge variant="warning">Waiting for approval</Badge>}
              {t.participation?.status === "invited" && <Badge variant="success">Invited</Badge>}
              {t.participation?.status === "accepted" && <Badge variant="success">Approved</Badge>}
              {deadlineOpen && t.bidDeadline && (
                <Badge variant="secondary" className="shrink-0 flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <Clock className="h-3 w-3 animate-pulse" />
                  <DeadlineCountdown deadline={t.bidDeadline} className="font-mono text-[11px]" />
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-[11px] px-2 gap-1 rounded-md shrink-0"
                onClick={() => onOpenSummary(t)}
              >
                <FileText className="h-3 w-3 text-muted-foreground" />
                Package & Bids Details
              </Button>
            </div>
            <Link href={`/tenders/${t._id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
              {t.title}
            </Link>
            {t.company?.companyName && (
              <div className="flex items-center gap-1.5 text-sm text-foreground mt-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t.company.companyName}</span>
              </div>
            )}
            {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
          </div>
          <div className="text-right shrink-0">
            {t.estimatedValue && (
              <div className="font-semibold text-foreground">{t.currency} {t.estimatedValue.toLocaleString()}</div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
          {t.location && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{t.location}</span>}
          {t.createdAt && (
            <span className="flex items-center gap-1 font-semibold text-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/50">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Issued: {format(new Date(t.createdAt), "dd MMM yyyy")}
            </span>
          )}
          {t.bidDeadline && awaiting ? (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <CalendarClock className="h-3.5 w-3.5" />
              Deadline: {format(new Date(t.bidDeadline), "dd MMM yyyy")}
              {deadlineOpen && <DeadlineCountdown deadline={t.bidDeadline} />}
            </span>
          ) : t.bidDeadline ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Deadline: {format(new Date(t.bidDeadline), "dd MMM yyyy")}
              {deadlineOpen && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  (<DeadlineCountdown deadline={t.bidDeadline} />)
                </span>
              )}
            </span>
          ) : null}
          <span>Posted {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
        </div>

        {submitted.length > 0 && (
          <div className="space-y-2 pt-1">
            {submitted.map((bid: any) => (
              <div key={bid._id} className="rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/bids/${bid._id}`} className="block">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <Badge variant={BID_STATUS_COLORS[bid.status] ?? "outline"}>{statusLabel(bid.status)}</Badge>
                        {t.status === "awarded" && isWinningBid(bid) && (
                          <span className="badge-celebrate-chip inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            <Trophy className="h-3 w-3" /> Awarded!
                          </span>
                        )}
                        {bid.revisionRequest?.pendingApproval && !bid.revisionRequest?.open && <Badge variant="warning">Request to revise</Badge>}
                        {bid.revisionRequest?.open && <Badge variant="warning">Revision requested</Badge>}
                        {bid.revisedAt && !bid.revisionRequest?.open && !bid.revisionRequest?.pendingApproval && <Badge variant="outline">Revised</Badge>}
                        <span className="text-xs font-mono text-muted-foreground">#{String(bid._id).slice(-6)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {bid.submittedAt
                          ? `Submitted ${formatDistanceToNow(new Date(bid.submittedAt), { addSuffix: true })}`
                          : `Updated ${formatDistanceToNow(new Date(bid.updatedAt || bid.createdAt), { addSuffix: true })}`}
                      </div>
                    </Link>
                    {bid.revisionRequest?.open && bid.revisionRequest.source === "vendor_invite" && (
                      <Link href={`/bids/${bid._id}/edit`} className="inline-block mt-2">
                        <Button size="sm" id={`revise-from-tender-${bid._id}`}>
                          <RefreshCw className="h-3.5 w-3.5" /> Revise bid
                        </Button>
                      </Link>
                    )}
                  </div>
                  {bid.totalPrice != null && (
                    <Link href={`/bids/${bid._id}`} className="text-sm font-semibold flex items-center gap-0.5 shrink-0 hover:text-primary">
                      <DollarSign className="h-3.5 w-3.5" />
                      {bid.currency} {Number(bid.totalPrice).toLocaleString()}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {awaiting && (
          <div className="flex flex-wrap gap-2 pt-1">
            {draft ? (
              <Link href={`/bids/${draft._id}/edit`}>
                <Button size="sm" id={`modify-offer-${t._id}`}><Pencil className="h-3.5 w-3.5" /> Continue draft</Button>
              </Link>
            ) : canOffer && deadlineOpen ? (
              <Link href={`/bids/new/${t._id}`}>
                <Button size="sm" id={`prepare-offer-${t._id}`}><Plus className="h-3.5 w-3.5" /> Prepare offer</Button>
              </Link>
            ) : null}
            {t.participation?.inviteId && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                id={`decline-offer-${t._id}`}
                onClick={() => setDeclineOpen(true)}
              >
                <Ban className="h-3.5 w-3.5" /> Apologize for declining
              </Button>
            )}
            <Link href={`/tenders/${t._id}`}>
              <Button size="sm" variant="outline">View package</Button>
            </Link>
          </div>
        )}
      </CardContent>
      <Dialog open={declineOpen} onOpenChange={(open) => { setDeclineOpen(open); if (!open) { setDeclineError(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline this invitation</DialogTitle>
            <DialogDescription>
              We&apos;re sorry to see you pass on <span className="font-medium text-foreground">{t.title}</span>.
              Please let {t.company?.companyName || "the company"} know why — a reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor={`decline-reason-${t._id}`} className="text-sm font-medium">
              Reason for declining <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={`decline-reason-${t._id}`}
              rows={4}
              placeholder="e.g. Capacity fully booked this quarter, scope outside our expertise…"
              value={declineReason}
              onChange={(e) => { setDeclineReason(e.target.value); if (e.target.value.trim()) setDeclineError(false); }}
              className={declineError ? "border-destructive focus-visible:ring-destructive/40" : ""}
            />
            {declineError && (
              <p className="text-xs text-destructive font-medium">A reason is mandatory before you can decline.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)}>Keep participating</Button>
            <Button variant="destructive" onClick={handleDeclineSubmit} disabled={declineMutation.isPending}>
              {declineMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Decline with apology
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

