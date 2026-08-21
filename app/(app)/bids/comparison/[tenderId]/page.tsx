"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Loader2, DollarSign, Check, X, ShieldAlert, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BidComparisonPage({ params }: { params: Promise<{ tenderId: string }> }) {
  const { tenderId } = use(params);

  // Fetch tender details
  const { data: tender, isLoading: loadingTender } = useQuery({
    queryKey: ["tender", tenderId],
    queryFn: () => fetch(`/api/tenders/${tenderId}`).then((r) => r.json()),
  });

  // Fetch bids for this tender
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

  const submittedBids = bids.filter((b) => ["submitted", "under_review", "shortlisted", "accepted"].includes(b.status));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/tenders/${tenderId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Bid Comparison
          </h1>
          <p className="text-sm text-muted-foreground">{tender.title}</p>
        </div>
      </div>

      {submittedBids.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/60 mx-auto" />
            <h3 className="font-semibold text-foreground">No submitted bids to compare</h3>
            <p className="text-sm text-muted-foreground">Bids must be submitted by vendors before they can be compared.</p>
            <Link href={`/tenders/${tenderId}`}>
              <Button size="sm" className="mt-2">Back to Tender</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {/* Side by side grid comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submittedBids.map((bid) => (
              <Card key={bid._id} className={`flex flex-col relative overflow-hidden transition-all ${
                bid.status === "accepted" ? "ring-2 ring-emerald-500" : ""
              }`}>
                {bid.status === "accepted" && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-lg text-xs font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Selected
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base font-bold truncate">
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
                  {/* Financials */}
                  <div className="bg-accent dark:bg-card/50 p-4 rounded-xl">
                    <div className="text-xs text-muted-foreground">Bid Total</div>
                    <div className="text-2xl font-extrabold text-primary dark:text-primary mt-1 flex items-center">
                      <DollarSign className="h-5 w-5 shrink-0" />
                      {bid.totalPrice ? bid.totalPrice.toLocaleString() : "—"}{" "}
                      <span className="text-xs font-normal text-muted-foreground ml-1">{bid.currency}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Validity: {bid.validityDays} days
                    </div>
                  </div>

                  {/* Proposals */}
                  {bid.technicalProposal && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Technical Proposal</div>
                      <p className="text-xs text-foreground dark:text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {bid.technicalProposal}
                      </p>
                    </div>
                  )}

                  {bid.commercialProposal && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">Commercial Proposal</div>
                      <p className="text-xs text-foreground dark:text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {bid.commercialProposal}
                      </p>
                    </div>
                  )}

                  {/* Line Items Count */}
                  <div className="border-t pt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Line Items: {bid.lineItems?.length ?? 0}</span>
                    <Link href={`/bids/${bid._id}`} className="text-primary hover:underline">
                      View Full Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
