"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, XCircle, Trophy, Users, FileText, DollarSign, Calendar, MapPin, Building2, Pencil, ExternalLink, Loader2, Info } from "lucide-react";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary",
  published: "success",
  closed: "outline",
  awarded: "default",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed (External Award)",
  awarded: "Awarded",
  cancelled: "Cancelled",
};

interface CloseTenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenderTitle: string;
  onConfirm: (remarks: string) => void;
  isPending?: boolean;
}

export function CloseTenderDialog({
  open,
  onOpenChange,
  tenderTitle,
  onConfirm,
  isPending,
}: CloseTenderDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setRemarks("");
    }
  }, [open]);

  const isConfirmed = confirmText.trim().toUpperCase() === "YES";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Close Tender (External Award)</DialogTitle>
          </div>
          <DialogDescription>
            Closing indicates that this package is concluded and was awarded to an external party outside this website.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
            <span className="text-muted-foreground">Tender:</span>
            <div className="font-semibold text-foreground line-clamp-2">{tenderTitle}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="close-remarks" className="text-xs font-medium">
              Remarks / External Award Details <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="close-remarks"
              placeholder="e.g., Awarded to external contractor M/s Zenith Infra after offline evaluation."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="close-confirm" className="text-xs font-semibold text-foreground">
              Type <span className="font-mono text-destructive">YES</span> to confirm closure:
            </Label>
            <Input
              id="close-confirm"
              placeholder="Type YES"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!isConfirmed || isPending}
            onClick={() => onConfirm(remarks)}
            id="confirm-close-btn"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Confirm Close (YES)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CancelTenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenderTitle: string;
  onConfirm: (remarks: string) => void;
  isPending?: boolean;
}

export function CancelTenderDialog({
  open,
  onOpenChange,
  tenderTitle,
  onConfirm,
  isPending,
}: CancelTenderDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setRemarks("");
    }
  }, [open]);

  const isConfirmed = confirmText.trim().toUpperCase() === "YES";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <XCircle className="h-5 w-5" />
            <DialogTitle>Cancel Tender Package</DialogTitle>
          </div>
          <DialogDescription>
            Cancelling this tender will mark it as cancelled and stop all bidding activities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
            <span className="text-muted-foreground">Tender:</span>
            <div className="font-semibold text-foreground line-clamp-2">{tenderTitle}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-remarks" className="text-xs font-medium">
              Cancellation Reason / Remarks <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-remarks"
              placeholder="e.g., Scope altered / Project budget deferred."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-confirm" className="text-xs font-semibold text-foreground">
              Type <span className="font-mono text-destructive">YES</span> to confirm cancellation:
            </Label>
            <Input
              id="cancel-confirm"
              placeholder="Type YES"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Keep Tender Active
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!isConfirmed || isPending || !remarks.trim()}
            onClick={() => onConfirm(remarks)}
            id="confirm-cancel-btn"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Confirm Cancellation (YES)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AwardTenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
  bids?: any[];
  onConfirm: (payload: {
    awardedBidId?: string;
    awardedToVendorId?: string;
    awardedVendorName: string;
    awardedAmount?: number;
    awardedCurrency?: string;
    statusRemarks?: string;
  }) => void;
  isPending?: boolean;
}

export function AwardTenderDialog({
  open,
  onOpenChange,
  tender,
  bids = [],
  onConfirm,
  isPending,
}: AwardTenderDialogProps) {
  const [selectedBidId, setSelectedBidId] = useState<string>("");
  const [manualSupplierName, setManualSupplierName] = useState("");
  const [manualAmount, setManualAmount] = useState<string>("");
  const [remarks, setRemarks] = useState("");

  const validBids = (bids || []).filter((b: any) => b.status && b.status !== "draft");

  useEffect(() => {
    if (open) {
      if (validBids.length > 0) {
        setSelectedBidId(String(validBids[0]._id));
      } else {
        setSelectedBidId("manual");
      }
      setManualSupplierName("");
      setManualAmount("");
      setRemarks("");
    }
  }, [open, bids]);

  const selectedBid = validBids.find((b: any) => String(b._id) === selectedBidId);

  const handleSubmit = () => {
    if (selectedBidId !== "manual" && selectedBid) {
      const vendorName = selectedBid.vendor?.companyName || selectedBid.offlineSupplier?.name || "Supplier";
      onConfirm({
        awardedBidId: String(selectedBid._id),
        awardedToVendorId: selectedBid.vendorProfileId ? String(selectedBid.vendorProfileId) : undefined,
        awardedVendorName: vendorName,
        awardedAmount: selectedBid.totalPrice != null ? Number(selectedBid.totalPrice) : undefined,
        awardedCurrency: selectedBid.currency || tender?.currency || "USD",
        statusRemarks: remarks,
      });
    } else {
      if (!manualSupplierName.trim()) return;
      onConfirm({
        awardedVendorName: manualSupplierName.trim(),
        awardedAmount: manualAmount ? Number(manualAmount) : undefined,
        awardedCurrency: tender?.currency || "USD",
        statusRemarks: remarks,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Trophy className="h-5 w-5 text-amber-500" />
            <DialogTitle>Mark Tender as Awarded</DialogTitle>
          </div>
          <DialogDescription>
            Select the winning supplier / accepted offer from the received bids to finalize this package.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
              Select Winning Offer ({validBids.length} Received)
            </Label>

            {validBids.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-dashed border-border bg-muted/20 text-xs text-muted-foreground text-center">
                No online bids submitted yet. You can award to an offline supplier below.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {validBids.map((b: any) => {
                  const isSelected = String(b._id) === selectedBidId;
                  const supplierName = b.vendor?.companyName || b.offlineSupplier?.name || "Supplier";
                  return (
                    <div
                      key={b._id}
                      onClick={() => setSelectedBidId(String(b._id))}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setSelectedBidId(String(b._id))}
                            className="text-primary h-4 w-4"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-foreground truncate">
                              {supplierName}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              {b.isOffline ? (
                                <Badge variant="secondary" className="text-[10px] py-0">Offline Bid</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] py-0">Online Offer</Badge>
                              )}
                              <span>Submitted: {b.submittedAt ? new Date(b.submittedAt).toLocaleDateString() : "N/A"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {b.totalPrice != null && (
                            <div className="font-semibold text-sm text-foreground">
                              {b.currency || "USD"} {Number(b.totalPrice).toLocaleString()}
                            </div>
                          )}
                          <Badge variant="outline" className="text-[10px] capitalize">{b.status}</Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Option to specify manual offline award */}
            <div
              onClick={() => setSelectedBidId("manual")}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                selectedBidId === "manual"
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={selectedBidId === "manual"}
                  onChange={() => setSelectedBidId("manual")}
                  className="text-primary h-4 w-4"
                />
                <span className="text-sm font-medium text-foreground">
                  Award to another / offline supplier manually
                </span>
              </div>
            </div>
          </div>

          {selectedBidId === "manual" && (
            <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border">
              <div className="space-y-1">
                <Label htmlFor="manual-supplier-name" className="text-xs font-medium">
                  Winning Supplier Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="manual-supplier-name"
                  placeholder="e.g. Apex Engineering Solutions"
                  value={manualSupplierName}
                  onChange={(e) => setManualSupplierName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="manual-amount" className="text-xs font-medium">
                  Awarded Contract Value ({tender?.currency || "USD"})
                </Label>
                <Input
                  id="manual-amount"
                  type="number"
                  placeholder="e.g. 250000"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="award-remarks" className="text-xs font-medium">
              Award Notes / Remarks <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="award-remarks"
              placeholder="e.g., Selected based on lowest evaluated commercial bid and highest technical score."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={
              isPending ||
              (selectedBidId === "manual" && !manualSupplierName.trim()) ||
              (selectedBidId !== "manual" && !selectedBid)
            }
            onClick={handleSubmit}
            id="confirm-award-btn"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Confirm Award
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditRemarksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
  onSave: (remarks: string) => void;
  isPending?: boolean;
}

export function EditRemarksDialog({
  open,
  onOpenChange,
  tender,
  onSave,
  isPending,
}: EditRemarksDialogProps) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open) {
      setRemarks(tender?.statusRemarks || "");
    }
  }, [open, tender]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-foreground mb-1">
            <Pencil className="h-4 w-4 text-primary" />
            <DialogTitle>Edit Remarks / Notes</DialogTitle>
          </div>
          <DialogDescription>
            Update the outcome remarks for this {tender?.status || "package"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-remarks" className="text-xs font-medium">
              Remarks / Resolution Notes
            </Label>
            <Textarea
              id="edit-remarks"
              placeholder="Enter remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={4}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={isPending}
            onClick={() => onSave(remarks)}
            id="save-remarks-btn"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Remarks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TenderSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tender: any;
  onEditRemarks?: () => void;
  canEditRemarks?: boolean;
}

export function TenderSummaryModal({
  open,
  onOpenChange,
  tender,
  onEditRemarks,
  canEditRemarks,
}: TenderSummaryModalProps) {
  if (!tender) return null;

  const bids = Array.isArray(tender.bids) ? tender.bids : [];
  const invites = Array.isArray(tender.invites) ? tender.invites : [];
  const offlineInvites = Array.isArray(tender.offlineInvites) ? tender.offlineInvites : [];
  const validBids = bids.filter((b: any) => b.status && b.status !== "draft");
  const isConcluded = ["closed", "awarded", "cancelled"].includes(tender.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] uppercase">
              {PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES]?.label ?? tender.type}
            </Badge>
            <Badge variant={STATUS_COLORS[tender.status] ?? "outline"}>
              {STATUS_LABELS[tender.status] ?? tender.status}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{tender.title}</DialogTitle>
          <DialogDescription className="text-xs">
            Reference #{String(tender._id).slice(-8)} • Created {formatDistanceToNow(new Date(tender.createdAt), { addSuffix: true })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Concluded Outcome Card */}
          {isConcluded && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              tender.status === "awarded"
                ? "bg-primary/10 border-primary/30"
                : tender.status === "cancelled"
                ? "bg-destructive/10 border-destructive/30"
                : "bg-muted/30 border-border"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    {tender.status === "awarded" && <Trophy className="h-4 w-4 text-amber-500" />}
                    {tender.status === "closed" && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                    {tender.status === "cancelled" && <XCircle className="h-4 w-4 text-destructive" />}
                    Outcome: {STATUS_LABELS[tender.status] ?? tender.status}
                  </div>
                  {tender.status === "awarded" && (
                    <div className="text-sm font-semibold text-foreground">
                      Awarded Supplier: <span className="text-primary font-bold">{tender.awardedVendorName || "Awarded Bidder"}</span>
                      {tender.awardedAmount != null && (
                        <span className="ml-2 text-foreground font-mono">
                          ({tender.awardedCurrency || tender.currency} {Number(tender.awardedAmount).toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}
                  {tender.statusRemarks && (
                    <div className="text-xs text-foreground/90 mt-1 bg-background/50 p-2.5 rounded-lg border border-border/40">
                      <span className="font-medium text-muted-foreground block text-[11px] mb-0.5">Remarks / Reason:</span>
                      {tender.statusRemarks}
                    </div>
                  )}
                  {!tender.statusRemarks && (
                    <div className="text-xs text-muted-foreground italic mt-0.5">
                      No remarks recorded.
                    </div>
                  )}
                </div>

                {canEditRemarks && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs h-7"
                    onClick={() => {
                      onOpenChange(false);
                      onEditRemarks?.();
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit Remarks
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Key Tender Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {tender.estimatedValue && (
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border">
                <span className="text-muted-foreground block">Estimated Budget</span>
                <span className="font-semibold text-foreground">{tender.currency} {Number(tender.estimatedValue).toLocaleString()}</span>
              </div>
            )}
            {tender.bidDeadline && (
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border">
                <span className="text-muted-foreground block">Bid Deadline</span>
                <span className="font-semibold text-foreground">{new Date(tender.bidDeadline).toLocaleDateString()}</span>
              </div>
            )}
            {tender.location && (
              <div className="p-2.5 rounded-lg bg-muted/20 border border-border">
                <span className="text-muted-foreground block">Location</span>
                <span className="font-semibold text-foreground">{tender.location}</span>
              </div>
            )}
          </div>

          {/* Tabs for Offers Received, Invited Suppliers, Offline Invites */}
          <Tabs defaultValue="offers" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="offers" className="text-xs">
                Offers ({validBids.length})
              </TabsTrigger>
              <TabsTrigger value="invites" className="text-xs">
                Invited ({invites.length})
              </TabsTrigger>
              <TabsTrigger value="offline" className="text-xs">
                Offline ({offlineInvites.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="offers" className="space-y-2 mt-3">
              {validBids.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No bids submitted yet for this package.
                </div>
              ) : (
                <div className="space-y-2">
                  {validBids.map((bid: any) => {
                    const isWinner = tender.status === "awarded" && (
                      (tender.awardedBidId && String(bid._id) === String(tender.awardedBidId)) ||
                      bid.status === "accepted"
                    );
                    const supplierName = bid.vendor?.companyName || bid.offlineSupplier?.name || "Supplier";
                    return (
                      <div
                        key={bid._id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          isWinner ? "bg-primary/10 border-primary/40 font-medium" : "bg-muted/20 border-border"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm truncate">{supplierName}</span>
                            {isWinner && <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground">Winner / Accepted</Badge>}
                            {bid.isOffline && <Badge variant="secondary" className="text-[10px]">Offline</Badge>}
                            <Badge variant="outline" className="text-[10px] capitalize">{bid.status}</Badge>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            Submitted: {bid.submittedAt ? new Date(bid.submittedAt).toLocaleDateString() : "N/A"}
                            {bid.vendor?.city ? ` • ${bid.vendor.city}, ${bid.vendor.country}` : ""}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {bid.totalPrice != null && (
                            <div className="font-semibold text-foreground text-sm">
                              {bid.currency || "USD"} {Number(bid.totalPrice).toLocaleString()}
                            </div>
                          )}
                          <Link href={`/bids/${bid._id}`} className="text-primary text-[11px] hover:underline flex items-center justify-end gap-1 mt-0.5">
                            View Offer <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invites" className="space-y-2 mt-3">
              {invites.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No suppliers invited yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map((inv: any) => (
                    <div key={inv._id} className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-foreground">{inv.vendor?.companyName || "Supplier"}</div>
                        <div className="text-muted-foreground">
                          {inv.vendor?.contactPerson ? `Contact: ${inv.vendor.contactPerson} • ` : ""}
                          Status: <span className="capitalize">{inv.status}</span>
                        </div>
                      </div>
                      <Badge variant={inv.status === "accepted" || inv.status === "invited" ? "success" : "secondary"}>
                        {inv.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="offline" className="space-y-2 mt-3">
              {offlineInvites.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No offline suppliers or offline invitations registered.
                </div>
              ) : (
                <div className="space-y-2">
                  {offlineInvites.map((off: any) => (
                    <div key={off._id} className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-foreground">{off.supplierName}</div>
                        <div className="text-muted-foreground">{off.email} {off.note ? `• ${off.note}` : ""}</div>
                      </div>
                      <Badge variant="outline">{off.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Link href={`/tenders/${tender._id}`}>
            <Button size="sm" className="gap-1">
              Go to Full Package Page <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
