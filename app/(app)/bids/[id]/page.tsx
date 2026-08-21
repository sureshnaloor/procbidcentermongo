"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Check, X, RotateCcw, SendHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary", submitted: "default", under_review: "warning", shortlisted: "success",
  accepted: "success", rejected: "destructive", withdrawn: "outline",
};

export default function BidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  const qc = useQueryClient();

  const { data: bid, isLoading } = useQuery({
    queryKey: ["bid", id],
    queryFn: () => fetch(`/api/bids/${id}`).then((r) => r.json()),
  });
  const { data: profile } = useQuery({ queryKey: ["profile", "me"], queryFn: () => fetch("/api/profile").then((r) => r.json()), enabled: !!session });

  const statusMutation = useMutation({
    mutationFn: (status: string) => fetch(`/api/bids/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Bid status updated"); qc.invalidateQueries({ queryKey: ["bid", id] }); },
    onError: () => toast.error("Failed to update status"),
  });

  const submitMutation = useMutation({
    mutationFn: () => fetch(`/api/bids/${id}/submit`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Bid submitted"); qc.invalidateQueries({ queryKey: ["bid", id] }); },
    onError: () => toast.error("Failed to submit"),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => fetch(`/api/bids/${id}/withdraw`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Bid withdrawn"); qc.invalidateQueries({ queryKey: ["bid", id] }); },
    onError: () => toast.error("Failed to withdraw"),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!bid) return <div className="text-center py-16 text-muted-foreground">Bid not found or access denied</div>;

  const isVendorOwner = profile?.userType === "vendor" && bid.vendorProfileId === profile?._id;
  const isCompanyOwner = profile?.userType === "company" && bid.tender?.companyProfileId === profile?._id;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bids"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">Bid #{id.slice(-6)}</h1>
            <Badge variant={STATUS_COLORS[bid.status] ?? "outline"}>{bid.status?.replace("_", " ")}</Badge>
          </div>
          {bid.tender && <Link href={`/tenders/${bid.tenderId}`} className="text-sm text-primary hover:underline">{bid.tender.title}</Link>}
        </div>
      </div>

      {/* Vendor actions */}
      {isVendorOwner && (
        <div className="flex gap-2">
          {bid.status === "draft" && (
            <Button size="sm" onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} id="submit-bid-btn">
              <SendHorizontal /> {submitMutation.isPending ? "Submitting..." : "Submit Bid"}
            </Button>
          )}
          {["draft", "submitted"].includes(bid.status) && (
            <Button size="sm" variant="outline" onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending} id="withdraw-bid-btn">
              <RotateCcw /> Withdraw
            </Button>
          )}
        </div>
      )}

      {/* Company actions */}
      {isCompanyOwner && bid.status === "submitted" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("under_review")} id="mark-review-btn">Mark Under Review</Button>
          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("shortlisted")} id="shortlist-btn">Shortlist</Button>
          <Button size="sm" onClick={() => statusMutation.mutate("accepted")} id="accept-bid-btn"><Check /> Accept</Button>
          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("rejected")} id="reject-bid-btn"><X /> Reject</Button>
        </div>
      )}
      {isCompanyOwner && bid.status === "shortlisted" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => statusMutation.mutate("accepted")} id="accept-shortlisted-btn"><Check /> Accept</Button>
          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("rejected")} id="reject-shortlisted-btn"><X /> Reject</Button>
        </div>
      )}

      {/* Bid details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Bid Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          {bid.totalPrice && <div><span className="text-muted-foreground">Total Price</span><div className="font-semibold">{bid.currency} {bid.totalPrice.toLocaleString()}</div></div>}
          <div><span className="text-muted-foreground">Currency</span><div className="font-semibold">{bid.currency}</div></div>
          <div><span className="text-muted-foreground">Validity</span><div className="font-semibold">{bid.validityDays} days</div></div>
          {bid.submittedAt && <div><span className="text-muted-foreground">Submitted</span><div className="font-semibold">{formatDistanceToNow(new Date(bid.submittedAt), { addSuffix: true })}</div></div>}
          {bid.vendor && <div className="col-span-2"><span className="text-muted-foreground">Vendor</span><div className="font-semibold">{bid.vendor.companyName}</div></div>}
        </CardContent>
      </Card>

      {bid.lineItems?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium text-right">Unit Price</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {bid.lineItems.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 pl-2">{item.unit}</td>
                    <td className="py-2 text-right">{item.unitPrice.toLocaleString()}</td>
                    <td className="py-2 text-right font-medium">{item.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {bid.technicalProposal && (
        <Card><CardHeader><CardTitle className="text-base">Technical Proposal</CardTitle></CardHeader><CardContent><p className="text-sm text-foreground dark:text-muted-foreground whitespace-pre-wrap">{bid.technicalProposal}</p></CardContent></Card>
      )}
      {bid.commercialProposal && (
        <Card><CardHeader><CardTitle className="text-base">Commercial Proposal</CardTitle></CardHeader><CardContent><p className="text-sm text-foreground dark:text-muted-foreground whitespace-pre-wrap">{bid.commercialProposal}</p></CardContent></Card>
      )}

      {/* History */}
      {bid.history?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Bid History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bid.history.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-muted/70 shrink-0" />
                <span className="font-medium text-foreground dark:text-muted-foreground">{h.fieldName}</span>
                <span>changed from <span className="font-mono">{h.oldValue || "—"}</span> to <span className="font-mono">{h.newValue}</span></span>
                <span>by {h.changedBy}</span>
                <span className="ml-auto">{formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
