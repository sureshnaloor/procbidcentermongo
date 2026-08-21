"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, CalendarClock, MapPin, Loader2, Building2, Pencil, DollarSign, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import { DeadlineCountdown } from "@/components/deadline-countdown";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary",
  published: "success",
  closed: "outline",
  awarded: "default",
  cancelled: "destructive",
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
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [browseAll, setBrowseAll] = useState(false);

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const isCompany = profile?.userType === "company";
  const isVendor = profile?.userType === "vendor";
  const vendorMine = isVendor && !browseAll;

  const qParams = new URLSearchParams({ limit: vendorMine ? "100" : "20" });
  if (search) qParams.set("search", search);
  if (status) qParams.set("status", status);
  if (type) qParams.set("type", type);
  if (vendorMine) qParams.set("mine", "1");

  const { data, isLoading } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", search, status, type, vendorMine],
    queryFn: () => fetch(`/api/tenders?${qParams}`).then((r) => r.json()),
    enabled: !!session && !loadingProfile,
  });

  const tenders = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenders</h1>
          {isVendor && (
            <p className="text-sm text-muted-foreground mt-1">
              {vendorMine
                ? "Packages you were invited to, or where your request was approved."
                : "All published packages you can request to join."}
            </p>
          )}
        </div>
        {isCompany && (
          <Link href="/tenders/new">
            <Button size="sm" id="new-tender-top-btn"><Plus /> New Tender</Button>
          </Link>
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

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tenders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" id="tender-search" />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36" id="tender-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {!isVendor && <SelectItem value="draft">Draft</SelectItem>}
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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
      </div>

      {isLoading || loadingProfile ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-muted-foreground">
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
        <div className="grid gap-4">
          {tenders.map((t: any) => (
            isVendor ? <VendorTenderCard key={t._id} tender={t} /> : <CompanyTenderCard key={t._id} tender={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyTenderCard({ tender: t }: { tender: any }) {
  return (
    <Link href={`/tenders/${t._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs uppercase shrink-0">
                  {PROCUREMENT_TYPES[t.type as keyof typeof PROCUREMENT_TYPES]?.label ?? t.type}
                </Badge>
                <Badge variant={STATUS_COLORS[t.status] ?? "outline"} className="shrink-0">{t.status}</Badge>
              </div>
              <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{t.title}</h2>
              {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
            </div>
            <div className="text-right shrink-0">
              {t.estimatedValue && (
                <div className="font-semibold text-foreground">{t.currency} {t.estimatedValue.toLocaleString()}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {t.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</span>}
            {t.bidDeadline && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />Deadline: {new Date(t.bidDeadline).toLocaleDateString()}</span>}
            <span>Posted {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function VendorTenderCard({ tender: t }: { tender: any }) {
  const myBids = Array.isArray(t.myBids) ? t.myBids : [];
  const submitted = myBids.filter((b: any) => b.status && b.status !== "draft");
  const draft = myBids.find((b: any) => b.status === "draft");
  const canOffer = Boolean(t.participation?.canPrepareOffer);
  const authorized = t.participation?.status === "invited" || t.participation?.status === "accepted";
  const awaiting = !submitted.length && authorized;
  const deadlineOpen = !t.bidDeadline || new Date(t.bidDeadline).getTime() >= Date.now();

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs uppercase shrink-0">
                {PROCUREMENT_TYPES[t.type as keyof typeof PROCUREMENT_TYPES]?.label ?? t.type}
              </Badge>
              <Badge variant={STATUS_COLORS[t.status] ?? "outline"} className="shrink-0">{t.status}</Badge>
              {t.participation?.status === "requested" && <Badge variant="warning">Waiting for approval</Badge>}
              {t.participation?.status === "invited" && <Badge variant="success">Invited</Badge>}
              {t.participation?.status === "accepted" && <Badge variant="success">Approved</Badge>}
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

        <div className="flex flex-wrap items-center gap-4 text-xs">
          {t.location && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{t.location}</span>}
          {t.bidDeadline && awaiting ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <CalendarClock className="h-3.5 w-3.5" />
              Deadline: {new Date(t.bidDeadline).toLocaleDateString()}
              {deadlineOpen && <DeadlineCountdown deadline={t.bidDeadline} />}
            </span>
          ) : t.bidDeadline ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarClock className="h-3 w-3" />Deadline: {new Date(t.bidDeadline).toLocaleDateString()}
            </span>
          ) : null}
          <span className="text-muted-foreground">Posted {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
        </div>

        {submitted.length > 0 && (
          <div className="space-y-2 pt-1">
            {submitted.map((bid: any) => (
              <div key={bid._id} className="rounded-lg border border-border bg-muted/30 hover:bg-muted/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/bids/${bid._id}`} className="block">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <Badge variant={BID_STATUS_COLORS[bid.status] ?? "outline"}>{statusLabel(bid.status)}</Badge>
                        {bid.revisionRequest?.open && <Badge variant="warning">Revision requested</Badge>}
                        {bid.revisedAt && !bid.revisionRequest?.open && <Badge variant="outline">Revised</Badge>}
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
                    <Link href={`/bids/${bid._id}`} className="text-sm font-semibold flex items-center gap-0.5 shrink-0">
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
