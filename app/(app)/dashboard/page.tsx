"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Package,
  MessageSquare,
  Bell,
  Plus,
  ChevronRight,
  Trophy,
  PartyPopper,
  XCircle,
  Scale,
  Users,
  Workflow,
  Calendar,
  Sparkles,
  Upload,
  UserCheck,
  Gavel,
  Radar,
  CheckCircle2,
  PenLine,
  Search,
} from "lucide-react";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wonBids = bids.filter((b: any) =>
    b.tender?.status === "awarded" &&
    (b.tender?.awardedBidId ? String(b.tender.awardedBidId) === String(b._id) : b.status === "accepted")
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unreadNotifsCount = notifications.filter((n: any) => !n.isRead).length;

  const stats = isCompany
    ? [
        { label: "My Tenders", value: tenderData?.total ?? 0, icon: FileText, href: "/tenders", color: "text-primary", bg: "bg-primary/10" },
        { label: "Bids Received", value: bids.length, icon: Package, href: "/bids", color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Unread Messages", value: unreadCount, icon: MessageSquare, href: "/messages", color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Notifications", value: unreadNotifsCount, icon: Bell, href: "/notifications", color: "text-emerald-500", bg: "bg-emerald-500/10" },
      ]
    : isVendor
    ? [
        { label: "Open Tenders", value: tenderData?.total ?? 0, icon: FileText, href: "/tenders", color: "text-primary", bg: "bg-primary/10" },
        { label: "My Bids", value: bids.length, icon: Package, href: "/bids", color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Awards Won", value: wonBids.length, icon: Trophy, href: "/bids", color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Unread Messages", value: unreadCount, icon: MessageSquare, href: "/messages", color: "text-purple-500", bg: "bg-purple-500/10" },
        { label: "Notifications", value: unreadNotifsCount, icon: Bell, href: "/notifications", color: "text-emerald-500", bg: "bg-emerald-500/10" },
      ]
    : [
        { label: "All Tenders", value: tenderData?.total ?? 0, icon: FileText, href: "/tenders", color: "text-primary", bg: "bg-primary/10" },
        { label: "All Bids", value: bids.length, icon: Package, href: "/bids", color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Messages", value: 0, icon: MessageSquare, href: "/messages", color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Notifications", value: 0, icon: Bell, href: "/admin", color: "text-emerald-500", bg: "bg-emerald-500/10" },
      ];

  const roleLabel = isAdmin
    ? "Super Admin"
    : isCompany
    ? "EPC Company Dashboard"
    : isVendor
    ? "Supplier Dashboard"
    : "Welcome";

  // Pipeline strip mirrors the hub — orientation on where each module fits
  const workflowSteps = isCompany
    ? [
        { label: "Import BOQ", icon: Upload },
        { label: "Publish RFQ", icon: FileText },
        { label: "Invite Suppliers", icon: UserCheck },
        { label: "Receive Bids", icon: Package },
        { label: "Level & Compare", icon: Scale },
        { label: "Award & PO", icon: Gavel },
      ]
    : isVendor
    ? [
        { label: "Get Matched", icon: Radar },
        { label: "Accept Invite", icon: CheckCircle2 },
        { label: "Prepare Offer", icon: PenLine },
        { label: "Submit Bid", icon: Upload },
        { label: "Clarifications", icon: MessageSquare },
        { label: "Win Award", icon: Trophy },
      ]
    : [
        { label: "Tenders", icon: FileText },
        { label: "Bids", icon: Package },
        { label: "Comparisons", icon: Scale },
        { label: "Suppliers", icon: Users },
      ];

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {/* soft ambient top glow */}
      <div className="pointer-events-none absolute -top-6 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.06] to-transparent rounded-3xl" />

      {/* ─── Greeting & Quick Actions ─── */}
      <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={11} /> {roleLabel}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold flex items-center gap-1.5 border border-border">
              <Calendar size={11} className="text-primary" /> {todayLabel}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
            Good {getGreeting()}, {user?.displayName?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            {isCompany
              ? "Publish RFQs, level every bid apple-to-apple, and award with a complete compliance trail."
              : isVendor
              ? "Get matched to relevant packages, submit structured offers, and track every evaluation."
              : "Manage system masters, compliance, and user directories."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isCompany && (
            <Link href="/tenders/new">
              <Button size="sm" id="new-tender-btn" className="rounded-xl shadow-md shadow-primary/20">
                <Plus /> New Tender
              </Button>
            </Link>
          )}
          {isCompany && (
            <Link href="/comparisons">
              <Button size="sm" variant="outline" className="rounded-xl border-border hover:border-primary/40">
                <Scale className="text-primary" /> Bid Leveling
              </Button>
            </Link>
          )}
          {isVendor && (
            <Link href="/tenders">
              <Button size="sm" className="rounded-xl shadow-md shadow-primary/20">
                <Search /> Browse Packages
              </Button>
            </Link>
          )}
          {isVendor && (
            <Link href="/bids">
              <Button size="sm" variant="outline" className="rounded-xl border-border hover:border-primary/40">
                <Package className="text-primary" /> My Bids
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className={`grid grid-cols-2 ${stats.length > 4 ? "md:grid-cols-3 lg:grid-cols-5" : "lg:grid-cols-4"} gap-4 stagger-children`}>
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <div className="group relative bg-card border border-border rounded-2xl card-3d card-sheen hover:border-primary/40 cursor-pointer overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-3xl font-extrabold text-foreground font-[family-name:var(--font-heading)]">{stat.value}</div>
                <div className="text-xs font-semibold text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ─── Procurement Pipeline Strip ─── */}
      <div className="bg-card/70 backdrop-blur-sm border border-border rounded-2xl px-5 py-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground mr-3 flex items-center gap-1.5 shrink-0">
            <Workflow size={13} className="text-primary" /> Your pipeline
          </span>
          {workflowSteps.map((step, i) => (
            <React.Fragment key={i}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground whitespace-nowrap hover:border-primary/40 hover:text-primary transition-colors">
                <step.icon size={13} className="text-primary" />
                {step.label}
              </span>
              {i < workflowSteps.length - 1 && (
                <ChevronRight size={13} className="text-muted-foreground/50 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ─── Awards Won (supplier) ─── */}
      {isVendor && wonBids.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]" id="awards-won-card">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-b border-amber-500/20">
            <h2 className="text-base font-bold font-[family-name:var(--font-heading)] flex items-center gap-2 text-foreground">
              <PartyPopper className="h-4 w-4 text-amber-500" /> Bid/s awarded — Congratulations!
            </h2>
            <span className="badge-celebrate-chip inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              <Trophy className="h-3 w-3" /> {wonBids.length} {wonBids.length === 1 ? "Win" : "Wins"}
            </span>
          </div>
          <div className="divide-y divide-border">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
        </div>
      )}

      {/* ─── Tenders + Notifications (two-column on desktop) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenders */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border">
            <h2 className="text-base font-bold font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> {isVendor ? "Open Tenders" : "Recent Tenders"}
            </h2>
            <Link href="/tenders" className="text-sm font-semibold text-primary hover:text-primary/80 link-underline">View all</Link>
          </div>
          <div className="divide-y divide-border flex-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {tenders.map((t: any) => (
              <Link key={t._id} href={`/tenders/${t._id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors group">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>{t.type?.toUpperCase()} · {t.currency}</span>
                    {t.bidDeadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-primary" />
                        {new Date(t.bidDeadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <TenderStatusBadge status={t.status} />
              </Link>
            ))}
            {tenders.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <FileText size={40} className="mb-3 opacity-35 text-muted-foreground" />
                <p className="text-sm font-bold text-foreground">No tenders yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  {isCompany
                    ? "Publish your first RFQ — import the BOQ from PDF or Excel and the health score checks it before it goes live."
                    : "New packages matched to your supplier groups will appear here."}
                </p>
                {isCompany && (
                  <Link href="/tenders/new" className="mt-4">
                    <Button size="sm" className="rounded-xl text-xs font-bold">
                      <Plus size={14} /> Create Tender
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 bg-muted/30 border-b border-border">
            <h2 className="text-base font-bold font-[family-name:var(--font-heading)] text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Recent Notifications
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground">{unreadNotifsCount} unread</span>
              <Link href="/notifications" className="text-sm font-semibold text-primary hover:text-primary/80 link-underline">View all</Link>
            </div>
          </div>
          <div className="divide-y divide-border flex-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <Bell size={40} className="mb-3 opacity-35 text-muted-foreground" />
                <p className="text-sm font-bold text-foreground">All caught up</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Bid updates, award decisions, and clarification threads will land here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
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
