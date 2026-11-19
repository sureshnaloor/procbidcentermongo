"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Building2,
  FileText,
  DollarSign,
  Trophy,
  Calendar,
  ExternalLink,
  Star,
  Award,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

interface EngagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: string;
  companyId?: string;
  vendorName?: string;
  companyName?: string;
  isCompanyViewer?: boolean;
}

export function EngagementDialog({
  open,
  onOpenChange,
  vendorId,
  companyId,
  vendorName,
  companyName,
  isCompanyViewer = true,
}: EngagementDialogProps) {
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});

  const qParams = new URLSearchParams();
  if (vendorId) qParams.set("vendorId", vendorId);
  if (companyId) qParams.set("companyId", companyId);

  const { data, isLoading } = useQuery({
    queryKey: ["engagement", vendorId, companyId],
    queryFn: () => fetch(`/api/engagement?${qParams}`).then((r) => r.json()),
    enabled: open && (Boolean(vendorId) || Boolean(companyId)),
  });

  const stats = data?.stats;
  const engagements = data?.engagements ?? [];
  const targetName = isCompanyViewer
    ? data?.vendor?.companyName || vendorName || "Supplier"
    : data?.company?.companyName || companyName || "Company";

  const targetId = isCompanyViewer ? vendorId : companyId;

  const getStatusBadge = (status: string, isAwarded: boolean) => {
    if (isAwarded) {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
          <Trophy className="h-3 w-3" /> Awarded
        </Badge>
      );
    }
    switch (status) {
      case "submitted":
        return <Badge variant="secondary" className="text-[11px]">Submitted</Badge>;
      case "shortlisted":
        return <Badge variant="outline" className="border-primary text-primary text-[11px]">Shortlisted</Badge>;
      case "revision_requested":
        return <Badge variant="outline" className="border-amber-500 text-amber-600 text-[11px]">Revision Requested</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="text-[11px]">Not Awarded</Badge>;
      case "withdrawn":
        return <Badge variant="outline" className="text-muted-foreground text-[11px]">Withdrawn</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] capitalize">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {isCompanyViewer ? `Bids & Activity: ${targetName}` : `My Activity with ${targetName}`}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Commercial participation history, submitted pricing, and status.
                </p>
              </div>
            </div>

            {targetId && (
              <div className="flex items-center gap-2">
                {isCompanyViewer ? (
                  <Link href={`/vendors/${targetId}/evaluation`} onClick={() => onOpenChange(false)}>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10">
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      Grading &amp; Evaluation
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/companies/${targetId}/bids-eval`} onClick={() => onOpenChange(false)}>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10">
                      <Award className="h-3.5 w-3.5 text-primary" />
                      Performance &amp; Eval
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Quick Metrics */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4">
              <div className="bg-muted/40 rounded-xl p-2.5 text-center border border-border/60">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <FileText className="h-3 w-3" /> Tenders
                </div>
                <div className="text-base font-bold text-foreground mt-0.5">{stats.totalEngagements}</div>
              </div>

              <div className="bg-muted/40 rounded-xl p-2.5 text-center border border-border/60">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Trophy className="h-3 w-3 text-emerald-600" /> Win Rate
                </div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">
                  {stats.winRatePercent}% <span className="text-[10px] text-muted-foreground font-normal">({stats.totalAwarded} won)</span>
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl p-2.5 text-center border border-border/60">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <DollarSign className="h-3 w-3" /> Total Quoted
                </div>
                <div className="text-base font-bold text-foreground mt-0.5">
                  ${stats.totalQuotedValue.toLocaleString()}
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl p-2.5 text-center border border-border/60">
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-primary" /> Eval Grade
                </div>
                <div className="text-base font-bold text-foreground mt-0.5 flex items-center justify-center gap-1">
                  {stats.latestGrade ? (
                    <>
                      <span className="text-primary font-black">Grade {stats.latestGrade}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({stats.averageScore}%)</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground font-normal">Not evaluated</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
          ) : engagements.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-muted/20">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-foreground">No tender or bid activity found</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {isCompanyViewer
                  ? "This supplier has not participated in or been invited to any tenders published by your company yet."
                  : "You have not participated in any tenders from this company yet."}
              </p>
            </div>
          ) : (
            engagements.map((eng: any) => {
              const hasBid = eng.bid !== null;
              const isLineOpen = !!expandedLines[eng.tenderId];

              return (
                <div
                  key={eng.tenderId}
                  className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs hover:border-primary/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/tenders/${eng.tenderId}`}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                          {eng.tenderTitle}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </Link>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {eng.tenderType}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        {eng.bidDeadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Deadline: {new Date(eng.bidDeadline).toLocaleDateString()}
                          </span>
                        )}
                        <span className="capitalize">Tender: {eng.tenderStatus}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      {hasBid ? (
                        getStatusBadge(eng.bid.status, eng.isAwardedToThisVendor)
                      ) : (
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          Invited (No Bid)
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Bid Pricing & Commercial Details */}
                  {hasBid ? (
                    <div className="bg-muted/30 rounded-xl p-3 border border-border/60 text-xs space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-muted-foreground">Submitted Pricing: </span>
                          <span className="font-bold text-sm text-foreground">
                            {eng.bid.currency} {Number(eng.bid.totalPrice).toLocaleString()}
                          </span>
                          {eng.bid.discountValue ? (
                            <span className="text-[11px] text-emerald-600 ml-1.5 font-medium">
                              (incl. {eng.bid.discountType === "percent" ? `${eng.bid.discountValue}%` : `$${eng.bid.discountValue}`} discount)
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          {eng.bid.validityDays && (
                            <span className="text-muted-foreground text-[11px]">
                              Validity: {eng.bid.validityDays} days
                            </span>
                          )}
                          <Link href={`/bids/${eng.bid.bidId}`}>
                            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1">
                              View Offer <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {eng.bid.notes && (
                        <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-1.5">
                          &ldquo;{eng.bid.notes}&rdquo;
                        </p>
                      )}

                      {/* Line Items Preview Toggle */}
                      {eng.bid.lineItemsCount > 0 && (
                        <div className="border-t border-border/40 pt-2">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            onClick={() =>
                              setExpandedLines((prev) => ({ ...prev, [eng.tenderId]: !isLineOpen }))
                            }
                          >
                            {isLineOpen ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {isLineOpen
                              ? `Hide quoted items (${eng.bid.lineItemsCount})`
                              : `Show quoted items (${eng.bid.lineItemsCount})`}
                          </button>

                          {isLineOpen && (
                            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {eng.bid.lineItemsPreview.map((item: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-[11px] bg-card p-1.5 rounded-lg border border-border/60"
                                >
                                  <span className="truncate max-w-[65%] font-medium text-foreground">
                                    {item.description}
                                  </span>
                                  <span className="font-mono text-muted-foreground">
                                    {item.quantity} {item.unit} &times; {eng.bid.currency} {Number(item.unitPrice).toLocaleString()} ={" "}
                                    <span className="font-semibold text-foreground">
                                      {eng.bid.currency} {Number(item.totalPrice).toLocaleString()}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/20 rounded-xl p-2.5">
                      Invited to bid on this tender on{" "}
                      {eng.invite?.createdAt ? new Date(eng.invite.createdAt).toLocaleDateString() : "earlier date"}
                      . No bid submission recorded.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
