"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Scale, CalendarClock, Calendar, Clock, Archive } from "lucide-react";
import { format } from "date-fns";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import { DeadlineCountdown } from "@/components/deadline-countdown";

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

export default function ComparisonsPage() {
  const { data: session } = useSession();
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["comparisons"],
    queryFn: () => fetch("/api/comparisons").then((r) => r.json()),
    enabled: !!session && (profile?.userType === "company" || (session as any)?.user?.role === "admin"),
  });

  const isCompany = profile?.userType === "company" || (session as any)?.user?.role === "admin";
  const items: any[] = data?.items ?? [];

  const { activeComparisons, archivedComparisons } = useMemo(() => {
    const isArchived = (tender: any) => {
      const isConcluded = ["closed", "awarded", "cancelled", "archived"].includes(tender.status);
      const isPastDue = tender.bidDeadline && new Date(tender.bidDeadline).getTime() < Date.now();
      return isConcluded || isPastDue;
    };
    return {
      activeComparisons: items.filter((t) => !isArchived(t)),
      archivedComparisons: items.filter(isArchived),
    };
  }, [items]);

  if (loadingProfile || isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  if (!isCompany) {
    return <p className="text-center text-muted-foreground py-16">Comparison statements are available to EPC companies.</p>;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
          Comparison of Bids
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open a comparison statement for any issued package. Most recent packages are listed first.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/20">
          <div className="mx-auto mb-3 inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted">
            <Scale className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No issued RFQs, RFPs, or tenders yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Comparisons Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Comparison Packages ({activeComparisons.length})
              </h2>
            </div>
            {activeComparisons.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-muted/10 text-sm text-muted-foreground">
                No active open packages right now. Historical comparison statements are listed below.
              </div>
            ) : (
              <div className="grid gap-3 stagger-children">
                {activeComparisons.map((tender) => (
                  <ComparisonCard key={tender._id} tender={tender} isArchived={false} />
                ))}
              </div>
            )}
          </div>

          {/* Archived Comparisons Section */}
          {archivedComparisons.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Archived & Past Comparison Packages ({archivedComparisons.length})
                  </h2>
                </div>
                <Badge variant="secondary" className="text-[10px]">Closed / Awarded / Expired</Badge>
              </div>
              <div className="grid gap-3 stagger-children opacity-90">
                {archivedComparisons.map((tender) => (
                  <ComparisonCard key={tender._id} tender={tender} isArchived={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ tender, isArchived }: { tender: any; isArchived: boolean }) {
  const typeMeta = PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES];
  const isPastDue = tender.bidDeadline && new Date(tender.bidDeadline).getTime() < Date.now();
  const issuedDate = tender.createdAt ? format(new Date(tender.createdAt), "dd MMM yyyy") : null;

  return (
    <Card className={`border border-border rounded-2xl shadow-[var(--shadow-card)] transition-all duration-200 ${isArchived ? "bg-card/70" : "bg-card"}`}>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge variant="outline" className="text-[10px] uppercase font-bold">{typeMeta?.label ?? tender.type}</Badge>
            <Badge variant={TENDER_STATUS_COLORS[tender.status] ?? "outline"}>{statusLabel(tender.status)}</Badge>
            {issuedDate && (
              <Badge variant="outline" className="text-[11px] font-semibold bg-background/80 border-primary/20 text-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" /> Issued: {issuedDate}
              </Badge>
            )}
          </div>
          <div className="font-semibold text-foreground truncate">{tender.title}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1.5">
            {tender.bidDeadline && (
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                Deadline {format(new Date(tender.bidDeadline), "d MMM yyyy")}
              </span>
            )}
            {!isArchived && !isPastDue && tender.bidDeadline && (
              <span className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                <Clock className="h-3 w-3" />
                <DeadlineCountdown deadline={tender.bidDeadline} />
              </span>
            )}
            {isPastDue && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Deadline passed</Badge>
            )}
            <span>Invited {tender.invitedCount}</span>
            <span>Quoted {tender.quotedCount}</span>
            <span>Did not quote {tender.notQuotedCount}</span>
            <span>Rejected {tender.rejectedCount}</span>
          </div>
        </div>
        <Link href={`/comparisons/${tender._id}`}>
          <Button size="sm" id={`comparison-statement-${tender._id}`}>
            <FileText className="h-3.5 w-3.5" /> Comparison statement
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
