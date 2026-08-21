"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, FileText, CalendarClock, MapPin, DollarSign, Users, Loader2, ExternalLink, Plus, MessageSquare } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

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
    mutationFn: (status: string) => fetch(`/api/tenders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["tender", id] }); },
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs uppercase">{tender.type}</Badge>
            <Badge variant={STATUS_COLORS[tender.status] ?? "outline"}>{tender.status}</Badge>
            {biddingClosed && <Badge variant="warning">Bidding Closed</Badge>}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{tender.title}</h1>
          {tender.company && (
            <div className="flex items-center gap-3 mt-1">
              <Link href={`/companies/${tender.company._id ?? tender.companyProfileId}`} className="text-sm text-primary hover:underline">
                {tender.company.companyName}
              </Link>
              {isVendor && (
                <Link href={`/messages/dm/${tender.company._id ?? tender.companyProfileId}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs"><MessageSquare className="h-3 w-3" /> Message</Button>
                </Link>
              )}
            </div>
          )}
        </div>
        {(isOwner || isAdmin) && (
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && tender.canEdit && (
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
        <StatCard icon={Users} label="Bids" value={bids.length} />
      </div>

      {/* Actions */}
      {isVendor && !biddingClosed && (
        <div className="flex flex-wrap gap-3 items-center">
          {canPrepareOffer ? (
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
          {tender.clauses?.length > 0 && <TabsTrigger value="terms">Terms ({tender.clauses.length})</TabsTrigger>}
          {tender.documents?.length > 0 && <TabsTrigger value="documents">Documents ({tender.documents.length})</TabsTrigger>}
          {(isOwner || isAdmin) && <TabsTrigger value="suppliers">Suppliers ({(invites as any[]).length})</TabsTrigger>}
          {(isOwner || isAdmin) && <TabsTrigger value="bids">Offers ({bids.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          {tender.description && (
            <Card><CardContent className="pt-6"><p className="text-sm text-foreground dark:text-muted-foreground whitespace-pre-wrap">{tender.description}</p></CardContent></Card>
          )}
          {tender.categories?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Material & Service Groups</CardTitle></CardHeader>
              <CardContent className="pt-0 flex flex-wrap gap-2">
                {tender.categories.map((c: any) => (
                  <Badge key={c.id} variant="outline">{c.name}</Badge>
                ))}
              </CardContent>
            </Card>
          )}
          {tender.requirements && (
            <Card><CardHeader><CardTitle className="text-sm">Requirements</CardTitle></CardHeader><CardContent className="pt-0"><p className="text-sm text-foreground dark:text-muted-foreground whitespace-pre-wrap">{tender.requirements}</p></CardContent></Card>
          )}
        </TabsContent>

        {tender.clauses?.length > 0 && (
          <TabsContent value="terms" className="space-y-4 mt-4">
            {tender.clauses.map((c: any) => (
              <Card key={c.slug || c.kind}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{c.title}</CardTitle>
                    {c.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-foreground dark:text-muted-foreground whitespace-pre-wrap">{c.body}</p>
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
                    <div className="text-xs text-muted-foreground">{d.category} · {d.fileType}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </TabsContent>
        )}

        {(isOwner || isAdmin) && (
          <TabsContent value="suppliers" className="mt-4 space-y-4">
            {!biddingClosed && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Invite suppliers</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">Invited suppliers can prepare offers immediately. Others may request access for your approval.</p>
                  <div className="grid gap-2 max-h-64 overflow-y-auto">
                    {vendors.filter((v: any) => !invitedIds.has(String(v._id))).map((v: any) => (
                      <div key={v._id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{v.companyName || "Supplier"}</div>
                          <div className="text-xs text-muted-foreground">{[v.city, v.country].filter(Boolean).join(", ")}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => inviteMutation.mutate(v._id)} disabled={inviteMutation.isPending}>Invite</Button>
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
                <div className="flex justify-end">
                  <Link href={`/bids/comparison/${id}`}>
                    <Button size="sm" variant="outline" className="flex items-center gap-1.5" id="compare-bids-btn">
                      Compare Offers Side-by-Side
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-3">
                  {(bids as any[]).map((b: any) => (
                    <Link key={b._id} href={`/bids/${b._id}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{b.vendor?.companyName ?? "Unknown vendor"}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{b.currency} {b.totalPrice?.toLocaleString() ?? "—"} · Validity: {b.validityDays} days</div>
                            </div>
                            <Badge variant={STATUS_COLORS[b.status] ?? "outline"} className="shrink-0">{b.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        )}
      </Tabs>
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
