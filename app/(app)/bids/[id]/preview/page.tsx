"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Printer } from "lucide-react";
import { BidPreviewDocument } from "@/components/bid-preview-document";

export default function BidPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: bid, isLoading } = useQuery({
    queryKey: ["bid", id],
    queryFn: () => fetch(`/api/bids/${id}`).then((r) => r.json()),
  });

  useEffect(() => {
    if (!bid?._id) return;
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [bid]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  if (!bid?._id) {
    return <div className="text-center py-16 text-muted-foreground">Bid not found or access denied</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link href={`/bids/${id}`}>
            <Button variant="ghost" size="icon" id="preview-back-btn">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Offer preview</h1>
            <p className="text-sm text-muted-foreground">Review this document, then print or save as PDF from your browser.</p>
            {bid.status === "draft" && (
              <p className="text-xs text-muted-foreground mt-1">
                This is still a draft. If you use a DSC, print or save as PDF, sign it in your DSC software, then submit and attach the signed file.
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => window.print()} id="print-bid-btn">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>
      <BidPreviewDocument bid={bid} />
    </div>
  );
}
