"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Scale, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { PROCUREMENT_TYPES } from "@/lib/procurement";

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
  const items = data?.items ?? [];

  if (loadingProfile || isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  if (!isCompany) {
    return <p className="text-center text-muted-foreground py-16">Comparison statements are available to EPC companies.</p>;
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)]">Comparison of bids</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Open a comparison statement for any issued package. Most recent packages are listed first.
        </p>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto mb-3 inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted">
            <Scale className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No issued RFQs, RFPs, or tenders yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 stagger-children">
          {items.map((tender: any) => {
            const typeMeta = PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES];
            return (
              <Card key={tender._id} className="bg-card border border-border rounded-2xl shadow-[var(--shadow-card)] transition-all duration-200">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] uppercase">{typeMeta?.label ?? tender.type}</Badge>
                      <Badge variant={TENDER_STATUS_COLORS[tender.status] ?? "outline"}>{statusLabel(tender.status)}</Badge>
                    </div>
                    <div className="font-semibold truncate">{tender.title}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      {tender.bidDeadline && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          Deadline {format(new Date(tender.bidDeadline), "d MMM yyyy")}
                        </span>
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
          })}
        </div>
      )}
    </div>
  );
}
