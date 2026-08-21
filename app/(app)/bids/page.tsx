"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, DollarSign, Clock, Building2, CalendarClock, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { PROCUREMENT_TYPES } from "@/lib/procurement";

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

  const { data: tenderData, isLoading: loadingTenders } = useQuery({
    queryKey: ["tenders", "bids-page"],
    queryFn: () => fetch("/api/tenders?limit=100").then((r) => r.json()),
    enabled: !!session && isCompany,
  });

  const packages = useMemo(() => {
    const issued = (tenderData?.items ?? []).filter((t: any) => t.status && t.status !== "draft");
    const byTender = new Map<string, any[]>();
    for (const bid of bids as any[]) {
      const key = String(bid.tenderId);
      const list = byTender.get(key) ?? [];
      list.push(bid);
      byTender.set(key, list);
    }
    return issued.map((tender: any) => {
      const nested = (byTender.get(String(tender._id)) ?? []).slice().sort((a: any, b: any) => {
        const da = receivedAt(a)?.getTime() ?? 0;
        const db = receivedAt(b)?.getTime() ?? 0;
        return db - da;
      });
      return { tender, bids: nested };
    });
  }, [tenderData, bids]);

  const isLoading = loadingProfile || loadingBids || (isCompany && loadingTenders);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{isCompany ? "Bids received" : "Bids"}</h1>
        {isCompany && (
          <p className="text-sm text-muted-foreground mt-1">Offers are grouped under each package you have issued.</p>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : isCompany ? (
        packages.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground">No issued packages yet. Publish an RFQ, RFP, or tender to receive offers.</p>
            <Link href="/tenders" className="text-sm text-primary hover:underline mt-2 block">Go to my tenders</Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {packages.map(({ tender, bids: nested }: { tender: any; bids: any[] }) => {
              const typeMeta = PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES];
              return (
                <Card key={tender._id} className="overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] uppercase">{typeMeta?.label ?? tender.type}</Badge>
                          <Badge variant={TENDER_STATUS_COLORS[tender.status] ?? "outline"}>{statusLabel(tender.status)}</Badge>
                          <span className="text-xs text-muted-foreground">{nested.length} {nested.length === 1 ? "offer" : "offers"}</span>
                        </div>
                        <CardTitle className="text-base">
                          <Link href={`/tenders/${tender._id}`} className="hover:text-primary">{tender.title}</Link>
                        </CardTitle>
                        {tender.bidDeadline && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <CalendarClock className="h-3 w-3" />
                            Deadline {format(new Date(tender.bidDeadline), "d MMM yyyy")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link href={`/comparisons/${tender._id}`}>
                          <Button size="sm" variant="outline" id={`statement-${tender._id}`}>Statement</Button>
                        </Link>
                        {nested.length > 1 && (
                          <Link href={`/bids/comparison/${tender._id}`}>
                            <Button size="sm" variant="outline" id={`compare-${tender._id}`}>Compare</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {nested.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No offers received on this package yet.</p>
                    ) : nested.map((b: any) => (
                      <CompanyBidCard key={b._id} bid={b} />
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (bids as any[]).length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {isVendor
              ? "No offers yet. Browse tenders and request to participate, then prepare your offer once approved."
              : "No offers yet."}
          </p>
          <Link href="/tenders" className="text-sm text-primary hover:underline mt-2 block">Browse tenders</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {(bids as any[]).map((b: any) => (
            <Link key={b._id} href={`/bids/${b._id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={BID_STATUS_COLORS[b.status] ?? "outline"} className="shrink-0">{statusLabel(b.status)}</Badge>
                        {b.revisionRequest?.open && <Badge variant="warning">Revision requested</Badge>}
                        {b.revisedAt && !b.revisionRequest?.open && <Badge variant="outline">Revised</Badge>}
                      </div>
                      <h2 className="font-semibold text-foreground">{b.tender?.title || `Bid #${String(b._id).slice(-6)}`}</h2>
                    </div>
                    <div className="text-right shrink-0">
                      {b.totalPrice != null && (
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <DollarSign className="h-3.5 w-3.5" />
                          {b.currency} {Number(b.totalPrice).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Validity: {b.validityDays} days</span>
                    {receivedAt(b) && (
                      <span>{b.submittedAt ? "Submitted" : "Created"} {formatDistanceToNow(receivedAt(b)!, { addSuffix: true })}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyBidCard({ bid }: { bid: any }) {
  const received = receivedAt(bid);
  const location = [bid.vendor?.city, bid.vendor?.country].filter(Boolean).join(", ");
  return (
    <Link href={`/bids/${bid._id}`} className="block">
      <div className="rounded-lg border border-border bg-card hover:shadow-md transition-shadow p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge variant={BID_STATUS_COLORS[bid.status] ?? "outline"}>{statusLabel(bid.status)}</Badge>
              {bid.revisionRequest?.open && <Badge variant="warning">Revision requested</Badge>}
              {bid.revisedAt && !bid.revisionRequest?.open && <Badge variant="outline">Revised</Badge>}
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
