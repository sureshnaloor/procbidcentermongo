"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, CalendarClock, Calendar, MapPin, Loader2, Building2, Pencil, DollarSign, RefreshCw, AlertTriangle, Clock, Archive, Trophy, XCircle, CheckCircle2, Eye } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import { DeadlineCountdown } from "@/components/deadline-countdown";
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [browseAll, setBrowseAll] = useState(false);

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

  const qParams = new URLSearchParams({ limit: vendorMine ? "100" : "50" });
  if (search) qParams.set("search", search);
  if (status) qParams.set("status", status);
  if (type) qParams.set("type", type);
  if (vendorMine) qParams.set("mine", "1");

  const { data, isLoading } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", search, status, type, vendorMine],
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

  const activeTenders = tenders.filter((t: any) => !isArchivedTender(t));
  const archivedTenders = tenders.filter((t: any) => isArchivedTender(t));

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

      <Card className="glass border-0 p-1">
        <CardContent className="p-3 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tenders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" id="tender-search" />
          </div>
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48" id="tender-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {!isVendor && <SelectItem value="draft">Draft</SelectItem>}
              <SelectItem value="published">Published (Active)</SelectItem>
              <SelectItem value="closed">Closed (External Award)</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
            <SelectTrigger className="w-32" id="tender-type-filter"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="rfp">RFP</SelectItem>
              <SelectItem value="rfq">RFQ</SelectItem>
              <SelectItem value="tender">Tender</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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
          {/* Active / Current Tenders */}
          {activeTenders.length > 0 && (
            <div className="space-y-3">
              {archivedTenders.length > 0 && (
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    Current & Active Packages
                    <Badge variant="secondary" className="text-xs font-mono">{activeTenders.length}</Badge>
                  </h2>
                </div>
              )}
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
            </div>
          )}

          {/* If there are no active tenders but there are archived tenders, show a note */}
          {activeTenders.length === 0 && archivedTenders.length > 0 && !status && (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground bg-muted/10">
              No currently active or open tenders. All existing packages are archived below.
            </div>
          )}

          {/* Archived / Past Tenders */}
          {archivedTenders.length > 0 && (
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
            </div>
            <div className="flex items-center gap-2">
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
            <Link href={`/tenders/${t._id}`}>
              <Button size="sm" variant="outline">View package</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

