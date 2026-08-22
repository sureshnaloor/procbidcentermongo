"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Loader2, DollarSign, Check, ShieldAlert, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BidComparisonPage({ params }: { params: Promise<{ tenderId: string }> }) {
  const { tenderId } = use(params);

  const { data: tender, isLoading: loadingTender } = useQuery({
    queryKey: ["tender", tenderId],
    queryFn: () => fetch(`/api/tenders/${tenderId}`).then((r) => r.json()),
  });

  const { data: bids = [], isLoading: loadingBids } = useQuery<any[]>({
    queryKey: ["bids", "by-tender", tenderId],
    queryFn: () => fetch(`/api/bids/by-tender/${tenderId}`).then((r) => r.json()),
    enabled: !!tenderId,
  });

  if (loadingTender || loadingBids) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!tender) {
    return <div className="text-center py-16 text-muted-foreground">Tender not found</div>;
  }

  const submittedBids = bids.filter((b) => ["submitted", "under_review", "shortlisted", "accepted", "withdrawn"].includes(b.status));

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-3">
        <Link href={`/tenders/${tenderId}`}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            Bid Comparison
          </h1>
          <p className="text-sm text-muted-foreground">{tender.title}</p>
        </div>
      </div>

      {submittedBids.length === 0 ? (
        <Card className="text-center py-12 border-0 shadow-[var(--shadow-card)]">
          <CardContent className="space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <ShieldAlert className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No submitted bids to compare</h3>
            <p className="text-sm text-muted-foreground">Bids must be submitted by vendors before they can be compared.</p>
            <Link href={`/tenders/${tenderId}`}>
              <Button size="sm" className="mt-2">Back to Tender</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {submittedBids.map((bid) => (
              <Card key={bid._id} className={`flex flex-col relative overflow-hidden transition-all border-0 ${
                bid.status === "accepted" ? "ring-2 ring-primary shadow-[var(--shadow-glow)]" : "shadow-[var(--shadow-card)]"
              }`}>
                {bid.status === "accepted" && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Selected
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold truncate font-[family-name:var(--font-heading)]">
                        {bid.vendor?.companyName ?? `Bid #${bid._id.slice(-6)}`}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        By {bid.vendor?.contactPerson ?? "Vendor Admin"}
                      </CardDescription>
                    </div>
                    <Badge variant={bid.status === "accepted" ? "success" : bid.status === "shortlisted" ? "warning" : "default"}>
                      {bid.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="bg-muted/50 p-4 rounded-2xl">
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bid Total</div>
                    <div className="text-2xl font-extrabold text-primary mt-1 flex items-center font-[family-name:var(--font-heading)]">
                      <DollarSign className="h-5 w-5 shrink-0" />
                      {bid.totalPrice ? bid.totalPrice.toLocaleString() : "—"}{" "}
                      <span className="text-xs font-normal text-muted-foreground ml-1">{bid.currency}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Validity: {bid.validityDays} days
                    </div>
                  </div>

                  {bid.technicalProposal && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Technical Proposal</div>
                      <p className="text-xs text-foreground line-clamp-4 whitespace-pre-wrap">
                        {bid.technicalProposal}
                      </p>
                    </div>
                  )}

                  {bid.commercialProposal && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Commercial Proposal</div>
                      <p className="text-xs text-foreground line-clamp-4 whitespace-pre-wrap">
                        {bid.commercialProposal}
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Line Items: {bid.lineItems?.length ?? 0}</span>
                    <Link href={`/bids/${bid._id}`} className="font-semibold text-primary hover:text-primary/80 link-underline">
                      View Full Details
                    </Link>
                  </div>
                  {(bid.clauseResponses ?? []).some((r: any) => r.accepted && r.proposedBody && r.proposedBody.trim() !== (r.originalBody ?? "").trim()) && (
                    <div className="text-xs font-medium text-destructive">Accepted some terms with conditions</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="print:hidden">
        <Link href={`/comparisons/${tenderId}`}>
          <Button size="sm" variant="outline">Open comparison statement</Button>
        </Link>
      </div>
    </div>
  );
}
