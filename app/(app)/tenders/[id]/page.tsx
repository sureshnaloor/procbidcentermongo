"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, FileText, CalendarClock, MapPin, DollarSign, Users, Loader2, ExternalLink, Plus, AlertCircle, Copy, Pencil, Download, Ship } from "lucide-react";
import { format } from "date-fns";
import { documentCategoryLabel, getPublishDateIssues, PROCUREMENT_TYPES } from "@/lib/procurement";
import { incotermLabel } from "@/lib/incoterms";
import { OfferThreadPanel, type ThreadVendorOption } from "@/components/offer-thread-panel";
import { PublishConfirmDialog } from "@/components/publish-confirm-dialog";
import { downloadBoqFile } from "@/lib/boq-browser";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary", published: "success", closed: "outline", awarded: "default", cancelled: "destructive",
};

export default function TenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  const router = useRouter();
  const qc = useQueryClient();
  const [publishOpen, setPublishOpen] = useState(false);
  const [threadVendorId, setThreadVendorId] = useState<string>("");

  const { data: tender, isLoading } = useQuery({ queryKey: ["tender", id], queryFn: () => fetch(`/api/tenders/${id}`).then((r) => r.json()) });
  const { data: profile } = useQuery({ queryKey: ["profile", "me"], queryFn: () => fetch("/api/profile").then((r) => r.json()), enabled: !!session });
  const { data: bids = [] } = useQuery({ queryKey: ["bids", "by-tender", id], queryFn: () => fetch(`/api/bids/by-tender/${id}`).then((r) => r.json()), enabled: !!tender });
  const isOwner = profile?.userType === "company" && tender && String(profile?._id) === String(tender.companyProfileId);
  const isVendor = profile?.userType === "vendor";
  const isAdmin = user?.role === "admin";

  const { data: invites = [] } = useQuery({
    queryKey: ["tender-invites", id],
    queryFn: () => fetch(`/api/tenders/${id}/invites`).then((r) => r.json()),
    enabled: !!tender,
  });
  const { data: vendorsData } = useQuery({
    queryKey: ["vendors", "invite-list"],
    queryFn: () => fetch("/api/profile/list?userType=vendor&limit=100").then((r) => r.json()),
    enabled: !!tender && profile?.userType === "company",
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/tenders/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Tender deleted"); router.push("/tenders"); },
    onError: () => toast.error("Failed to delete tender"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/tenders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      return data;
    },
    onSuccess: (_data, status) => {
      setPublishOpen(false);
      toast.success(status === "published" ? "Package published" : "Status updated");
      qc.invalidateQueries({ queryKey: ["tender", id] });
      qc.invalidateQueries({ queryKey: ["tenders"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: async (vendorProfileId: string) => {
      const res = await fetch(`/api/tenders/${id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite", vendorProfileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => { toast.success("Supplier invited"); qc.invalidateQueries({ queryKey: ["tender-invites", id] }); },
    onError: (err: Error) => toast.error(err.message),
  });
  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenders/${id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Request sent to the company");
      qc.invalidateQueries({ queryKey: ["tender", id] });
      qc.invalidateQueries({ queryKey: ["tender-invites", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const updateInviteMutation = useMutation({
    mutationFn: async ({ inviteId, status }: { inviteId: string; status: string }) => {
      const res = await fetch(`/api/tenders/${id}/invites/${inviteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tender-invites", id] });
      qc.invalidateQueries({ queryKey: ["tender", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!tender) return <div className="text-center py-16 text-muted-foreground">Tender not found or access denied</div>;

  const biddingClosed = tender.biddingClosed;
  const participation = tender.participation ?? { status: null, canPrepareOffer: false };
  const canPrepareOffer = isVendor && !biddingClosed && participation.canPrepareOffer;
  const vendors = vendorsData?.items ?? [];
  const invitedIds = new Set((invites as any[]).map((i: any) => String(i.vendorProfileId)));
  const typeLabel = PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES]?.label ?? "package";
  const publishDates = getPublishDateIssues(tender.bidDeadline, tender.deliveryDeadline);

  const threadVendors: ThreadVendorOption[] = (() => {
    const map = new Map<string, string>();
    for (const invite of invites as any[]) {
      const vid = String(invite.vendorProfileId);
      map.set(vid, invite.vendor?.companyName || "Supplier");
    }
    for (const bidRow of bids as any[]) {
      const vid = String(bidRow.vendorProfileId);
      if (!map.has(vid)) map.set(vid, bidRow.vendor?.companyName || "Supplier");
    }
    return [...map.entries()].map(([optId, name]) => ({ id: optId, name }));
  })();

  const vendorCanMessage = isVendor && Boolean(tender.participation?.status || tender.myBid?._id);
  const companyCanMessage = isOwner && threadVendors.length > 0;
  const showThread = vendorCanMessage || companyCanMessage;
  const selectedThreadVendor = isVendor
    ? String(profile?._id || "")
    : (threadVendorId || threadVendors[0]?.id || "");
  const threadCounterpart = isVendor
    ? (tender.company?.companyName || "Company")
    : (threadVendors.find((v) => v.id === selectedThreadVendor)?.name || "Supplier");

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-start animate-fade-in-up">
    <div className="flex-1 min-w-0 max-w-4xl mx-auto lg:mx-0 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs uppercase">{PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES]?.label ?? tender.type}</Badge>
            <Badge variant={STATUS_COLORS[tender.status] ?? "outline"}>{tender.status}</Badge>
            {biddingClosed && <Badge variant="warning">Bidding Closed</Badge>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">{tender.title}</h1>
          {tender.company && (
            <div className="flex items-center gap-3 mt-1">
              <Link href={`/companies/${tender.company._id ?? tender.companyProfileId}`} className="text-sm text-primary hover:underline">
                {tender.company.companyName}
              </Link>
            </div>
          )}
        </div>
        {(isOwner || isAdmin) && (
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && tender.status === "draft" && (
              <Link href={`/tenders/${id}/edit`}>
                <Button variant="outline" size="sm" id="edit-tender-btn"><Edit className="h-4 w-4" /></Button>
              </Link>
            )}
            {(isOwner || isAdmin) && (
              <Button variant="outline" size="sm" id="delete-tender-btn" onClick={() => { if (confirm("Delete this tender?")) deleteMutation.mutate(); }} disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tender.estimatedValue && <StatCard icon={DollarSign} label="Budget" value={`${tender.currency} ${tender.estimatedValue.toLocaleString()}`} />}
        {tender.bidDeadline && <StatCard icon={CalendarClock} label="Deadline" value={format(new Date(tender.bidDeadline), "dd MMM yyyy")} />}
        {tender.location && <StatCard icon={MapPin} label="Location" value={tender.location} />}
        {tender.incoterm && (
          <StatCard
            icon={Ship}
            label="Incoterm"
            value={tender.incotermPlace ? `${tender.incoterm} — ${tender.incotermPlace}` : (incotermLabel(tender.incoterm) ?? tender.incoterm)}
          />
        )}
        <StatCard icon={Users} label="Bids" value={bids.length} />
      </div>

      {/* Actions */}
      {isVendor && biddingClosed && tender.myBid?._id && (
        <Link href={`/bids/${tender.myBid._id}`}>
          <Button variant="outline" size="sm">View Offer</Button>
        </Link>
      )}

      {isVendor && !biddingClosed && (
        <div className="flex flex-wrap gap-3 items-center">
          {tender.myBid?.status === "draft" ? (
            <Link href={`/bids/${tender.myBid._id}/edit`}>
              <Button id="modify-offer-btn"><Pencil /> Modify Offer</Button>
            </Link>
          ) : tender.myBid?._id ? (
            <Link href={`/bids/${tender.myBid._id}`}>
              <Button variant="outline" id="view-offer-btn">View Offer</Button>
            </Link>
          ) : canPrepareOffer ? (
            <Link href={`/bids/new/${id}`}>
              <Button id="submit-bid-btn"><Plus /> Prepare Offer</Button>
            </Link>
          ) : participation.status === "requested" ? (
            <Badge variant="warning">Waiting for company approval</Badge>
          ) : participation.status === "declined" || participation.status === "revoked" ? (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Participation not approved</Badge>
              <Button variant="outline" size="sm" onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>Request again</Button>
            </div>
          ) : (
            <Button variant="outline" id="request-invite-btn" onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>
              {requestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Request to prepare offer
            </Button>
          )}
        </div>
      )}

      {isOwner && tender.status === "draft" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-foreground">This {PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES]?.label ?? "package"} is a draft</div>
              <p className="text-muted-foreground mt-0.5">
                Suppliers cannot see it until you publish.
                {(tender.publishBlockers as string[] | undefined)?.length
                  ? ` ${((tender.publishBlockers as string[])[0])}`
                  : " It is ready to publish."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              id="publish-tender-btn"
              onClick={() => setPublishOpen(true)}
              disabled={updateStatusMutation.isPending || tender.canPublish === false}
            >
              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
            <Link href={`/tenders/${id}/edit`}>
              <Button size="sm" variant="outline">Complete package</Button>
            </Link>
          </div>
        </div>
      )}

      {isOwner && tender.status === "published" && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate("closed")} id="close-tender-btn">Close Tender</Button>
          <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate("awarded")} id="award-tender-btn">Mark Awarded</Button>
          <Button variant="outline" size="sm" onClick={() => updateStatusMutation.mutate("cancelled")} id="cancel-tender-btn">Cancel</Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {tender.boqItems?.length > 0 && <TabsTrigger value="boq">BOQ ({tender.boqItems.length})</TabsTrigger>}
          {tender.clauses?.length > 0 && <TabsTrigger value="terms">Terms ({tender.clauses.length})</TabsTrigger>}
          {tender.documents?.length > 0 && <TabsTrigger value="documents">Documents ({tender.documents.length})</TabsTrigger>}
          {(isOwner || isAdmin) && tender.status !== "draft" && <TabsTrigger value="suppliers">Suppliers ({(invites as any[]).length})</TabsTrigger>}
          {(isOwner || isAdmin) && <TabsTrigger value="bids">Offers ({bids.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          {PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES] && (
            <p className="text-sm text-muted-foreground">{PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES].summary}</p>
          )}
          {tender.description && (
            <Card className="glass card-3d border-0"><CardContent className="pt-6"><p className="text-sm text-foreground whitespace-pre-wrap">{tender.description}</p></CardContent></Card>
          )}
          {tender.categories?.length > 0 && (
            <Card className="glass card-3d border-0">
              <CardHeader><CardTitle className="text-sm font-[family-name:var(--font-heading)]">Material & Service Groups</CardTitle></CardHeader>
              <CardContent className="pt-0 flex flex-wrap gap-2">
                {tender.categories.map((c: any) => (
                  <Badge key={c.id} variant="outline">{c.name}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
          {tender.requirements && (
            <Card className="glass card-3d border-0"><CardHeader><CardTitle className="text-sm font-[family-name:var(--font-heading)]">Requirements</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-foreground whitespace-pre-wrap">{tender.requirements}</p></CardContent></Card>
          )}
        </TabsContent>

        {tender.boqItems?.length > 0 && (
          <TabsContent value="boq" className="mt-4">
            <Card className="glass card-3d border-0">
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <CardTitle className="text-sm font-[family-name:var(--font-heading)]">Bill of Quantities</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  id="download-tender-boq-btn"
                  onClick={async () => {
                    try {
                      const filled = Boolean(isVendor && tender.myBid?._id);
                      await downloadBoqFile(
                        `/api/tenders/${id}/boq-file${filled ? "?filled=1" : ""}`,
                        `${tender.title || "BOQ"}.xlsx`
                      );
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not download BOQ");
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  {isVendor ? "Download fillable BOQ" : "Download BOQ"}
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  <div className="col-span-2">Code</div>
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Qty</div>
                  <div className="col-span-3">Unit</div>
                </div>
                <div className="space-y-2">
                  {tender.boqItems.map((item: any, i: number) => (
                    <div key={item.lineCode || i} className="grid grid-cols-12 gap-2 text-sm border-b border-border pb-2 last:border-0">
                      <div className="col-span-2 font-mono text-xs text-muted-foreground">{item.lineCode || `BOQ-${String(i + 1).padStart(3, "0")}`}</div>
                      <div className="col-span-5 text-foreground">{item.description}</div>
                      <div className="col-span-2">{item.quantity}</div>
                      <div className="col-span-3 text-muted-foreground">{item.unit}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {tender.clauses?.length > 0 && (
          <TabsContent value="terms" className="space-y-4 mt-4">
            {tender.clauses.map((c: any) => (
              <Card key={c.slug || c.kind}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-[family-name:var(--font-heading)]">{c.title}</CardTitle>
                    {c.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}

        {tender.documents?.length > 0 && (
          <TabsContent value="documents" className="mt-4">
            <div className="grid gap-2">
              {tender.documents.map((d: any) => (
                <a key={d.storedName} href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent transition-colors">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{documentCategoryLabel(d.category)} · {d.fileType}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </TabsContent>
        )}

        {(isOwner || isAdmin) && tender.status !== "draft" && (
          <TabsContent value="suppliers" className="mt-4 space-y-4">
            {!biddingClosed && (
              <Card className="glass card-3d border-0">
                <CardHeader><CardTitle className="text-sm font-[family-name:var(--font-heading)]">Invite suppliers</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Invited suppliers can prepare offers immediately. Others may request access for your approval.</p>
                  <div className="grid gap-2 max-h-64 overflow-y-auto">
                    {vendors.filter((v: any) => !invitedIds.has(String(v._id))).map((v: any) => (
                      <div key={v._id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{v.companyName || "Supplier"}</div>
                          <div className="text-xs text-muted-foreground">{[v.city, v.country].filter(Boolean).join(", ")}</div>
                          {(v.capabilityGroups ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(v.capabilityGroups ?? []).slice(0, 3).map((g: any) => (
                                <Badge key={g._id} variant="outline" className="text-[10px]">{g.name}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link href={`/vendors/${v._id}`}>
                            <Button size="sm" variant="ghost">Profile</Button>
                          </Link>
                          <Button size="sm" variant="outline" onClick={() => inviteMutation.mutate(v._id)} disabled={inviteMutation.isPending}>Invite</Button>
                        </div>
                      </div>
                    ))}
                    {vendors.filter((v: any) => !invitedIds.has(String(v._id))).length === 0 && (
                      <p className="text-xs text-muted-foreground">All listed suppliers have already been invited or have requested access.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-2">
              {(invites as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No invitations or requests yet</p>
              ) : (invites as any[]).map((inv: any) => (
                <div key={inv._id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-medium">{inv.vendor?.companyName ?? "Supplier"}</div>
                    <div className="text-xs text-muted-foreground capitalize">{inv.status}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.offerPath && (inv.status === "invited" || inv.status === "accepted") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const url = `${window.location.origin}${inv.offerPath}`;
                          await navigator.clipboard.writeText(url);
                          toast.success("Vendor link copied");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy link
                      </Button>
                    )}
                    {inv.status === "requested" && (
                      <>
                        <Button size="sm" onClick={() => updateInviteMutation.mutate({ inviteId: inv._id, status: "accepted" })}>Accept</Button>
                        <Button size="sm" variant="outline" onClick={() => updateInviteMutation.mutate({ inviteId: inv._id, status: "declined" })}>Decline</Button>
                      </>
                    )}
                    {(inv.status === "invited" || inv.status === "accepted") && (
                      <Button size="sm" variant="ghost" onClick={() => updateInviteMutation.mutate({ inviteId: inv._id, status: "revoked" })}>Revoke</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {(isOwner || isAdmin) && (
          <TabsContent value="bids" className="mt-4 space-y-4">
            {bids.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No offers received yet</p>
            ) : (
              <>
                <div className="flex justify-end gap-2">
                  <Link href={`/bids/comparison/${id}`}>
                    <Button size="sm" variant="outline" className="flex items-center gap-1.5" id="compare-bids-btn">
                      Bid summary
                    </Button>
                  </Link>
                  <Link href={`/comparisons/${id}`}>
                    <Button size="sm" className="flex items-center gap-1.5" id="comparison-statement-btn">
                      Comparison statement
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-3">
                  {(bids as any[]).map((b: any) => (
                    <Card key={b._id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-2">
                        <Link href={`/bids/${b._id}`} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{b.vendor?.companyName ?? "Unknown vendor"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{b.currency} {b.totalPrice?.toLocaleString() ?? "—"} · Validity: {b.validityDays} days</div>
                          </div>
                          <Badge variant={STATUS_COLORS[b.status] ?? "outline"} className="shrink-0">{b.status}</Badge>
                        </Link>
                        {(b.signedOffers ?? []).length > 0 && (
                          <div className="pt-1 border-t border-border space-y-1">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Signed offer</div>
                            {(b.signedOffers as any[]).map((doc: any) => (
                              <a key={doc.storedName} href={doc.fileUrl} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline truncate">
                                {doc.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>

      <PublishConfirmDialog
        open={publishOpen}
        typeLabel={typeLabel}
        warnings={publishDates.warnings}
        pending={updateStatusMutation.isPending}
        onOpenChange={setPublishOpen}
        onProceed={() => updateStatusMutation.mutate("published")}
      />
    </div>
    {showThread && (
      <OfferThreadPanel
        tenderId={id}
        vendorProfileId={selectedThreadVendor}
        bidId={tender.myBid?._id ? String(tender.myBid._id) : undefined}
        counterpartName={threadCounterpart}
        vendorOptions={isOwner ? threadVendors : undefined}
        onVendorChange={setThreadVendorId}
      />
    )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="font-semibold text-sm text-foreground">{value}</div>
    </div>
  );
}
