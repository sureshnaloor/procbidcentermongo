"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Package, MessageSquare, Bell, Plus, ChevronRight } from "lucide-react";

async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;

  const { data: tenderData } = useQuery({ queryKey: ["tenders", "list"], queryFn: () => fetchJSON("/api/tenders?limit=5"), enabled: !!session });
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
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

      {/* Recent Tenders */}
      {tenders.length > 0 && (
        <Card className="overflow-hidden border-0 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-3 flex-row items-center justify-between bg-muted/30 border-b border-border">
            <CardTitle className="text-base font-[family-name:var(--font-heading)]">Recent Tenders</CardTitle>
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
            <span className="text-xs font-medium text-muted-foreground">{notifications.filter((n: any) => !n.isRead).length} unread</span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {notifications.slice(0, 5).map((n: any) => (
                <div key={n._id} className={`px-6 py-3.5 ${!n.isRead ? "bg-primary/[0.04]" : ""}`}>
                  <div className="font-semibold text-sm text-foreground">{n.title}</div>
                  {n.content && <div className="text-xs text-muted-foreground mt-0.5">{n.content}</div>}
                </div>
              ))}
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
