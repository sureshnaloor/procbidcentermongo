"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, DollarSign, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary", submitted: "default", under_review: "warning", shortlisted: "success",
  accepted: "success", rejected: "destructive", withdrawn: "outline",
};

export default function BidsPage() {
  const { data: session } = useSession();
  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const { data: bids = [], isLoading } = useQuery({
    queryKey: ["bids"],
    queryFn: () => fetch("/api/bids").then((r) => r.json()),
    enabled: !!session,
  });
  const isVendor = profile?.userType === "vendor";
  const isCompany = profile?.userType === "company";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Bids</h1>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : bids.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {isCompany
              ? "No offers received yet. Invite suppliers from your tenders so they can prepare offers."
              : isVendor
                ? "No offers yet. Browse tenders and request to participate, then prepare your offer once approved."
                : "No offers yet."}
          </p>
          <Link href="/tenders" className="text-sm text-primary hover:underline mt-2 block">
            {isCompany ? "Go to my tenders" : "Browse tenders"}
          </Link>
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
                        <Badge variant={STATUS_COLORS[b.status] ?? "outline"} className="shrink-0">{b.status.replace("_", " ")}</Badge>
                      </div>
                      <h2 className="font-semibold text-foreground">Bid #{b._id?.slice(-6)}</h2>
                    </div>
                    <div className="text-right shrink-0">
                      {b.totalPrice && (
                        <div className="flex items-center gap-1 text-sm font-semibold">
                          <DollarSign className="h-3.5 w-3.5" />
                          {b.currency} {b.totalPrice.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Validity: {b.validityDays} days</span>
                    <span>Created {formatDistanceToNow(new Date(b.createdAt), { addSuffix: true })}</span>
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
