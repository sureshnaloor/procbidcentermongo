"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, DollarSign, Clock, Building2, CalendarClock, User, Search, Scale, Archive, Calendar, Award, XCircle, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import { DeadlineCountdown } from "@/components/deadline-countdown";

const BID_STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary",
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

function receivedAt(bid: any): Date | null {
  const raw = bid.submittedAt || bid.createdAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function BidsPage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  const isAdmin = user?.role === "admin" || user?.isSuperAdmin;

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const { data: bids = [], isLoading: loadingBids } = useQuery({
    queryKey: ["bids"],
    queryFn: () => fetch("/api/bids").then((r) => r.json()),
    enabled: !!session,
  });

  const isVendor = profile?.userType === "vendor";
  const isCompany = profile?.userType === "company";
  const isArranged = isCompany || isAdmin;

  const { data: tenderData, isLoading: loadingTenders } = useQuery({
    queryKey: ["tenders", "bids-page", isAdmin],
    queryFn: () => {
      const url = isAdmin ? "/api/tenders?limit=100&forAdmin=true" : "/api/tenders?limit=100";
      return fetch(url).then((r) => r.json());
    },
    enabled: !!session && isArranged,
  });

  const packages = useMemo(() => {
    const rawTenders: any[] = tenderData?.items ?? [];
    const byTender = new Map<string, any[]>();
    for (const bid of bids as any[]) {
      const key = String(bid.tenderId);
      const list = byTender.get(key) ?? [];
      list.push(bid);
      byTender.set(key, list);
    }

    // Collect all unique tenders (including any referenced by bids that might not be in the items list)
    const tendersMap = new Map<string, any>();
    for (const t of rawTenders) {
      if (t._id) tendersMap.set(String(t._id), t);
    }
    for (const bid of bids as any[]) {
      if (bid.tender && bid.tender._id && !tendersMap.has(String(bid.tender._id))) {
        tendersMap.set(String(bid.tender._id), bid.tender);
      }
    }

    const tenderList = [...tendersMap.values()];
    const filteredTenders = tenderList.filter((t: any) => {
      if (!t.status) return false;
      if (isCompany && t.status === "draft") return false;
      if (isAdmin && t.status === "draft" && !(byTender.get(String(t._id))?.length)) return false;
      return true;
    });

    const groups = filteredTenders.map((tender: any) => {
      const nested = (byTender.get(String(tender._id)) ?? []).slice().sort((a: any, b: any) => {
        const da = receivedAt(a)?.getTime() ?? 0;
        const db = receivedAt(b)?.getTime() ?? 0;
        return db - da;
      });
      return { tender, bids: nested };
    });

    // Sort packages: packages with bids first, then by most recent bid/creation
    return groups
      .filter(({ tender, bids: nested }) => {
        if (typeFilter !== "all" && tender.type !== typeFilter) return false;
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const titleMatch = (tender.title || "").toLowerCase().includes(q);
        const companyMatch = (tender.company?.companyName || "").toLowerCase().includes(q);
        const vendorMatch = nested.some((b: any) =>
          (b.vendor?.companyName || "").toLowerCase().includes(q) ||
          (b.vendor?.contactPerson || "").toLowerCase().includes(q)
        );
        return titleMatch || companyMatch || vendorMatch;
      })
      .sort((a, b) => {
        const aHasBids = a.bids.length > 0 ? 1 : 0;
        const bHasBids = b.bids.length > 0 ? 1 : 0;
        if (aHasBids !== bHasBids) return bHasBids - aHasBids;
        const aTime = a.bids[0] ? (receivedAt(a.bids[0])?.getTime() ?? 0) : new Date(a.tender.createdAt || 0).getTime();
        const bTime = b.bids[0] ? (receivedAt(b.bids[0])?.getTime() ?? 0) : new Date(b.tender.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [tenderData, bids, isCompany, isAdmin, search, typeFilter]);

  const { activePackages, archivedPackages } = useMemo(() => {
    const isArchived = (pkg: { tender: any }) => {
      const isConcluded = ["closed", "awarded", "cancelled", "archived"].includes(pkg.tender.status);
      const isPastDue = pkg.tender.bidDeadline && new Date(pkg.tender.bidDeadline).getTime() < Date.now();
      return isConcluded || isPastDue;
    };
    return {
      activePackages: packages.filter((p) => !isArchived(p)),
      archivedPackages: packages.filter(isArchived),
    };
  }, [packages]);

  const { activeVendorBids, archivedVendorBids } = useMemo(() => {
    const list = bids as any[];
    const isArchived = (b: any) => {
      const isTenderConcluded = ["closed", "awarded", "cancelled", "archived"].includes(b.tender?.status);
      const isBidConcluded = ["accepted", "rejected", "withdrawn"].includes(b.status);
      const isPastDue = b.tender?.bidDeadline && new Date(b.tender.bidDeadline).getTime() < Date.now();
      return isTenderConcluded || isBidConcluded || isPastDue;
    };
    return {
      activeVendorBids: list.filter((b) => !isArchived(b)),
      archivedVendorBids: list.filter(isArchived),
    };
  }, [bids]);

  const isLoading = loadingProfile || loadingBids || (isArranged && loadingTenders);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
            {isAdmin ? "All Bids by Tender" : isCompany ? "Bids Received" : "My Bids"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin
              ? "All submitted bids arranged and clustered by their parent Tender, RFP, and RFQ packages."
              : isCompany
              ? "Offers are grouped under each package you have issued."
              : "Track the status of all offers you have submitted."}
          </p>
        </div>
      </div>

      {isArranged && (
        <div className="flex flex-wrap items-center gap-3 glass p-2 rounded-2xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tender, company, or supplier..."
              className="pl-9 h-9 text-xs rounded-xl bg-background/50"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl bg-background/50">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="rfq">RFQ</SelectItem>
              <SelectItem value="rfp">RFP</SelectItem>
              <SelectItem value="tender">Tender</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : isArranged ? (
        packages.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              {search ? "No matching packages found." : "No packages or bids available yet."}
            </p>
            {isCompany && (
              <Link href="/tenders" className="text-sm font-semibold text-primary hover:text-primary/80 link-underline mt-2 inline-block">Go to my tenders</Link>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active / Open Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active & Live Packages ({activePackages.length})
                </h2>
              </div>
              {activePackages.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-muted/10 text-sm text-muted-foreground">
                  No active open packages right now. Past and concluded packages are listed below.
                </div>
              ) : (
                <div className="grid gap-5 stagger-children">
                  {activePackages.map(({ tender, bids: nested }) => (
                    <TenderPackageCard key={tender._id} tender={tender} bids={nested} isArchived={false} />
                  ))}
                </div>
              )}
            </div>

            {/* Archived / Past Section */}
            {archivedPackages.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Archived & Past Packages ({archivedPackages.length})
                    </h2>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Closed / Awarded / Expired</Badge>
                </div>
                <div className="grid gap-5 stagger-children opacity-95">
                  {archivedPackages.map(({ tender, bids: nested }) => (
                    <TenderPackageCard key={tender._id} tender={tender} bids={nested} isArchived={true} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      ) : (bids as any[]).length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/20">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            {isVendor
              ? "No offers yet. Browse tenders and request to participate, then prepare your offer once approved."
              : "No offers yet."}
          </p>
          <Link href="/tenders" className="text-sm font-semibold text-primary hover:text-primary/80 link-underline mt-2 inline-block">Browse tenders</Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Vendor Bids */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Bids & Inquiries ({activeVendorBids.length})
              </h2>
            </div>
            {activeVendorBids.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-muted/10 text-sm text-muted-foreground">
                No active bids in progress. Concluded bids are shown in the archive below.
              </div>
            ) : (
              <div className="grid gap-4 stagger-children">
                {activeVendorBids.map((b: any) => (
                  <VendorBidListItem key={b._id} bid={b} isArchived={false} />
                ))}
              </div>
            )}
          </div>

          {/* Archived Vendor Bids */}
          {archivedVendorBids.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Archived & Past Bids ({archivedVendorBids.length})
                  </h2>
                </div>
                <Badge variant="secondary" className="text-[10px]">Concluded / Expired</Badge>
              </div>
              <div className="grid gap-4 stagger-children opacity-90">
                {archivedVendorBids.map((b: any) => (
                  <VendorBidListItem key={b._id} bid={b} isArchived={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TenderPackageCard({ tender, bids, isArchived }: { tender: any; bids: any[]; isArchived: boolean }) {
  const typeMeta = PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES];
  const isPastDue = tender.bidDeadline && new Date(tender.bidDeadline).getTime() < Date.now();
  const issuedDate = tender.createdAt ? format(new Date(tender.createdAt), "dd MMM yyyy") : null;

  return (
    <Card className={`overflow-hidden border-0 shadow-[var(--shadow-card)] ${isArchived ? "bg-card/70" : ""}`}>
      <CardHeader className="pb-3 border-b border-border bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] uppercase font-bold">{typeMeta?.label ?? tender.type}</Badge>
              <Badge variant={TENDER_STATUS_COLORS[tender.status] ?? "outline"}>{statusLabel(tender.status)}</Badge>
              {issuedDate && (
                <Badge variant="outline" className="text-[11px] font-semibold bg-background/80 border-primary/20 text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary" /> Issued: {issuedDate}
                </Badge>
              )}
              {tender.company?.companyName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                  <Building2 className="h-3 w-3 text-muted-foreground" />
                  {tender.company.companyName}
                </span>
              )}
              <span className="text-xs text-muted-foreground font-semibold">
                · {bids.length} {bids.length === 1 ? "offer" : "offers"}
              </span>
            </div>
            <CardTitle className="text-base font-[family-name:var(--font-heading)]">
              <Link href={`/tenders/${tender._id}`} className="hover:text-primary transition-colors">{tender.title}</Link>
            </CardTitle>
            {tender.bidDeadline && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  Deadline {format(new Date(tender.bidDeadline), "d MMM yyyy")}
                </span>
                {!isArchived && !isPastDue && (
                  <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                    <Clock className="h-3 w-3" />
                    <DeadlineCountdown deadline={tender.bidDeadline} />
                  </span>
                )}
                {isPastDue && (
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Deadline passed</Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/comparisons/${tender._id}`}>
              <Button size="sm" variant="outline" id={`statement-${tender._id}`}>Statement</Button>
            </Link>
            {bids.length > 1 && (
              <Link href={`/bids/comparison/${tender._id}`}>
                <Button size="sm" variant="outline" id={`compare-${tender._id}`}>
                  <Scale className="h-3.5 w-3.5 mr-1" />Compare
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {bids.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No offers received on this package yet.</p>
        ) : (
          bids.map((b: any) => (
            <CompanyBidCard key={b._id} bid={b} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function VendorBidListItem({ bid, isArchived }: { bid: any; isArchived: boolean }) {
  const tender = bid.tender;
  const issuedDate = tender?.createdAt ? format(new Date(tender.createdAt), "dd MMM yyyy") : null;
  const isPastDue = tender?.bidDeadline && new Date(tender.bidDeadline).getTime() < Date.now();

  return (
    <Link href={`/bids/${bid._id}`}>
      <Card className={`card-3d hover:border-primary/30 cursor-pointer border-0 ${isArchived ? "bg-card/70" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant={BID_STATUS_COLORS[bid.status] ?? "outline"} className="shrink-0">{statusLabel(bid.status)}</Badge>
                {tender?.status && (
                  <Badge variant={TENDER_STATUS_COLORS[tender.status] ?? "outline"} className="text-[10px]">
                    Package: {statusLabel(tender.status)}
                  </Badge>
                )}
                {issuedDate && (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-background/80 border-primary/20 text-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-primary" /> Issued: {issuedDate}
                  </Badge>
                )}
                {bid.revisionRequest?.pendingApproval && !bid.revisionRequest?.open && <Badge variant="warning">Request to revise</Badge>}
                {bid.revisionRequest?.open && <Badge variant="warning">Revision requested</Badge>}
                {bid.revisedAt && !bid.revisionRequest?.open && !bid.revisionRequest?.pendingApproval && <Badge variant="outline">Revised</Badge>}
              </div>
              <h2 className="font-semibold text-foreground">{tender?.title || `Bid #${String(bid._id).slice(-6)}`}</h2>
            </div>
            <div className="text-right shrink-0">
              {bid.totalPrice != null && (
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <DollarSign className="h-3.5 w-3.5" />
                  {bid.currency} {Number(bid.totalPrice).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Validity: {bid.validityDays} days</span>
            {receivedAt(bid) && (
              <span>{bid.submittedAt ? "Submitted" : "Created"} {formatDistanceToNow(receivedAt(bid)!, { addSuffix: true })}</span>
            )}
            {tender?.bidDeadline && !isArchived && !isPastDue && (
              <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                <Clock className="h-3 w-3" />
                <DeadlineCountdown deadline={tender.bidDeadline} />
              </span>
            )}
            {isPastDue && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Deadline passed</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CompanyBidCard({ bid }: { bid: any }) {
  const received = receivedAt(bid);
  const location = [bid.vendor?.city, bid.vendor?.country].filter(Boolean).join(", ");
  return (
    <Link href={`/bids/${bid._id}`} className="block">
      <div className="rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/30 transition-all p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant={BID_STATUS_COLORS[bid.status] ?? "outline"}>{statusLabel(bid.status)}</Badge>
              {bid.revisionRequest?.pendingApproval && !bid.revisionRequest?.open && <Badge variant="warning">Request to revise</Badge>}
              {bid.revisionRequest?.open && <Badge variant="warning">Revision requested</Badge>}
              {bid.revisedAt && !bid.revisionRequest?.open && !bid.revisionRequest?.pendingApproval && <Badge variant="outline">Revised</Badge>}
              <span className="text-xs text-muted-foreground font-mono">#{String(bid._id).slice(-6)}</span>
            </div>
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{bid.vendor?.companyName || "Supplier"}</span>
            </div>
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {bid.vendor?.contactPerson && (
                <div className="flex items-center gap-1"><User className="h-3 w-3" />{bid.vendor.contactPerson}</div>
              )}
              {location && <div>{location}</div>}
              {received && (
                <div>
                  Received {format(received, "d MMM yyyy")} · {formatDistanceToNow(received, { addSuffix: true })}
                </div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {bid.totalPrice != null && (
              <div className="text-sm font-semibold">
                {bid.currency} {Number(bid.totalPrice).toLocaleString()}
              </div>
            )}
            <div className="text-xs text-muted-foreground mt-1">Validity {bid.validityDays} days</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
