"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Loader2, Download, Trash2, CalendarClock, FileText, Mail, Check, Archive, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { downloadBoqFile } from "@/lib/boq-browser";
import { money } from "@/lib/comparison";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import { OfflineBidUploadDialog } from "@/components/offline-bid-upload-dialog";
import { OfflineInviteDialog } from "@/components/offline-invite-dialog";
import { DeadlineCountdown } from "@/components/deadline-countdown";

const BID_STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  submitted: "default",
  under_review: "warning",
  shortlisted: "success",
  accepted: "success",
  rejected: "destructive",
  withdrawn: "outline",
};

const TENDER_STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary",
  published: "success",
  closed: "outline",
  awarded: "default",
  cancelled: "destructive",
};

function statusLabel(status?: string) {
  return (status || "").replace(/_/g, " ");
}

function typeLabel(type?: string) {
  const entry = PROCUREMENT_TYPES[type as keyof typeof PROCUREMENT_TYPES];
  return entry?.label ?? (type || "").toUpperCase();
}

export default function OfflineBidsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [selectedTenderId, setSelectedTenderId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["offline-bids"],
    queryFn: () => fetch("/api/offline-bids").then((r) => (r.ok ? r.json() : [])),
    enabled: !!session,
  });

  const { data: tenderData } = useQuery({
    queryKey: ["tenders", "offline-bids-page"],
    queryFn: () => fetch("/api/tenders?limit=100").then((r) => r.json()),
    enabled: !!session,
  });

  const publishedPackages = useMemo(
    () => (tenderData?.items ?? []).filter((t: any) => t.status === "published"),
    [tenderData]
  );
  const selectedTender = publishedPackages.find((t: any) => String(t._id) === selectedTenderId);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["offline-bids"] });

  const downloadWorkbook = (tenderId: string, title: string) =>
    downloadBoqFile(`/api/offline-bids/${tenderId}/workbook`, `offline-offer-${title}.xlsx`).catch(() => {});

  const removeBid = async (tenderId: string, bidId: string, supplierName: string) => {
    if (!window.confirm(`Delete the offline offer from ${supplierName}? The uploaded files will be removed.`)) return;
    setDeletingId(bidId);
    try {
      await fetch(`/api/offline-bids/${tenderId}/${bidId}`, { method: "DELETE" });
      refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const approveInvite = async (tenderId: string, inviteId: string) => {
    setInviteBusyId(inviteId);
    try {
      await fetch(`/api/offline-bids/${tenderId}/invites/${inviteId}/approve`, { method: "POST" });
      refresh();
    } finally {
      setInviteBusyId(null);
    }
  };

  const removeInvite = async (tenderId: string, inviteId: string, supplierName: string) => {
    if (!window.confirm(`Remove the offline invite for ${supplierName}?`)) return;
    setInviteBusyId(inviteId);
    try {
      await fetch(`/api/offline-bids/${tenderId}/invites/${inviteId}`, { method: "DELETE" });
      refresh();
    } finally {
      setInviteBusyId(null);
    }
  };

  const { activeRows, archivedRows } = useMemo(() => {
    const isArchived = (row: any) => {
      const isConcluded = ["closed", "awarded", "cancelled", "archived"].includes(row.tender.status);
      const isPastDue = row.tender.bidDeadline && new Date(row.tender.bidDeadline).getTime() < Date.now();
      return isConcluded || isPastDue;
    };
    return {
      activeRows: (rows as any[]).filter((r) => !isArchived(r)),
      archivedRows: (rows as any[]).filter(isArchived),
    };
  }, [rows]);

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
          Offline Bids
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          For suppliers who are not registered on the platform: download a fillable Excel workbook, email it to the
          supplier, and upload the filled workbook together with their signed PDF. The offer then flows into the
          comparison and finalization like any online bid.
        </p>
      </div>

      <Card className="border-0 shadow-[var(--shadow-card)] card-3d">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold font-[family-name:var(--font-heading)]">Start an offline offer</h2>
              <p className="text-xs text-muted-foreground">Pick a published package, download the workbook, and email it to the supplier.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Select value={selectedTenderId} onValueChange={setSelectedTenderId}>
              <SelectTrigger className="sm:max-w-md">
                <SelectValue placeholder="Choose a published package" />
              </SelectTrigger>
              <SelectContent>
                {publishedPackages.map((t: any) => (
                  <SelectItem key={String(t._id)} value={String(t._id)}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTender && (
              <div className="flex flex-wrap gap-2">
                <OfflineInviteDialog
                  tenderId={selectedTenderId}
                  tenderTitle={selectedTender.title}
                  onInvited={refresh}
                />
                <Button
                  size="sm"
                  variant="outline"
                  id={`offline-download-${selectedTenderId}`}
                  onClick={() => downloadWorkbook(selectedTenderId, selectedTender.title)}
                >
                  <Download className="h-3.5 w-3.5" /> Download Excel
                </Button>
                <OfflineBidUploadDialog
                  tenderId={selectedTenderId}
                  tenderTitle={selectedTender.title}
                  onUploaded={refresh}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Packages with offline bids or invites</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage and review offline workbook submissions and invites.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        ) : (rows as any[]).length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No offline bids or invites yet</p>
            <p className="text-xs text-muted-foreground mt-1">Invite a supplier and upload their filled workbook above — the package will appear here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Offline Packages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Packages with Offline Offers ({activeRows.length})
                </h3>
              </div>
              {activeRows.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-muted/10 text-xs text-muted-foreground">
                  No active packages with offline offers. Historical offline bids are listed below.
                </div>
              ) : (
                <div className="space-y-4 stagger-children">
                  {activeRows.map((row: any) => (
                    <OfflinePackageCard
                      key={String(row.tender._id)}
                      row={row}
                      isArchived={false}
                      onRefresh={refresh}
                      downloadWorkbook={downloadWorkbook}
                      removeBid={removeBid}
                      approveInvite={approveInvite}
                      removeInvite={removeInvite}
                      deletingId={deletingId}
                      inviteBusyId={inviteBusyId}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Archived Offline Packages */}
            {archivedRows.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Archived & Past Offline Packages ({archivedRows.length})
                    </h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Closed / Awarded / Expired</Badge>
                </div>
                <div className="space-y-4 stagger-children opacity-90">
                  {archivedRows.map((row: any) => (
                    <OfflinePackageCard
                      key={String(row.tender._id)}
                      row={row}
                      isArchived={true}
                      onRefresh={refresh}
                      downloadWorkbook={downloadWorkbook}
                      removeBid={removeBid}
                      approveInvite={approveInvite}
                      removeInvite={removeInvite}
                      deletingId={deletingId}
                      inviteBusyId={inviteBusyId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function OfflinePackageCard({
  row,
  isArchived,
  onRefresh,
  downloadWorkbook,
  removeBid,
  approveInvite,
  removeInvite,
  deletingId,
  inviteBusyId,
}: {
  row: any;
  isArchived: boolean;
  onRefresh: () => void;
  downloadWorkbook: (id: string, title: string) => void;
  removeBid: (tenderId: string, bidId: string, name: string) => void;
  approveInvite: (tenderId: string, inviteId: string) => void;
  removeInvite: (tenderId: string, inviteId: string, name: string) => void;
  deletingId: string | null;
  inviteBusyId: string | null;
}) {
  const isPastDue = row.tender.bidDeadline && new Date(row.tender.bidDeadline).getTime() < Date.now();
  const issuedDate = row.tender.createdAt ? format(new Date(row.tender.createdAt), "dd MMM yyyy") : null;

  return (
    <Card className={`border-0 shadow-[var(--shadow-card)] card-3d ${isArchived ? "bg-card/70" : ""}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="secondary">{typeLabel(row.tender.type)}</Badge>
              <Badge variant={TENDER_STATUS_COLORS[row.tender.status] ?? "outline"}>{statusLabel(row.tender.status)}</Badge>
              {issuedDate && (
                <Badge variant="outline" className="text-[11px] font-semibold bg-background/80 border-primary/20 text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary" /> Issued: {issuedDate}
                </Badge>
              )}
            </div>
            <Link
              href={`/tenders/${row.tender._id}`}
              className="font-bold text-foreground hover:text-primary transition-colors block truncate"
            >
              {row.tender.title}
            </Link>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {row.tender.bidDeadline && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Deadline {format(new Date(row.tender.bidDeadline), "d MMM yyyy")}
                </span>
              )}
              {!isArchived && !isPastDue && row.tender.bidDeadline && (
                <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                  <Clock className="h-3 w-3" />
                  <DeadlineCountdown deadline={row.tender.bidDeadline} />
                </span>
              )}
              {isPastDue && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Deadline passed</Badge>
              )}
              <span className="font-semibold text-foreground">
                · {row.offlineCount} offline bid{row.offlineCount === 1 ? "" : "s"}
                {(row.invites?.length ?? 0) > 0 && ` · ${row.invites.length} invite${row.invites.length === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <OfflineInviteDialog
              tenderId={String(row.tender._id)}
              tenderTitle={row.tender.title}
              onInvited={onRefresh}
            />
            <Button
              size="sm"
              variant="outline"
              id={`offline-download-${row.tender._id}`}
              onClick={() => downloadWorkbook(String(row.tender._id), row.tender.title)}
            >
              <Download className="h-3.5 w-3.5" /> Excel
            </Button>
            <OfflineBidUploadDialog
              tenderId={String(row.tender._id)}
              tenderTitle={row.tender.title}
              onUploaded={onRefresh}
            />
          </div>
        </div>

        {(row.invites ?? []).length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Invited offline suppliers</div>
            {row.invites.map((invite: any) => (
              <div
                key={String(invite._id)}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-muted/10 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground truncate">{invite.supplierName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {invite.email}
                    {invite.note ? ` · ${invite.note}` : ""}
                  </div>
                </div>
                <Badge variant={invite.status === "approved" ? "success" : "warning"}>
                  {invite.status === "approved" ? "Approved" : "Pending approval"}
                </Badge>
                <div className="flex items-center gap-1">
                  {invite.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={inviteBusyId === String(invite._id)}
                      onClick={() => approveInvite(String(row.tender._id), String(invite._id))}
                    >
                      {inviteBusyId === String(invite._id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Approve
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={inviteBusyId === String(invite._id)}
                    onClick={() => removeInvite(String(row.tender._id), String(invite._id), invite.supplierName)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {row.bids.map((bid: any) => (
            <div
              key={String(bid._id)}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{bid.supplier?.name ?? "Offline supplier"}</div>
                <div className="text-xs text-muted-foreground">
                  {money(bid.totalPrice, bid.currency || row.tender.currency)}
                  {bid.submittedAt ? ` · received ${format(new Date(bid.submittedAt), "d MMM yyyy")}` : ""}
                </div>
              </div>
              <Badge variant={BID_STATUS_COLORS[bid.status] ?? "outline"}>{statusLabel(bid.status)}</Badge>
              <div className="flex items-center gap-1">
                {bid.workbook?.fileUrl && (
                  <a href={bid.workbook.fileUrl} target="_blank" rel="noopener noreferrer" title={bid.workbook.name}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {bid.signedPdf?.fileUrl && (
                  <a href={bid.signedPdf.fileUrl} target="_blank" rel="noopener noreferrer" title={bid.signedPdf.name}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                <Link href={`/bids/${bid._id}`}>
                  <Button size="sm" variant="outline">View offer</Button>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={deletingId === String(bid._id)}
                  onClick={() => removeBid(String(row.tender._id), String(bid._id), bid.supplier?.name ?? "this supplier")}
                >
                  {deletingId === String(bid._id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
