"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Check, X, RotateCcw, SendHorizontal, Pencil, Ban, Eye, Printer, RefreshCw, Phone, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { clauseKey } from "@/lib/clauses";
import { wordsDiffer } from "@/lib/text-diff";
import { ClauseDiffText } from "@/components/clause-diff";
import { formatDelivery, bidCommercialBreakdown, hasCommercialTerms } from "@/lib/bid-line";
import { OfferConfirmDialog, type OfferConfirmKind, type OfferConfirmPayload } from "@/components/offer-confirm-dialog";
import { OfferThreadPanel } from "@/components/offer-thread-panel";
import { readFileAsDataUrl } from "@/lib/boq-browser";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary", submitted: "default", under_review: "warning", shortlisted: "success",
  accepted: "success", rejected: "destructive", withdrawn: "outline",
};

export default function BidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  const qc = useQueryClient();
  const [confirmKind, setConfirmKind] = useState<OfferConfirmKind | null>(null);
  const [askReviseOpen, setAskReviseOpen] = useState(false);
  const [vendorRequestOpen, setVendorRequestOpen] = useState(false);
  const [reviseNote, setReviseNote] = useState("");
  const [vendorRequestNote, setVendorRequestNote] = useState("");

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
    mutationFn: async (payload: OfferConfirmPayload) => {
      const res = await fetch(`/api/bids/${id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      return data;
    },
    onSuccess: () => {
      setConfirmKind(null);
      toast.success("Bid submitted");
      qc.invalidateQueries({ queryKey: ["bid", id] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to submit"),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bids/${id}/withdraw`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to withdraw");
      return data;
    },
    onSuccess: () => {
      setConfirmKind(null);
      toast.success("Bid withdrawn");
      qc.invalidateQueries({ queryKey: ["bid", id] });
      qc.invalidateQueries({ queryKey: ["bids"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to withdraw"),
  });

  const blacklistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorProfileId: bid.vendorProfileId,
          relatedTenderId: bid.tenderId,
          relatedBidId: id,
          reason: "Withdrawn offer",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to blacklist");
      return data;
    },
    onSuccess: () => { toast.success("Supplier blacklisted"); qc.invalidateQueries({ queryKey: ["bid", id] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bids/${id}/request-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: reviseNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request revision");
      return data;
    },
    onSuccess: () => {
      setAskReviseOpen(false);
      setReviseNote("");
      toast.success("Supplier invited to revise this offer");
      qc.invalidateQueries({ queryKey: ["bid", id] });
      qc.invalidateQueries({ queryKey: ["bids"] });
      qc.invalidateQueries({ queryKey: ["offer-thread"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const vendorRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bids/${id}/request-to-revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: vendorRequestNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request revision");
      return data;
    },
    onSuccess: () => {
      setVendorRequestOpen(false);
      setVendorRequestNote("");
      toast.success("Revision request sent to the company");
      qc.invalidateQueries({ queryKey: ["bid", id] });
      qc.invalidateQueries({ queryKey: ["bids"] });
      qc.invalidateQueries({ queryKey: ["offer-thread"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revisionDecisionMutation = useMutation({
    mutationFn: async (action: "approve" | "decline") => {
      const res = await fetch(`/api/bids/${id}/revision-request-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update request");
      return { ...data, action };
    },
    onSuccess: (data) => {
      toast.success(data.action === "approve" ? "Supplier may now revise this offer" : "Revision request declined");
      qc.invalidateQueries({ queryKey: ["bid", id] });
      qc.invalidateQueries({ queryKey: ["bids"] });
      qc.invalidateQueries({ queryKey: ["offer-thread"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const signedOfferMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileBase64 = await readFileAsDataUrl(file);
      const res = await fetch(`/api/bids/${id}/signed-offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload signed offer");
      return data;
    },
    onSuccess: () => {
      toast.success("Signed offer uploaded");
      qc.invalidateQueries({ queryKey: ["bid", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const verbalRevisionMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bids/${id}/open-verbal-revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Revised based on telephonic/verbal agreement" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open verbal revision");
      return data;
    },
    onSuccess: () => {
      toast.success("Enter the agreed prices, quantities, and terms");
      qc.invalidateQueries({ queryKey: ["bid", id] });
      router.push(`/bids/${id}/edit`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!bid) return <div className="text-center py-16 text-muted-foreground">Bid not found or access denied</div>;

  const isVendorOwner = profile?.userType === "vendor" && String(bid.vendorProfileId) === String(profile?._id);
  const isCompanyOwner = profile?.userType === "company" && String(bid.tender?.companyProfileId) === String(profile?._id);
  const showThread = (isVendorOwner || isCompanyOwner) && Boolean(bid.tenderId && bid.vendorProfileId);
  const counterpartName = isVendorOwner
    ? (bid.tender?.company?.companyName || "Company")
    : (bid.vendor?.companyName || "Supplier");

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-start animate-fade-in-up">
    <div className="flex-1 min-w-0 max-w-3xl mx-auto lg:mx-0 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/bids"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">Bid #{id.slice(-6)}</h1>
            <Badge variant={STATUS_COLORS[bid.status] ?? "outline"}>{bid.status?.replace("_", " ")}</Badge>
          </div>
          {bid.tender && <Link href={`/tenders/${bid.tenderId}`} className="text-sm text-primary hover:underline">{bid.tender.title}</Link>}
        </div>
      </div>

      {/* Vendor actions */}
      {isVendorOwner && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/bids/${id}/preview`}>
            <Button size="sm" variant="outline" id="preview-bid-btn">
              <Eye /> Preview
            </Button>
          </Link>
          <Link href={`/bids/${id}/preview?print=1`}>
            <Button size="sm" variant="outline" id="print-bid-btn">
              <Printer /> Print
            </Button>
          </Link>
          {bid.canModify && (
            <Link href={`/bids/${id}/edit`}>
              <Button size="sm" variant="outline" id="modify-bid-btn">
                <Pencil /> Modify
              </Button>
            </Link>
          )}
          {bid.canRevise && (
            <Link href={`/bids/${id}/edit`}>
              <Button size="sm" id="revise-bid-btn">
                <RefreshCw /> Revise bid
              </Button>
            </Link>
          )}
          {bid.canRequestToRevise && (
            <Button size="sm" variant="outline" onClick={() => setVendorRequestOpen(true)} id="request-to-revise-btn">
              <RefreshCw /> Request to revise
            </Button>
          )}
          {bid.status === "draft" && (
            <Button size="sm" onClick={() => setConfirmKind("submit")} disabled={submitMutation.isPending} id="submit-bid-btn">
              <SendHorizontal /> Submit
            </Button>
          )}
          {bid.canWithdraw && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmKind(bid.status === "draft" ? "withdraw-draft" : "withdraw-submitted")}
              disabled={withdrawMutation.isPending}
              id="withdraw-bid-btn"
            >
              <RotateCcw /> Withdraw
            </Button>
          )}
        </div>
      )}
      {isVendorOwner && bid.revisionRequest?.pendingApproval && !bid.revisionRequest?.open && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium">Your request to revise is waiting for company approval.</p>
          {bid.revisionRequest.note && <p className="text-muted-foreground mt-1">{bid.revisionRequest.note}</p>}
        </div>
      )}
      {isVendorOwner && bid.revisionRequest?.open && bid.revisionRequest.source === "vendor_invite" && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium">
            {bid.revisionRequest.initiatedBy === "vendor"
              ? "The company approved your revision request. You may now revise this offer."
              : "The company has invited you to revise this offer."}
          </p>
          {bid.revisionRequest.note && <p className="text-muted-foreground mt-1">{bid.revisionRequest.note}</p>}
          <p className="text-muted-foreground mt-1">Use Revise bid to update prices, quantities, or terms, then submit the revised offer. Your original submission stays in history.</p>
        </div>
      )}

      {isCompanyOwner && bid.revisionRequest?.pendingApproval && !bid.revisionRequest?.open && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-2">
          <p className="font-medium">Supplier requested a revision to this offer.</p>
          {bid.revisionRequest.note && <p className="text-muted-foreground">{bid.revisionRequest.note}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => revisionDecisionMutation.mutate("approve")} disabled={revisionDecisionMutation.isPending} id="approve-revise-request-btn">
              Approve request
            </Button>
            <Button size="sm" variant="outline" onClick={() => revisionDecisionMutation.mutate("decline")} disabled={revisionDecisionMutation.isPending} id="decline-revise-request-btn">
              Decline
            </Button>
          </div>
        </div>
      )}

      {isCompanyOwner && bid.revisionRequest?.open && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium">
            {bid.revisionRequest.source === "company_verbal"
              ? "Verbal-agreement revision is in progress."
              : "Waiting for the supplier to submit a revised offer."}
          </p>
          {bid.revisionRequest.note && <p className="text-muted-foreground mt-1">{bid.revisionRequest.note}</p>}
          {bid.canVerbalRevise && (
            <Link href={`/bids/${id}/edit`} className="inline-block mt-2">
              <Button size="sm">Continue revising</Button>
            </Link>
          )}
        </div>
      )}

      {isCompanyOwner && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/bids/${id}/preview`}>
            <Button size="sm" variant="outline" id="company-preview-bid-btn">
              <Eye /> Preview
            </Button>
          </Link>
          <Link href={`/bids/${id}/preview?print=1`}>
            <Button size="sm" variant="outline" id="company-print-bid-btn">
              <Printer /> Print
            </Button>
          </Link>
          {bid.canRequestRevision && (
            <Button size="sm" variant="outline" onClick={() => setAskReviseOpen(true)} id="ask-revise-btn">
              <RefreshCw /> Ask to revise
            </Button>
          )}
          {bid.canOpenVerbalRevision && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (confirm("Capture the prices, quantities, and terms agreed on the phone? The original offer is kept in history.")) verbalRevisionMutation.mutate(); }}
              disabled={verbalRevisionMutation.isPending}
              id="verbal-revise-btn"
            >
              <Phone /> Revise bid based on telephonic/verbal agreement
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
      {isCompanyOwner && bid.status === "withdrawn" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm text-foreground">This offer was withdrawn. Withdrawn offers stay on record permanently.</p>
          {bid.blacklisted ? (
            <Badge variant="destructive">Supplier blacklisted</Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => { if (confirm("Blacklist this supplier? They will not be able to offer on your packages.")) blacklistMutation.mutate(); }} disabled={blacklistMutation.isPending} id="blacklist-vendor-btn">
              <Ban /> Blacklist supplier
            </Button>
          )}
        </div>
      )}
      {isCompanyOwner && bid.status === "under_review" && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("shortlisted")} id="shortlist-review-btn">Shortlist</Button>
          <Button size="sm" onClick={() => statusMutation.mutate("accepted")} id="accept-review-btn"><Check /> Accept</Button>
          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("rejected")} id="reject-review-btn"><X /> Reject</Button>
        </div>
      )}
      {isCompanyOwner && bid.status === "shortlisted" && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => statusMutation.mutate("accepted")} id="accept-shortlisted-btn"><Check /> Accept</Button>
          <Button size="sm" variant="outline" onClick={() => statusMutation.mutate("rejected")} id="reject-shortlisted-btn"><X /> Reject</Button>
        </div>
      )}

      {/* Bid details */}
      <Card className="glass card-3d border-0">
        <CardHeader><CardTitle className="text-base font-[family-name:var(--font-heading)]">Bid Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          {bid.totalPrice && <div><span className="text-muted-foreground">Total Price</span><div className="font-semibold">{bid.currency} {bid.totalPrice.toLocaleString()}</div></div>}
          <div><span className="text-muted-foreground">Currency</span><div className="font-semibold">{bid.currency}</div></div>
          <div><span className="text-muted-foreground">Validity</span><div className="font-semibold">{bid.validityDays} days</div></div>
          {bid.submittedAt && <div><span className="text-muted-foreground">Submitted</span><div className="font-semibold">{formatDistanceToNow(new Date(bid.submittedAt), { addSuffix: true })}</div></div>}
          {bid.withdrawnAt && <div><span className="text-muted-foreground">Withdrawn</span><div className="font-semibold">{formatDistanceToNow(new Date(bid.withdrawnAt), { addSuffix: true })}</div></div>}
          {bid.vendor && <div className="col-span-2"><span className="text-muted-foreground">Vendor</span><div className="font-semibold">{bid.vendor.companyName}</div></div>}
          {hasCommercialTerms(bid) && (() => {
            const breakdown = bidCommercialBreakdown(bid);
            if (!breakdown) return null;
            const fmt = (v: number) => `${bid.currency} ${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return (
              <div className="col-span-2 rounded-md border border-border bg-muted/40 p-3 space-y-1 text-sm">
                <div className="font-medium">Commercial breakdown</div>
                {breakdown.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount{bid.discountType === "percent" ? ` (${bid.discountValue}%)` : ""}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">−{fmt(breakdown.discount)}</span>
                  </div>
                )}
                {breakdown.vat > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT ({bid.vatPercent}%)</span>
                    <span>+{fmt(breakdown.vat)}</span>
                  </div>
                )}
                {(bid.otherCharges ?? []).filter((c: any) => Number(c.amount) > 0).map((c: any, i: number) => {
                  const value = c.type === 'percent' ? breakdown.baseAfterTax * (Number(c.amount) / 100) : Number(c.amount);
                  return (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">{c.label}{c.type === 'percent' ? ` (${c.amount}%)` : ''}</span>
                      <span>+{fmt(value)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between pt-1 border-t border-border font-semibold">
                  <span>Effective total</span>
                  <span className="text-primary">{fmt(breakdown.effective)}</span>
                </div>
              </div>
            );
          })()}
          {bid.signature && (
            <div className="col-span-2 rounded-md border border-border bg-muted/40 p-3 space-y-1">
              <div className="font-medium">Digitally signed (DSC)</div>
              <div className="text-muted-foreground">Holder: <span className="text-foreground">{bid.signature.holderName}</span></div>
              <div className="text-muted-foreground">Serial: <span className="font-mono text-foreground">{bid.signature.serialNumber}</span></div>
              {bid.signature.issuer && <div className="text-muted-foreground">Issuer: <span className="text-foreground">{bid.signature.issuer}</span></div>}
              <div className="text-muted-foreground break-all">Hash: <span className="font-mono text-xs text-foreground">{bid.signature.documentHash}</span></div>
              {bid.signature.signedPdfUrl && (
                <a href={bid.signature.signedPdfUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                  Download signed file
                </a>
              )}
            </div>
          )}
          {(isVendorOwner || isCompanyOwner) && bid.status !== "draft" && (
            <div className="col-span-2 rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="font-medium">Signed offer</div>
              <p className="text-xs text-muted-foreground">Print the offer, sign it, and upload the PDF or scan here.</p>
              {(bid.signedOffers ?? []).length > 0 && (
                <div className="space-y-1">
                  {(bid.signedOffers as any[]).map((doc: any) => (
                    <a key={doc.storedName} href={doc.fileUrl} target="_blank" rel="noreferrer" className="block text-sm text-primary hover:underline truncate">
                      {doc.name}
                    </a>
                  ))}
                </div>
              )}
              {isVendorOwner && (
                <Label htmlFor="signed-offer-upload" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-input text-sm font-medium cursor-pointer hover:bg-accent w-fit">
                  {signedOfferMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload signed offer
                </Label>
              )}
              <input
                id="signed-offer-upload"
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) signedOfferMutation.mutate(file);
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {bid.lineItems?.length > 0 && (
        <Card className="glass card-3d border-0">
          <CardHeader><CardTitle className="text-base font-[family-name:var(--font-heading)]">Line Items ({bid.currency})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right">Quantity</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Delivery</th>
                  <th className="pb-2 font-medium text-right">Unit price ({bid.currency})</th>
                  <th className="pb-2 font-medium text-right">Total line item price ({bid.currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border divide-border">
                {bid.lineItems.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2 align-top">
                      <div>{item.description}</div>
                      {item.notes && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">Remarks: {item.notes}</div>}
                      {item.originalQuantity != null && Number(item.quantity) !== Number(item.originalQuantity) && item.quantityChangeReason && (
                        <div className="text-xs text-primary mt-1 whitespace-pre-wrap">Qty change: {item.quantityChangeReason}</div>
                      )}
                      {item.customFields?.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.customFields.map((field: any, fi: number) => (
                            <div key={fi} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{field.label}:</span> {field.value}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-right align-top">
                      <div>{item.quantity}</div>
                      {item.originalQuantity != null && Number(item.quantity) !== Number(item.originalQuantity) && (
                        <div className="text-[11px] text-muted-foreground">Invited: {item.originalQuantity}</div>
                      )}
                    </td>
                    <td className="py-2 pl-2 align-top">{item.unit}</td>
                    <td className="py-2 align-top">{formatDelivery(item) || "—"}</td>
                    <td className="py-2 text-right align-top">{Number(item.unitPrice || 0).toLocaleString()}</td>
                    <td className="py-2 text-right font-medium align-top">{Number(item.totalPrice || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {(bid.clauseResponses?.length > 0 || bid.tender?.clauses?.length > 0) && (
        <Card className="glass card-3d border-0">
          <CardHeader>
            <CardTitle className="text-base font-[family-name:var(--font-heading)]">Terms response</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Edited wording is shown in red so the company and supplier can see every change.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {(bid.tender?.clauses ?? bid.clauseResponses ?? []).map((clause: any, i: number) => {
              const response = (bid.clauseResponses ?? []).find((r: any) => clauseKey(r) === clauseKey(clause));
              const original = response?.originalBody || clause.body || "";
              const proposed = response?.proposedBody || original;
              const modified = Boolean(response?.accepted) && wordsDiffer(original, proposed);
              return (
                <div key={clause.slug || clause.kind || i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-sm font-medium">{clause.title || response?.kind}</div>
                    {!response?.accepted && <Badge variant="outline">Not accepted</Badge>}
                    {response?.accepted && !modified && <Badge variant="success">Accepted as written</Badge>}
                    {modified && <Badge variant="destructive">Accepted with conditions</Badge>}
                  </div>
                  {modified ? (
                    <div className="text-sm">
                      <ClauseDiffText original={original} proposed={proposed} />
                    </div>
                  ) : (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{original}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {bid.technicalProposal && (
        <Card className="glass card-3d border-0"><CardHeader><CardTitle className="text-base font-[family-name:var(--font-heading)]">Technical Proposal</CardTitle></CardHeader><CardContent><p className="text-sm text-foreground whitespace-pre-wrap">{bid.technicalProposal}</p></CardContent></Card>
      )}
      {bid.commercialProposal && (
        <Card className="glass card-3d border-0"><CardHeader><CardTitle className="text-base font-[family-name:var(--font-heading)]">Commercial Proposal</CardTitle></CardHeader><CardContent><p className="text-sm text-foreground whitespace-pre-wrap">{bid.commercialProposal}</p></CardContent></Card>
      )}

      {/* History */}
      {bid.history?.length > 0 && (
        <Card className="glass card-3d border-0">
          <CardHeader><CardTitle className="text-base font-[family-name:var(--font-heading)]">Bid History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bid.history.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-muted/70 shrink-0" />
                <span className="font-medium text-foreground">{h.fieldName}</span>
                <span>changed from <span className="font-mono">{h.oldValue || "—"}</span> to <span className="font-mono">{h.newValue}</span></span>
                <span>by {h.changedBy}</span>
                <span className="ml-auto">{formatDistanceToNow(new Date(h.createdAt), { addSuffix: true })}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {bid.versions?.length > 0 && (
        <Card className="glass card-3d border-0">
          <CardHeader><CardTitle className="text-base font-[family-name:var(--font-heading)]">Original and revised versions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bid.versions.map((v: any) => (
              <div key={`${v.kind}-${v.version}`} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={v.kind === "original" ? "outline" : "success"}>{v.kind} · v{v.version}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {v.source === "company_verbal" ? "Verbal agreement" : v.source === "vendor_invite" ? "Supplier revision" : "Original submit"}
                    {v.capturedBy ? ` · ${v.capturedBy}` : ""}
                  </span>
                </div>
                <div className="mt-1 font-semibold">{v.currency} {Number(v.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                {v.capturedAt && <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(v.capturedAt), { addSuffix: true })}</div>}
              </div>
            ))}
            {bid.revisedAt && <p className="text-xs text-muted-foreground">Comparison uses the latest revised offer unless you choose to include the original.</p>}
          </CardContent>
        </Card>
      )}

      {isVendorOwner && confirmKind && (
        <OfferConfirmDialog
          open={Boolean(confirmKind)}
          kind={confirmKind}
          dsc={profile?.dsc}
          pending={submitMutation.isPending || withdrawMutation.isPending}
          onOpenChange={(open) => { if (!open) setConfirmKind(null); }}
          onProceed={(payload) => {
            if (confirmKind === "submit") submitMutation.mutate(payload);
            else withdrawMutation.mutate();
          }}
        />
      )}

      <AlertDialog open={askReviseOpen} onOpenChange={setAskReviseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ask supplier to revise this offer</AlertDialogTitle>
            <AlertDialogDescription>
              The original submission is kept in history. The supplier gets a Revise bid button to update prices, quantities, and terms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="revise-note">Note to supplier (optional)</Label>
            <Textarea
              id="revise-note"
              rows={3}
              value={reviseNote}
              onChange={(e) => setReviseNote(e.target.value)}
              placeholder="e.g. Please revise packing quantity and payment terms"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={() => requestRevisionMutation.mutate()} disabled={requestRevisionMutation.isPending} id="confirm-ask-revise-btn">
              {requestRevisionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invitation"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={vendorRequestOpen} onOpenChange={setVendorRequestOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request to revise this offer</AlertDialogTitle>
            <AlertDialogDescription>
              The company must approve before you can change prices, quantities, or terms. This works before or after the bid deadline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="vendor-revise-note">Note to company (optional)</Label>
            <Textarea
              id="vendor-revise-note"
              rows={3}
              value={vendorRequestNote}
              onChange={(e) => setVendorRequestNote(e.target.value)}
              placeholder="e.g. Packing quantity and payment terms need an update"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={() => vendorRequestMutation.mutate()} disabled={vendorRequestMutation.isPending} id="confirm-request-to-revise-btn">
              {vendorRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    {showThread && (
      <OfferThreadPanel
        tenderId={String(bid.tenderId)}
        vendorProfileId={String(bid.vendorProfileId)}
        bidId={id}
        counterpartName={counterpartName}
      />
    )}
    </div>
  );
}
