"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Package, MessageSquare, Bell, Plus, ChevronRight, Trophy, PartyPopper, XCircle } from "lucide-react";

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;

  // Suppliers only see genuinely open (published, undecided) tenders on the dashboard —
  // awarded/closed/cancelled packages are excluded from both the count and the list.
  const tendersUrl = user?.userType === "vendor" ? "/api/tenders?limit=5&status=published" : "/api/tenders?limit=5";
  const { data: tenderData } = useQuery({ queryKey: ["tenders", "list", tendersUrl], queryFn: () => fetchJSON(tendersUrl), enabled: !!session });
  const { data: bidData } = useQuery({ queryKey: ["bids", "list"], queryFn: () => fetchJSON("/api/bids"), enabled: !!session });
  const { data: notifData } = useQuery({ queryKey: ["notifications"], queryFn: () => fetchJSON("/api/notifications?limit=5"), enabled: !!session });
  const { data: unreadData } = useQuery({ queryKey: ["messages", "unread"], queryFn: () => fetchJSON("/api/messages/unread"), enabled: !!session, refetchInterval: 30000 });
  const { data: profileData } = useQuery({ queryKey: ["profile", "me"], queryFn: () => fetchJSON("/api/profile"), enabled: !!session });

  const tenders = tenderData?.items ?? [];
  const bids = Array.isArray(bidData) ? bidData : [];
  const notifications = Array.isArray(notifData) ? notifData : [];
  const unreadCount = unreadData?.count ?? 0;
  const isCompany = profileData?.userType === "company";
  const isVendor = profileData?.userType === "vendor";
  const isAdmin = user?.role === "admin";

  // Supplier awards won: bid accepted on an awarded package (precise when awardedBidId is available)
  const wonBids = bids.filter((b: any) =>
    b.tender?.status === "awarded" &&
    (b.tender?.awardedBidId ? String(b.tender.awardedBidId) === String(b._id) : b.status === "accepted")
  );

  const stats = isCompany
    ? [
        { label: "My Tenders", value: tenderData?.total ?? 0, icon: FileText, href: "/tenders" },
        { label: "Bids Received", value: bids.length, icon: Package, href: "/bids" },
        { label: "Unread Messages", value: unreadCount, icon: MessageSquare, href: "/messages" },
        { label: "Notifications", value: notifications.filter((n: any) => !n.isRead).length, icon: Bell, href: "/notifications" },
      ]
    : isVendor
    ? [
        { label: "Open Tenders", value: tenderData?.total ?? 0, icon: FileText, href: "/tenders" },
        { label: "My Bids", value: bids.length, icon: Package, href: "/bids" },
        { label: "Awards Won", value: wonBids.length, icon: Trophy, href: "/bids" },
        { label: "Unread Messages", value: unreadCount, icon: MessageSquare, href: "/messages" },
        { label: "Notifications", value: notifications.filter((n: any) => !n.isRead).length, icon: Bell, href: "/notifications" },
      ]
    : [
        { label: "All Tenders", value: tenderData?.total ?? 0, icon: FileText, href: "/tenders" },
        { label: "All Bids", value: bids.length, icon: Package, href: "/bids" },
        { label: "Messages", value: 0, icon: MessageSquare, href: "/messages" },
        { label: "Notifications", value: 0, icon: Bell, href: "/admin" },
      ];

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* soft ambient top glow */}
      <div className="pointer-events-none absolute -top-6 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.06] to-transparent rounded-3xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
            Good {getGreeting()}, {user?.displayName?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Super Admin" : isCompany ? "EPC Company Dashboard" : isVendor ? "Supplier Dashboard" : "Welcome"}
          </p>
        </div>
        {isCompany && (
          <Link href="/tenders/new">
            <Button size="sm" id="new-tender-btn">
              <Plus /> New Tender
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className={`grid grid-cols-2 ${stats.length > 4 ? "md:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"} gap-4 stagger-children`}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="glass card-3d cursor-pointer group border-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-3xl font-bold text-foreground font-[family-name:var(--font-heading)]">{stat.value}</div>
                <div className="text-xs font-medium text-muted-foreground mt-0.5">{stat.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Awards Won (supplier) */}
      {isVendor && wonBids.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-[var(--shadow-card)]" id="awards-won-card">
          <CardHeader className="pb-3 flex-row items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-b border-amber-500/20">
            <CardTitle className="text-base font-[family-name:var(--font-heading)] flex items-center gap-2">
              <PartyPopper className="h-4 w-4 text-amber-500" /> Bid/s awarded — Congratulations!
            </CardTitle>
            <span className="badge-celebrate-chip inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              <Trophy className="h-3 w-3" /> {wonBids.length} {wonBids.length === 1 ? "Win" : "Wins"}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {wonBids.map((b: any) => (
                <Link key={b._id} href={`/bids/${b._id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-amber-500/5 transition-colors group">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{b.tender?.title || `Bid #${String(b._id).slice(-6)}`}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Winning offer{b.tender?.type ? ` · ${String(b.tender.type).toUpperCase()}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {b.totalPrice != null && (
                      <span className="font-mono text-sm font-semibold text-foreground">{b.currency} {Number(b.totalPrice).toLocaleString()}</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Tenders */}
      {tenders.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-3 flex-row items-center justify-between bg-muted/30 border-b border-border">
            <CardTitle className="text-base font-[family-name:var(--font-heading)]">{isVendor ? "Open Tenders" : "Recent Tenders"}</CardTitle>
            <Link href="/tenders" className="text-sm font-semibold text-primary hover:text-primary/80 link-underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {tenders.map((t: any) => (
                <Link key={t._id} href={`/tenders/${t._id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors group">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.type?.toUpperCase()} · {t.currency}</div>
                  </div>
                  <TenderStatusBadge status={t.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-3 flex-row items-center justify-between bg-muted/30 border-b border-border">
            <CardTitle className="text-base font-[family-name:var(--font-heading)]">Recent Notifications</CardTitle>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">{notifications.filter((n: any) => !n.isRead).length} unread</span>
              <Link href="/notifications" className="text-sm font-semibold text-primary hover:text-primary/80 link-underline">View all</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {notifications.slice(0, 5).map((n: any) => {
                const targetUrl = n.type === "message_received"
                  ? (n.relatedId ? `/messages/dm/${n.relatedId}` : "/messages")
                  : n.relatedType === "tender" && n.relatedId
                  ? `/tenders/${n.relatedId}`
                  : n.relatedType === "bid" && n.relatedId
                  ? `/bids/${n.relatedId}`
                  : "/messages";
                const isAwardWin = n.type === "tender_awarded";
                const isAwardLost = n.type === "tender_award_lost";
                return (
                  <Link
                    key={n._id}
                    href={targetUrl}
                    className={`block px-6 py-3.5 transition-colors ${
                      isAwardWin
                        ? "bg-amber-500/[0.07] border-l-2 border-l-amber-500/60 hover:bg-amber-500/[0.12]"
                        : `hover:bg-muted/40 ${!n.isRead ? "bg-primary/[0.04]" : ""}`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isAwardWin && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                          <Trophy className="h-4 w-4 text-amber-500" />
                        </div>
                      )}
                      {isAwardLost && (
                        <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border flex items-center justify-center shrink-0 mt-0.5">
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-sm text-foreground">{n.title}</div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        </div>
                        {n.content && <div className="text-xs text-muted-foreground mt-0.5">{n.content}</div>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function TenderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "secondary",
    published: "success",
    closed: "outline",
    awarded: "default",
    cancelled: "destructive",
  };
  return <Badge variant={(map[status] as "default" | "secondary" | "destructive" | "outline" | "success" | "warning") ?? "outline"}>{status}</Badge>;
}
