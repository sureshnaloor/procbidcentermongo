"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  Tag,
  ChevronRight,
  FileText,
  Package,
  Zap,
  ArrowRight,
  Brain,
  Building2,
  Coins,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Clock,
  DollarSign,
  FileCheck,
  LineChart,
  SearchCheck,
  Users,
  Menu,
  X,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  Landmark,
  Factory,
  Droplets,
  HardHat,
  Flame,
  Wrench,
  Settings2,
  BarChart3,
  FlaskConical,
  MapPin,
  Sparkles,
  Trophy,
  Plus,
  FolderOpen,
  MessageSquare,
  Bell,
  Scale,
  ArrowUpRight,
  Shield,
  Check,
  LayoutDashboard,
  LogOut,
  Sliders,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";

// ─── Scroll Reveal Helper ───
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── 3D Tilt Card (Subtle, pointer-driven) ───
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1100px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Ambient Glow Background ───
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-background noise pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-muted/50" />

      {/* Warm terracotta orb */}
      <div
        className="absolute -top-[12%] -left-[10%] w-[65vw] h-[65vw] max-w-[800px] max-h-[800px] rounded-full opacity-40 dark:opacity-25 animate-float"
        style={{
          background: "radial-gradient(circle, rgba(193,80,46,0.45) 0%, rgba(193,80,46,0) 68%)",
        }}
      />
      {/* High-tech sapphire orb */}
      <div
        className="absolute top-[10%] -right-[12%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full opacity-35 dark:opacity-20 animate-float-delayed"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0) 65%)",
        }}
      />
      {/* Deep amber glow */}
      <div
        className="absolute -bottom-[20%] left-[25%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full opacity-30 dark:opacity-15 animate-float"
        style={{
          background: "radial-gradient(circle, rgba(217,119,6,0.3) 0%, rgba(217,119,6,0) 65%)",
          animationDelay: "-3s",
        }}
      />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(26,21,18,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(26,21,18,0.12) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Soft radial vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, transparent 0%, rgba(0,0,0,0.04) 100%)",
        }}
      />
    </div>
  );
}

// ─── Section Header ───
function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <Reveal className={align === "center" ? "text-center max-w-3xl mx-auto mb-16" : "mb-10"}>
      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_12px_rgba(193,80,46,0.15)]">
        <Sparkles size={13} />
        {eyebrow}
      </span>
      <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-4 leading-tight">
        {title}
      </h2>
      {description && <p className="text-base md:text-lg text-muted-foreground leading-relaxed">{description}</p>}
    </Reveal>
  );
}

// ─── Tender Card Component ───
function TenderCard({
  tender,
  showSubmitBid,
}: {
  tender: {
    _id: string;
    title: string;
    description?: string;
    type: string;
    status: string;
    bidDeadline?: string;
    location?: string;
    currency?: string;
    budget?: number;
  };
  showSubmitBid: boolean;
}) {
  const router = useRouter();

  const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    published: { bg: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-400", label: "Bidding Open", dot: "bg-emerald-500" },
    closed: { bg: "bg-slate-500/12", text: "text-slate-600 dark:text-slate-400", label: "Closed", dot: "bg-slate-500" },
    awarded: { bg: "bg-amber-500/12", text: "text-amber-600 dark:text-amber-400", label: "Awarded", dot: "bg-amber-500" },
    draft: { bg: "bg-muted", text: "text-muted-foreground", label: "Draft", dot: "bg-muted-foreground" },
  };

  const status = statusConfig[tender.status] || statusConfig.draft;

  return (
    <div className="group bg-card border border-border rounded-2xl p-6 card-3d card-sheen hover:border-primary/40 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full font-bold uppercase tracking-wider">
            {tender.type}
          </span>
          <span className={`flex items-center gap-1.5 px-3 py-1 ${status.bg} ${status.text} text-xs rounded-full font-semibold`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        <h3 className="font-bold text-foreground text-lg leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {tender.title}
        </h3>

        {tender.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{tender.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-5">
          {tender.bidDeadline && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/70 border border-border">
              <Calendar size={13} className="text-primary" />
              Bid by: {new Date(tender.bidDeadline).toLocaleDateString()}
            </span>
          )}
          {tender.location && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/70 border border-border">
              <MapPin size={13} className="text-primary" />
              {tender.location}
            </span>
          )}
          {tender.currency && tender.budget && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary/70 border border-border font-mono font-semibold">
              <DollarSign size={13} className="text-primary" />
              {tender.currency} {Number(tender.budget).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
        <button
          onClick={() => router.push(`/tenders/${tender._id}`)}
          className="text-primary text-sm font-bold hover:underline flex items-center gap-1 transition-all group-hover:gap-1.5"
        >
          View package <ChevronRight size={14} />
        </button>
        {showSubmitBid && tender.status === "published" && (
          <Button
            onClick={() => router.push(`/bids/new/${tender._id}`)}
            size="sm"
            className="rounded-xl text-xs px-4 shadow-sm"
          >
            Submit Bid
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Time-aware greeting helper ───
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── MAIN HOME COMPONENT (DUAL-MODE CONTROLLER) ───
export default function Home() {
  const { data: session, status } = useSession();
  const [showPublicViewOverride, setShowPublicViewOverride] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#8f3a1e] flex items-center justify-center shadow-lg shadow-primary/25 animate-pulse">
            <span className="text-primary-foreground text-base font-bold">PS</span>
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">Loading ProSource...</p>
        </div>
      </div>
    );
  }

  // If user is logged in and has not chosen to preview the public marketing view:
  if (session && !showPublicViewOverride) {
    return <LoggedInHome onTogglePublicView={() => setShowPublicViewOverride(true)} />;
  }

  // Logged-out public view
  return (
    <LoggedOutHome
      isLoggedIn={!!session}
      onReturnToHub={() => setShowPublicViewOverride(false)}
    />
  );
}

// ═════════════════════════════════════════════════════════════════
// 🌟 1. LOGGED-IN EXECUTIVE COMMAND CENTER LANDING PAGE
// ═════════════════════════════════════════════════════════════════
function LoggedInHome({ onTogglePublicView }: { onTogglePublicView: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");

  const user = (session as any)?.user;

  // Data Queries
  const { data: profile } = useQuery<any>({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: tendersData } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", "published"],
    queryFn: () => fetch("/api/tenders?status=published&limit=6").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: userTendersData } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", "mine"],
    queryFn: () => fetch("/api/tenders?limit=5").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: bidsData } = useQuery<any[]>({
    queryKey: ["bids", "list"],
    queryFn: () => fetch("/api/bids").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: notifData } = useQuery<any[]>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications?limit=5").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["messages", "unread"],
    queryFn: () => fetch("/api/messages/unread").then((r) => r.json()),
    enabled: !!session,
    refetchInterval: 30000,
  });

  const userType = profile?.userType || user?.userType;
  const isCompany = userType === "company";
  const isVendor = userType === "vendor";
  const isAdmin = user?.role === "admin";

  const tenders = tendersData?.items || [];
  const bids = Array.isArray(bidsData) ? bidsData : [];
  const notifications = Array.isArray(notifData) ? notifData : [];
  const unreadCount = unreadData?.count ?? 0;
  const unreadNotifsCount = notifications.filter((n: any) => !n.isRead).length;

  // Won bids for supplier celebration
  const wonBids = bids.filter((b: any) =>
    b.tender?.status === "awarded" &&
    (b.tender?.awardedBidId ? String(b.tender.awardedBidId) === String(b._id) : b.status === "accepted")
  );

  const roleLabel = isAdmin
    ? "Super Admin"
    : isCompany
    ? "EPC Project Owner"
    : isVendor
    ? "Qualified EPC Supplier"
    : "Business Member";

  const filteredTenders = tenders.filter((t: any) => {
    const matchesSearch =
      !searchFilter ||
      t.title?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.type?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesSector =
      selectedSector === "all" ||
      t.type?.toLowerCase() === selectedSector.toLowerCase() ||
      t.sector?.toLowerCase() === selectedSector.toLowerCase();
    return matchesSearch && matchesSector;
  });

  const kpis = isCompany
    ? [
        { label: "Active Tenders", value: userTendersData?.total ?? 0, icon: FileText, href: "/tenders", color: "text-primary", bg: "bg-primary/10" },
        { label: "Bids Received", value: bids.length, icon: Package, href: "/bids", color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Unread Messages", value: unreadCount, icon: MessageSquare, href: "/messages", color: "text-amber-500", bg: "bg-amber-500/10" },
        { label: "Notifications", value: unreadNotifsCount, icon: Bell, href: "/notifications", color: "text-emerald-500", bg: "bg-emerald-500/10" },
      ]
    : isVendor
    ? [
        { label: "Open Packages", value: tendersData?.total ?? 0, icon: FileText, href: "/tenders", color: "text-primary", bg: "bg-primary/10" },
        { label: "My Bids", value: bids.length, icon: Package, href: "/bids", color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "Awards Won", value: wonBids.length, icon: Trophy, href: "/bids", color: "text-amber-500", bg: "bg-amber-500/10", isSpecial: wonBids.length > 0 },
        { label: "Unread Messages", value: unreadCount, icon: MessageSquare, href: "/messages", color: "text-purple-500", bg: "bg-purple-500/10" },
      ]
    : [
        { label: "All Tenders", value: userTendersData?.total ?? 0, icon: FileText, href: "/tenders", color: "text-primary", bg: "bg-primary/10" },
        { label: "All Bids", value: bids.length, icon: Package, href: "/bids", color: "text-blue-500", bg: "bg-blue-500/10" },
        { label: "System Masters", value: "Active", icon: Shield, href: "/admin/masters", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { label: "User Management", value: "Verified", icon: Users, href: "/admin", color: "text-purple-500", bg: "bg-purple-500/10" },
      ];

  const quickModules = [
    {
      title: "Tenders & Packages",
      description: isCompany ? "Draft, publish, and manage your procurement scopes" : "Explore live packages, BOQs, drawings, and deadlines",
      icon: FileText,
      href: "/tenders",
      badge: isCompany ? `${userTendersData?.total ?? 0} packages` : `${tendersData?.total ?? 0} live`,
    },
    {
      title: "Bid Proposals",
      description: isCompany ? "Review submitted technical & commercial proposals" : "Prepare proposals, attach certificates, and track status",
      icon: Package,
      href: "/bids",
      badge: `${bids.length} active`,
    },
    ...(isCompany
      ? [
          {
            title: "Bid Comparison Statements",
            description: "Automated side-by-side technical & commercial evaluation matrices",
            icon: Scale,
            href: "/comparisons",
            badge: "Intelligent Matrix",
          },
        ]
      : [
          {
            title: "Awards & Contracts",
            description: "Track winning bids, award notifications, and delivery timelines",
            icon: Trophy,
            href: "/bids",
            badge: wonBids.length > 0 ? `${wonBids.length} won` : "Live Status",
          },
        ]),
    {
      title: "Centralized Document Vault",
      description: "Drawings, datasheets, addendums, specifications, and audit files",
      icon: FolderOpen,
      href: "/documents",
      badge: "Secure Vault",
    },
    {
      title: "Clarifications & Messages",
      description: "Direct real-time clarification threads between owners and suppliers",
      icon: MessageSquare,
      href: "/messages",
      badge: unreadCount > 0 ? `${unreadCount} unread` : "Direct Hub",
    },
    {
      title: isCompany ? "Qualified Suppliers" : "EPC Companies Directory",
      description: isCompany ? "Find verified suppliers across power, infrastructure, and oil & gas" : "Explore registered project owners and procurement directors",
      icon: isCompany ? Users : Building2,
      href: isCompany ? "/vendors" : "/companies",
      badge: "Verified Network",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ─── Top Navigation Bar ─── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#8f3a1e] flex items-center justify-center shadow-lg shadow-primary/25 ring-top transition-transform duration-300 group-hover:scale-105">
                <span className="text-primary-foreground text-sm font-bold">PS</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)]">
                ProSource
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
              <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <Link href="/tenders" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <FileText size={16} /> Packages
              </Link>
              <Link href="/bids" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <Package size={16} /> Bids
              </Link>
              {isCompany && (
                <Link href="/comparisons" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <Scale size={16} /> Comparisons
                </Link>
              )}
              <Link href="/messages" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                <MessageSquare size={16} />
                Messages
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onTogglePublicView}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border bg-secondary/50 transition-colors"
              title="View the public marketing showcase"
            >
              <ExternalLink size={13} /> Public Site
            </button>

            <ThemeToggle />

            <Link
              href="/notifications"
              className="relative p-2 rounded-full hover:bg-accent text-muted-foreground transition-all duration-200 hover:text-foreground"
            >
              <Bell size={18} />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card animate-glow-pulse" />
              )}
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{user?.displayName?.[0] || user?.username?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <Button
                onClick={() => router.push("/dashboard")}
                size="sm"
                className="rounded-xl px-4 text-xs font-bold"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Executive Welcome Hub & Greeting ─── */}
      <section className="relative pt-10 pb-12 overflow-hidden border-b border-border bg-gradient-to-b from-card/60 via-background to-background">
        <HeroBackground />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} /> {roleLabel}
                </span>
                {profile?.isVerified !== false && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Verified Member
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-heading)]">
                Good {getGreeting()},{" "}
                <span className="text-gradient">{user?.displayName?.split(" ")[0] || user?.username || "Sure"}</span>
              </h1>

              <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
                {isCompany
                  ? "Welcome to your EPC procurement headquarters. Publish tenders, evaluate proposals, and run automated bid comparisons."
                  : isVendor
                  ? "Welcome to your supplier opportunity radar. Discover active tenders across power, infrastructure, and oil & gas."
                  : "Welcome to the ProSource Super Admin command portal. Manage system masters, compliance, and user directories."}
              </p>
            </div>

            {/* Quick Actions Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {isCompany && (
                <Button
                  onClick={() => router.push("/tenders/new")}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold shadow-md shadow-primary/20 flex items-center gap-2"
                >
                  <Plus size={16} /> New Tender RFP
                </Button>
              )}
              {isVendor && (
                <Button
                  onClick={() => router.push("/tenders")}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold shadow-md shadow-primary/20 flex items-center gap-2"
                >
                  <Search size={16} /> Browse Open Packages
                </Button>
              )}
              {isCompany && (
                <Button
                  onClick={() => router.push("/comparisons")}
                  variant="outline"
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold border-border hover:border-primary/40 flex items-center gap-2"
                >
                  <Scale size={16} className="text-primary" /> Bid Comparisons
                </Button>
              )}
              {isVendor && (
                <Button
                  onClick={() => router.push("/bids")}
                  variant="outline"
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold border-border hover:border-primary/40 flex items-center gap-2"
                >
                  <Package size={16} className="text-primary" /> My Bids
                </Button>
              )}
              <Button
                onClick={() => router.push("/dashboard")}
                variant="secondary"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
              >
                <LayoutDashboard size={16} /> Full Dashboard
              </Button>
            </div>
          </div>

          {/* ─── Live KPI Cards Radar ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {kpis.map((kpi, i) => (
              <Link key={i} href={kpi.href}>
                <div
                  className={`bg-card border rounded-2xl p-5 card-3d card-sheen transition-all duration-300 ${
                    (kpi as any).isSpecial
                      ? "badge-celebrate border-amber-500/40"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                      <kpi.icon size={20} />
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-[family-name:var(--font-heading)]">
                    {kpi.value}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mt-1">{kpi.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Supplier Celebration Banner (If Won Bids) ─── */}
      {isVendor && wonBids.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 w-full">
          <div className="badge-celebrate rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Trophy size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Congratulations! You have {wonBids.length} awarded contract{wonBids.length > 1 ? "s" : ""}.
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review your winning packages and coordinate kickoff specifications directly with project owners.
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/bids")}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-5 text-xs font-bold shrink-0"
            >
              View Winning Bids <ChevronRight size={14} />
            </Button>
          </div>
        </section>
      )}

      {/* ─── Quick-Access Platform Modules ─── */}
      <section className="py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                Procurement Platform Modules
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Fast access to specialized procurement workflows and management hubs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {quickModules.map((mod, i) => (
              <Link key={i} href={mod.href}>
                <div className="group bg-card border border-border rounded-2xl p-6 card-3d card-sheen hover:border-primary/40 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                        <mod.icon size={22} />
                      </div>
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {mod.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{mod.description}</p>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-primary mt-5 pt-3 border-t border-border group-hover:gap-1.5 transition-all">
                    Launch module <ChevronRight size={13} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Live Active Packages Stream (Tender Radar) ─── */}
      <section className="py-12 bg-muted/30 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                <Zap size={13} /> Live Tender Radar
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-[family-name:var(--font-heading)]">
                Active procurement opportunities
              </h2>
            </div>
            <Link
              href="/tenders"
              className="text-sm font-bold text-primary flex items-center gap-1 hover:underline w-fit"
            >
              Explore all packages <ChevronRight size={16} />
            </Link>
          </div>

          {/* Search & Filter bar inside Hub */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search active packages by title, scope, or type..."
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["all", "materials", "services", "turnkey", "equipment"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSector(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedSector === s
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tender Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenders.slice(0, 6).map((tender: any) => (
              <TenderCard key={tender._id} tender={tender} showSubmitBid={isVendor} />
            ))}
            {filteredTenders.length === 0 && (
              <div className="col-span-full text-center py-16 bg-card border border-dashed border-border rounded-2xl p-8">
                <FileText size={48} className="mx-auto mb-3 opacity-35 text-muted-foreground" />
                <h4 className="text-base font-bold text-foreground">No active packages found</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search query or explore all archived packages.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Logged-In Footer ─── */}
      <footer className="mt-auto bg-card border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-[#8f3a1e] flex items-center justify-center text-primary-foreground text-xs font-bold">
              PS
            </div>
            <span>&copy; {new Date().getFullYear()} ProSource Procurement & Bidding Platform.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/tenders" className="hover:text-primary transition-colors">Packages</Link>
            <Link href="/bids" className="hover:text-primary transition-colors">Bids</Link>
            <Link href="/documents" className="hover:text-primary transition-colors">Documents</Link>
            <Link href="/settings" className="hover:text-primary transition-colors">Settings</Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive hover:underline flex items-center gap-1 font-semibold"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// 🌟 2. LOGGED-OUT PUBLIC MARKETING SHOWCASE LANDING PAGE
// ═════════════════════════════════════════════════════════════════
function LoggedOutHome({
  isLoggedIn = false,
  onReturnToHub,
}: {
  isLoggedIn?: boolean;
  onReturnToHub?: () => void;
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSectorTab, setActiveSectorTab] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: tendersData } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", "public_published"],
    queryFn: () => fetch("/api/tenders?status=published&limit=6").then((r) => r.json()),
  });

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Classification",
      description: "Auto-categorize materials, equipment, and services across every EPC sector with precision metadata.",
    },
    {
      icon: FileSpreadsheet,
      title: "Automated Tendering",
      description: "Publish standardized tender packages, RFPs, RFQs, and multi-currency commercial templates.",
    },
    {
      icon: Layers,
      title: "Smart Vendor Matchmaking",
      description: "Connect procurement scopes directly with pre-qualified contractors filtered by capability and track record.",
    },
    {
      icon: SlidersHorizontal,
      title: "Side-by-Side Bid Matrix",
      description: "Generate instant technical and commercial comparison sheets for transparent, audited awards.",
    },
    {
      icon: Coins,
      title: "Cost & Budget Optimization",
      description: "Drive competitive pricing dynamics while maintaining complete audit trails across projects.",
    },
    {
      icon: ShieldCheck,
      title: "Prequalification & Verification",
      description: "Verify licenses, ISO credentials, safety records, and financial standing prior to bid invitation.",
    },
    {
      icon: Truck,
      title: "Centralized Document Control",
      description: "Secure storage for engineering drawings, specifications, technical addendums, and compliance logs.",
    },
    {
      icon: Building2,
      title: "Cross-Sector EPC Governance",
      description: "Single unified procurement architecture built for power generation, petrochemicals, civil, and oil & gas.",
    },
  ];

  const sectors = [
    {
      icon: Zap,
      title: "Power & Energy",
      subtitle: "Generation, T&D, Renewables",
      image: "/images/materials-electrical.jpg",
      description: "Thermal, solar PV, wind farms, high-voltage substations, and smart grid transmission packages.",
      specs: ["Substations & Switchgear", "Solar Arrays & Inverters", "Turbines & Generators", "T&D Lines"],
    },
    {
      icon: Landmark,
      title: "Infrastructure & Civil",
      subtitle: "Industrial, Urban & Water",
      image: "/images/services-civil.jpg",
      description: "Highways, deep foundations, marine berths, industrial facilities, and municipal water treatment plants.",
      specs: ["Deep Foundation Piling", "Structural Steel Framing", "Water Treatment Systems", "Earthworks"],
    },
    {
      icon: Factory,
      title: "Petrochemicals & Refining",
      subtitle: "Plants, Terminals & Chemicals",
      image: "/images/hero-refinery.jpg",
      description: "Catalytic crackers, cryogenic storage tanks, distillation towers, and specialty chemical synthesis units.",
      specs: ["Distillation Columns", "Storage Spheres & Tanks", "Flare Systems & Recovery", "Process Skids"],
    },
    {
      icon: Droplets,
      title: "Oil & Gas Upstream/Downstream",
      subtitle: "Exploration, Pipelines & Plants",
      image: "/images/materials-pipes.jpg",
      description: "Offshore platforms, gathering pipelines, compressor stations, gas processing plants, and shutdown maintenance.",
      specs: ["API 5L Line Pipe", "Pressure Vessels", "Wellhead Compressors", "Turnaround Services"],
    },
  ];

  const marqueeItems = [
    { icon: Zap, label: "Power & Energy" },
    { icon: Landmark, label: "Infrastructure & Civil" },
    { icon: Factory, label: "Petrochemicals" },
    { icon: Droplets, label: "Oil & Gas" },
    { icon: HardHat, label: "Civil & Structural" },
    { icon: Flame, label: "Welding & Fabrication" },
    { icon: Wrench, label: "Mechanical & Piping" },
    { icon: Settings2, label: "Instrumentation & Control" },
    { icon: FlaskConical, label: "Specialty Chemicals" },
    { icon: BarChart3, label: "Project Controls" },
    { icon: ShieldCheck, label: "HSE & Compliance" },
    { icon: Truck, label: "Heavy Logistics & Supply" },
  ];

  const steps = [
    {
      number: "01",
      title: "Publish Procurement Scope",
      description: "EPC project owners release packages with technical BOQs, engineering drawings, and submission milestones.",
      forUser: "EPC Owner",
    },
    {
      number: "02",
      title: "AI Auto-Classification",
      description: "ProSource automatically categorizes line items into standardized EPC material groups and service codes.",
      forUser: "ProSource System",
    },
    {
      number: "03",
      title: "Targeted Supplier Alerts",
      description: "Pre-qualified suppliers matching specific capabilities, certifications, and regions receive instant notifications.",
      forUser: "Qualified Suppliers",
    },
    {
      number: "04",
      title: "Submit Structured Proposals",
      description: "Suppliers submit itemized pricing, technical compliance sheets, and necessary qualification attachments.",
      forUser: "Qualified Suppliers",
    },
    {
      number: "05",
      title: "Automated Evaluation Matrix",
      description: "The platform generates side-by-side technical and commercial comparison sheets with deviations highlighted.",
      forUser: "ProSource System",
    },
    {
      number: "06",
      title: "Contract Award & Audit Log",
      description: "Transparent award finalization, supplier notifications, contract signing, and complete audit archive.",
      forUser: "EPC Owner",
    },
  ];

  const ownerBenefits = [
    { icon: Clock, title: "60% Faster Procurement Cycle", description: "Eliminate spreadsheet friction and manual email follow-ups with automated tendering." },
    { icon: SearchCheck, title: "Vetted Contractor Network", description: "Instant access to verified EPC vendors across GCC, Middle East, and global markets." },
    { icon: FileCheck, title: "Automated Comparison Matrices", description: "Instantly compare commercial line items and technical compliance sheets side-by-side." },
    { icon: DollarSign, title: "15-20% Average Cost Savings", description: "Drive competitive market pricing through transparent and structured bidding rounds." },
  ];

  const vendorBenefits = [
    { icon: Users, title: "Direct EPC Owner Access", description: "Connect with Tier-1 EPC contractors and project developers actively sourcing your packages." },
    { icon: LineChart, title: "Live Tender Market Radar", description: "Gain visibility into high-value procurement opportunities before formal market closing." },
    { icon: ShieldCheck, title: "Zero Lead-Acquisition Cost", description: "Standardized digital submissions reduce bidding overhead and proposal preparation time." },
    { icon: CheckCircle2, title: "Prompt Award Status", description: "Real-time visibility into bid evaluation stages, clarification threads, and contract decisions." },
  ];

  const stats = [
    { icon: Briefcase, value: "100+", label: "Active Project Packages" },
    { icon: Users, value: "500+", label: "Verified EPC Suppliers" },
    { icon: Building2, value: "50+", label: "Major EPC Operators" },
    { icon: TrendingUp, value: "$200M+", label: "Procurement Volume" },
  ];

  const navLinkClass = "link-underline text-sm font-semibold text-muted-foreground hover:text-primary transition-colors";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col">
      {/* ─── Navigation ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-all duration-300 ${
          scrolled ? "bg-background/85 backdrop-blur-xl border-border shadow-sm" : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#8f3a1e] flex items-center justify-center shadow-lg shadow-primary/25 ring-top transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <span className="text-primary-foreground text-sm font-bold">PS</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)]">
              ProSource
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className={navLinkClass}>Features</a>
            <a href="#sectors" className={navLinkClass}>Sectors</a>
            <a href="#how-it-works" className={navLinkClass}>Process</a>
            <a href="#benefits" className={navLinkClass}>Benefits</a>
            <Link href="/tenders" className={navLinkClass}>Live Packages</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                {onReturnToHub && (
                  <Button
                    onClick={onReturnToHub}
                    variant="outline"
                    className="rounded-xl px-4 text-xs font-bold border-primary/40 text-primary"
                  >
                    Return to Hub
                  </Button>
                )}
                <Button onClick={() => router.push("/dashboard")} className="rounded-xl px-5 text-sm font-bold">
                  Dashboard
                </Button>
              </div>
            ) : (
              <>
                <Link href="/login" className={navLinkClass}>Sign In</Link>
                <Button onClick={() => router.push("/register")} className="rounded-xl px-5 text-sm font-bold">
                  Get Started
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-full"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="md:hidden glass border-t border-border px-6 py-6 shadow-2xl">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                Features
              </a>
              <a href="#sectors" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                Sectors
              </a>
              <a href="#how-it-works" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                How It Works
              </a>
              <a href="#benefits" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                Benefits
              </a>
              <Link href="/tenders" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                Packages
              </Link>
              <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                {isLoggedIn ? (
                  <Button onClick={() => router.push("/dashboard")} className="w-full rounded-xl">
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Link href="/login" className="flex-1">
                      <Button variant="outline" className="w-full rounded-xl">Sign In</Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button className="w-full rounded-xl">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-[92vh] flex items-center pt-28 pb-20 overflow-hidden">
        <HeroBackground />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col space-y-8">
              <Reveal>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-bold uppercase tracking-wider w-fit text-primary shadow-sm border border-primary/20">
                  <Zap size={14} /> Next-Gen EPC Procurement & Bidding
                </div>
              </Reveal>

              <Reveal delay={90}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[62px] font-extrabold text-foreground leading-[1.06] tracking-tight font-[family-name:var(--font-heading)]">
                  Procurement & bidding{" "}
                  <span className="text-gradient">intelligence</span> for every major sector
                </h1>
              </Reveal>

              <Reveal delay={180}>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                  Connect Tier-1 EPC project owners and specialized contractors across{" "}
                  <span className="text-foreground font-semibold">power</span>,{" "}
                  <span className="text-foreground font-semibold">infrastructure</span>,{" "}
                  <span className="text-foreground font-semibold">petrochemicals</span>, and{" "}
                  <span className="text-foreground font-semibold">oil & gas</span>.
                </p>
              </Reveal>

              <Reveal delay={260}>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Button
                    onClick={() => router.push("/register?type=company")}
                    size="lg"
                    className="rounded-xl px-8 text-base font-bold shadow-lg shadow-primary/25"
                  >
                    Register as EPC Owner
                  </Button>
                  <Button
                    onClick={() => router.push("/register?type=vendor")}
                    size="lg"
                    variant="outline"
                    className="rounded-xl px-8 text-base font-bold border-primary/40 text-primary hover:bg-primary/5 hover:border-primary"
                  >
                    Register as Supplier
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={340}>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs md:text-sm text-muted-foreground font-medium pt-2">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> Verified Supplier Directory
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> Automated Bid Comparison
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> Zero Registration Fee
                  </span>
                </div>
              </Reveal>

              {/* Integrated Quick Search Bar */}
              <Reveal delay={400}>
                <div className="glass rounded-2xl p-2.5 shadow-xl border border-border/80 max-w-xl">
                  <div className="flex items-center gap-3 bg-background/80 rounded-xl px-4 py-2.5 border border-border">
                    <Search size={18} className="text-primary shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchQuery) {
                          router.push(`/tenders?search=${encodeURIComponent(searchQuery)}`);
                        }
                      }}
                      placeholder="Search packages, valves, piping, electrical, civil..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                    />
                    <button
                      onClick={() => searchQuery && router.push(`/tenders?search=${encodeURIComponent(searchQuery)}`)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-all"
                    >
                      Search
                    </button>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Right Interactive Showcase */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0">
              <Reveal delay={200}>
                <TiltCard>
                  <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-border shadow-[0_24px_64px_-16px_rgba(26,21,18,0.28)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)] group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/hero-refinery.jpg"
                      alt="EPC industrial facility"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-5 shadow-xl border border-white/20">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={12} /> AI-Assisted Matchmaking
                        </span>
                        <span className="text-[11px] font-bold text-white bg-black/40 px-2 py-0.5 rounded-full">
                          Live Portal
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white mb-1">Intelligent Package Evaluation</div>
                      <div className="text-xs text-white/80 leading-relaxed">
                        Matches project scopes with certified suppliers by capability and compliance.
                      </div>
                    </div>
                  </div>
                </TiltCard>

                {/* Floating Metric Badges */}
                <div className="absolute -top-4 -right-3 glass rounded-2xl px-4 py-3 shadow-xl hidden sm:flex items-center gap-3 animate-chip-bob border border-border">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-foreground leading-none">99.4%</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">On-time awards</div>
                  </div>
                </div>

                <div
                  className="absolute top-1/2 -left-6 glass rounded-2xl px-4 py-3 shadow-xl hidden sm:flex items-center gap-3 animate-chip-bob border border-border"
                  style={{ animationDelay: "-2.5s" }}
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-foreground leading-none">500+</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Verified suppliers</div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Infinite Marquee Strip ─── */}
      <section className="relative z-10 border-y border-border bg-card/60 backdrop-blur-sm py-4 overflow-hidden">
        <div className="[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max animate-marquee gap-4 pr-4">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border border-border text-xs md:text-sm font-semibold text-muted-foreground shadow-sm whitespace-nowrap hover:border-primary/40 transition-colors"
              >
                <item.icon size={15} className="text-primary" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Key Stats Banner ─── */}
      <section className="py-16 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="bg-card border border-border rounded-3xl card-3d p-8 md:p-10 shadow-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center group">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground text-primary transition-all duration-300">
                      <stat.icon size={22} />
                    </div>
                    <div className="text-3xl md:text-4xl font-extrabold text-foreground font-[family-name:var(--font-heading)]">
                      {stat.value}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground font-medium mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Sectors We Serve (Interactive Grid) ─── */}
      <section id="sectors" className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Specialized EPC Sectors"
            title="Engineered for high-spec industrial procurement"
            description="From renewable power plants to refineries, ProSource provides structured procurement pipelines across key engineering sectors."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sectors.map((sector, i) => (
              <Reveal key={sector.title} delay={i * 90}>
                <div className="group relative bg-card border border-border rounded-2xl overflow-hidden card-3d card-sheen hover:border-primary/40 h-full flex flex-col justify-between">
                  <div className="relative h-44 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sector.image}
                      alt={sector.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                        <sector.icon size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-primary-foreground bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {sector.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {sector.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{sector.description}</p>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-border/60">
                      {sector.specs.map((spec, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                          <Check size={12} className="text-primary shrink-0" />
                          <span className="truncate">{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform Features Matrix ─── */}
      <section id="features" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Platform Capabilities"
            title="Intelligent features built for modern EPC workflows"
            description="Eliminate procurement blindspots with automated tendering, vendor verification, and side-by-side bid comparison."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Reveal key={index} delay={(index % 4) * 80}>
                <div className="group relative bg-background border border-border rounded-2xl p-6 card-3d card-sheen hover:border-primary/40 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                      <feature.icon size={24} />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works (Process Roadmap) ─── */}
      <section id="how-it-works" className="py-24 bg-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Workflow Process"
            title="How ProSource streamlines your tendering cycle"
            description="A transparent 6-step journey from initial RFP publication to verified contractor award."
          />

          <div className="relative max-w-4xl mx-auto mt-16">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-primary via-primary/30 to-transparent hidden md:block" />

            <div className="space-y-16">
              {steps.map((step, index) => (
                <Reveal key={index} delay={80}>
                  <div className="relative">
                    <div
                      className={`md:absolute md:left-1/2 md:transform md:-translate-x-1/2 z-10 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mb-4 md:mb-0 transition-transform duration-300 hover:scale-110 ${
                        step.forUser === "EPC Owner"
                          ? "bg-gradient-to-br from-primary to-[#a03d20] text-primary-foreground shadow-primary/30 ring-top"
                          : step.forUser === "Qualified Suppliers"
                          ? "bg-foreground text-background"
                          : "bg-card text-primary border border-border card-3d"
                      }`}
                    >
                      {index < steps.length - 1 ? <ArrowRight size={18} /> : <CheckCircle2 size={18} />}
                    </div>

                    <div className="md:grid md:grid-cols-2 md:gap-12 items-center">
                      <div className={index % 2 === 0 ? "md:text-right md:pr-12" : "md:col-start-2 md:text-left md:pl-12"}>
                        <div className="text-xs font-extrabold text-primary mb-1 tracking-wider uppercase">Step {step.number}</div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">{step.description}</p>
                        <div className="mt-3">
                          <span
                            className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              step.forUser === "EPC Owner"
                                ? "bg-primary/10 text-primary"
                                : step.forUser === "Qualified Suppliers"
                                ? "bg-foreground/10 text-foreground"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {step.forUser}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dual-Audience Value Comparison ─── */}
      <section id="benefits" className="py-24 bg-gradient-to-b from-card to-background border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Value Proposition"
            title="Strategic advantages for both project owners & suppliers"
            description="ProSource aligns EPC operators and specialized contractors for competitive, accountable procurement."
          />

          <div className="grid md:grid-cols-2 gap-8">
            <Reveal>
              <div className="bg-card border border-border rounded-3xl p-8 card-3d h-full shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-[#a03d20] flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/25 ring-top">
                    O
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">For EPC Project Owners</h3>
                    <p className="text-xs text-muted-foreground">Operators, Main EPC Contractors & Sourcing Directors</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  {ownerBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-2xl bg-background border border-border card-3d">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <benefit.icon size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">{benefit.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="bg-card border border-border rounded-3xl p-8 card-3d h-full shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-foreground flex items-center justify-center text-background font-extrabold text-lg shadow-lg">
                    S
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">For Specialized Suppliers</h3>
                    <p className="text-xs text-muted-foreground">Equipment Manufacturers, Subcontractors & Service Vendors</p>
                  </div>
                </div>
                <div className="grid gap-4">
                  {vendorBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-2xl bg-background border border-border card-3d">
                      <div className="w-10 h-10 rounded-xl bg-foreground/10 flex items-center justify-center text-foreground shrink-0">
                        <benefit.icon size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">{benefit.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Active Packages Showcase ─── */}
      <section className="py-24 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
              <div>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
                  <Sparkles size={12} /> Live Marketplace Radar
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight font-[family-name:var(--font-heading)]">
                  Active procurement packages
                </h2>
              </div>
              <Link href="/tenders" className="link-underline text-sm font-bold text-primary flex items-center gap-1 w-fit">
                Explore all packages <ChevronRight size={16} />
              </Link>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tendersData?.items?.map((tender: any, i: number) => (
              <Reveal key={tender._id} delay={(i % 3) * 100}>
                <TenderCard tender={tender} showSubmitBid={false} />
              </Reveal>
            ))}
            {(!tendersData?.items || tendersData.items.length === 0) && (
              <div className="col-span-full text-center py-20 bg-background border border-dashed border-border rounded-3xl">
                <FileText size={56} className="mx-auto mb-4 opacity-40 text-muted-foreground" />
                <p className="text-xl font-bold text-foreground">No active packages currently listed</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Register as an EPC owner to publish the first package or register as a supplier to get notified.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── High-Conversion CTA Banner ─── */}
      <section className="relative py-24 overflow-hidden noise bg-gradient-to-br from-primary via-[#b04a28] to-[#8f3a1e]">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 0%, transparent 30%), radial-gradient(circle at 80% 50%, white 0%, transparent 30%)",
          }}
        />
        <div className="absolute inset-0 ring-top pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/15 text-white text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-sm">
              ⚡ Start In Minutes
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight font-[family-name:var(--font-heading)]">
              Ready to transform your EPC bidding?
            </h2>
            <p className="text-base sm:text-lg text-white/90 mb-10 leading-relaxed max-w-xl mx-auto">
              Join leading EPC operators and specialized contractors who use ProSource to run transparent, compliant procurement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                onClick={() => router.push("/register?type=company")}
                size="lg"
                className="bg-white text-primary hover:bg-white/95 rounded-xl px-8 text-base font-bold shadow-2xl w-full sm:w-auto"
              >
                Register as EPC Owner
              </Button>
              <Button
                onClick={() => router.push("/register?type=vendor")}
                size="lg"
                variant="outline"
                className="bg-transparent border-white/60 text-white hover:bg-white/10 hover:text-white rounded-xl px-8 text-base font-bold w-full sm:w-auto"
              >
                Register as Supplier
              </Button>
            </div>
            <p className="mt-8 text-xs text-white/75 font-medium">
              Enterprise-grade data encryption · Full audit compliance · Verified vendor network
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── Corporate Footer ─── */}
      <footer className="bg-[#100e0c] pt-20 pb-12 noise relative text-white">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[#8f3a1e] flex items-center justify-center shadow-lg shadow-primary/20 ring-top">
                  <span className="text-primary-foreground text-sm font-bold">PS</span>
                </div>
                <span className="text-xl font-bold text-white font-[family-name:var(--font-heading)]">ProSource</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-xs">
                Next-generation procurement and bidding platform for EPC companies, project developers, and specialized suppliers.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-5">Platform Modules</h4>
              <ul className="space-y-3 text-xs">
                <li><Link href="/tenders" className="text-muted-foreground hover:text-white transition-colors">Tender Packages</Link></li>
                <li><Link href="/vendors" className="text-muted-foreground hover:text-white transition-colors">Suppliers Directory</Link></li>
                <li><Link href="/bids" className="text-muted-foreground hover:text-white transition-colors">Bid Proposals</Link></li>
                <li><Link href="/documents" className="text-muted-foreground hover:text-white transition-colors">Document Vault</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-5">EPC Sectors</h4>
              <ul className="space-y-3 text-xs">
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Power & Renewables</a></li>
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Infrastructure & Civil</a></li>
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Petrochemicals</a></li>
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Oil & Gas Upstream</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-5">Account & Access</h4>
              <ul className="space-y-3 text-xs">
                <li><Link href="/login" className="text-muted-foreground hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/register?type=company" className="text-muted-foreground hover:text-white transition-colors">EPC Owner Registration</Link></li>
                <li><Link href="/register?type=vendor" className="text-muted-foreground hover:text-white transition-colors">Supplier Registration</Link></li>
                <li><Link href="/settings" className="text-muted-foreground hover:text-white transition-colors">Platform Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ProSource Procurement Portal. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/settings" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/settings" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/messages" className="hover:text-white transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
