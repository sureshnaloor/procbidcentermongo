"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  ChevronRight,
  FileText,
  Package,
  Zap,
  ArrowRight,
  Building2,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Clock,
  DollarSign,
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
  Shield,
  Check,
  LayoutDashboard,
  LogOut,
  ExternalLink,
  // ── new showcase icons ──
  ScanLine,
  GitCompare,
  GitCompareArrows,
  RotateCcwClock,
  Fingerprint,
  HeartPulse,
  Gauge,
  Workflow,
  ClipboardCheck,
  ScrollText,
  Stamp,
  BadgeDollarSign,
  Warehouse,
  ThumbsUp,
  ArrowLeftRight,
  CalendarClock,
  Percent,
  CreditCard,
  Timer,
  Ruler,
  CircleAlert,
  UserCheck,
  Radar,
  Upload,
  Eye,
  Award,
  Activity,
  Cpu,
  Table2,
  Target,
  Database,
  Lock,
  TableProperties,
  FileWarning,
  Network,
  Gavel,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  dark = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  dark?: boolean;
}) {
  return (
    <Reveal className={align === "center" ? "text-center max-w-3xl mx-auto mb-16" : "mb-10"}>
      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_12px_rgba(193,80,46,0.15)]">
        <Sparkles size={13} />
        {eyebrow}
      </span>
      <h2
        className={`text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight ${
          dark ? "text-white" : "text-foreground"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`text-base md:text-lg leading-relaxed ${dark ? "text-white/70" : "text-muted-foreground"}`}>
          {description}
        </p>
      )}
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
      description: isCompany
        ? "Draft scopes, import BOQs from PDF or Excel, and publish RFQs with a health score"
        : "Explore live packages, BOQs, drawings, and submission deadlines",
      icon: FileText,
      href: "/tenders",
      badge: isCompany ? `${userTendersData?.total ?? 0} packages` : `${tendersData?.total ?? 0} live`,
    },
    {
      title: "Bid Proposals",
      description: isCompany
        ? "Every offer centrally recorded, time-stamped, and ready for structured review"
        : "Prepare structured proposals, attach certificates, and track evaluation status",
      icon: Package,
      href: "/bids",
      badge: `${bids.length} active`,
    },
    ...(isCompany
      ? [
          {
            title: "Bid Leveling & Comparisons",
            description:
              "Apple-to-apple comparison statements — deviations, units, currency, taxes, freight, and terms normalized",
            icon: Scale,
            href: "/comparisons",
            badge: "Leveling Engine",
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
      description: isCompany
        ? "Suppliers auto-classified into relevant groups — matching suggested, invites approved by you"
        : "Explore registered project owners and procurement directors",
      icon: isCompany ? Users : Building2,
      href: isCompany ? "/vendors" : "/companies",
      badge: "Verified Network",
    },
  ];

  // Workflow strip — visual orientation of where each module fits
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
                <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center gap-1.5 border border-border">
                  <Calendar size={12} className="text-primary" /> {todayLabel}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground font-[family-name:var(--font-heading)]">
                Good {getGreeting()},{" "}
                <span className="text-gradient">{user?.displayName?.split(" ")[0] || user?.username || "Sure"}</span>
              </h1>

              <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
                {isCompany
                  ? "Your procurement command center — publish RFQs, level every bid apple-to-apple, and award with a complete compliance trail."
                  : isVendor
                  ? "Your opportunity radar — get auto-matched to relevant packages, submit structured offers, and track every evaluation."
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
                  <Scale size={16} className="text-primary" /> Bid Leveling
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 stagger-children">
            {kpis.map((kpi, i) => (
              <Link key={i} href={kpi.href}>
                <div
                  className={`group bg-card border rounded-2xl p-5 card-3d card-sheen transition-all duration-300 relative overflow-hidden ${
                    (kpi as any).isSpecial
                      ? "badge-celebrate border-amber-500/40"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color} group-hover:scale-110 transition-transform duration-300`}>
                      <kpi.icon size={20} />
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-[family-name:var(--font-heading)]">
                    {kpi.value}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mt-1">{kpi.label}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* ─── Procurement Workflow Strip ─── */}
          <div className="mt-8 bg-card/70 backdrop-blur-sm border border-border rounded-2xl px-5 py-4 overflow-x-auto">
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
                Centralized recording, leveling, and compliance — built into every workflow
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data: tendersData } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", "public_published"],
    queryFn: () => fetch("/api/tenders?status=published&limit=6").then((r) => r.json()),
  });

  // ── Content model ──
  const centralPillars = [
    {
      icon: Database,
      title: "Centrally Recorded",
      description:
        "Every offer, revision, clarification, and addendum lands in one immutable bid registry — no more scattered inboxes and spreadsheet versions.",
    },
    {
      icon: Eye,
      title: "Reviewed & Levelled",
      description:
        "Structured technical and commercial review workflows with automated leveling, so evaluators look at decisions — not data entry.",
    },
    {
      icon: GitCompareArrows,
      title: "Apple-to-Apple",
      description:
        "Deviations, units, currencies, taxes, freight, and terms are normalized before comparison. You compare real evaluated cost — never headline price.",
    },
    {
      icon: Lock,
      title: "Complete Compliance",
      description:
        "Approval boards, segregation of duties, and a tamper-evident audit trail on every action keep procurement governance airtight.",
    },
  ];

  const boqPoints = [
    { icon: FileText, label: "PDF BOQs", text: "Upload scanned or digital PDF bills of quantities — line items, units, and quantities extracted into structured rows." },
    { icon: FileSpreadsheet, label: "Excel BOQs", text: "Drop in existing pricing templates and workbooks; columns are mapped to a standardized BOQ schema automatically." },
    { icon: ScanLine, label: "From Drawings — Coming Soon", text: "Auto-extraction of quantities directly from engineering drawings and isometrics is on the near-term roadmap." },
  ];

  const levelingChecks = [
    { icon: CircleAlert, title: "Missed / Not-Quoted Items", description: "Line items a bidder skipped are clearly identified and priced into the evaluation — no hidden gaps." },
    { icon: FileWarning, title: "Specification Deviations", description: "Every departure from the specified grade, standard, or brand is pointed out for technical adjudication." },
    { icon: Ruler, title: "Unit Differences", description: "Quotes in mismatched units (m vs ft, kg vs ton, lot vs each) are converted to the bid's base unit." },
    { icon: ArrowLeftRight, title: "Currency Normalization", description: "Offers quoted in a different currency than the bid are converted at a declared FX basis for true comparison." },
    { icon: Percent, title: "Taxes & Duties", description: "VAT, customs, and withholding treatments are equalized so tax-inclusive and exclusive offers compare fairly." },
    { icon: Truck, title: "Freight & Logistics", description: "Ex-works, FOB, and DDP offers are levelled to a common delivery point with logistics cost loaded in." },
    { icon: CreditCard, title: "Payment Terms", description: "Advance, milestone, and retention terms are translated into financing impact on the evaluated price." },
    { icon: CalendarClock, title: "Delivery Lead Times", description: "Schedule differences are surfaced alongside price so the fastest compliant option is always visible." },
  ];

  const pipelineSteps = [
    { icon: ClipboardCheck, title: "Technical Evaluation", description: "Compliance matrices and deviation logs per bidder, adjudicated item by item." },
    { icon: TableProperties, title: "Commercial Evaluation / CS", description: "Auto-generated comparison statements across every BOQ line, total, and term." },
    { icon: SlidersHorizontal, title: "Normalization", description: "Leveling adjustments for units, currency, taxes, freight, and terms land at a true evaluated price." },
    { icon: GitCompare, title: "Award Scenarios", description: "Model single-award vs split-package outcomes and what-if savings before committing." },
    { icon: Stamp, title: "Approval Board", description: "Recommendations routed through configurable sign-off chains with full audit capture." },
    { icon: ScrollText, title: "PO & Contract Drafting", description: "Winning bid data pre-populates purchase orders and contract drafts — ready to issue." },
  ];

  const scorecardSignals = [
    { icon: RotateCcwClock, title: "Previous Supplies", description: "Complete supply history with quantities, values, and delivery performance on past POs." },
    { icon: ThumbsUp, title: "Client Approvals", description: "Approval lists and registrations with major EPC clients and operators." },
    { icon: BadgeDollarSign, title: "Lowest Historical Pricing", description: "Benchmarks against the supplier's own historical lows for the same item family." },
    { icon: Warehouse, title: "Local Stock", description: "Stockholding and local availability signals for schedule-critical packages." },
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

  const features = [
    {
      icon: Database,
      title: "Central Bid Registry",
      description: "Every offer recorded, time-stamped, and versioned — a single source of truth for all commercial events.",
    },
    {
      icon: FileSpreadsheet,
      title: "BOQ Import from PDF & Excel",
      description: "Structured BOQs in minutes, with drawing-based quantity extraction coming soon.",
    },
    {
      icon: Network,
      title: "Supplier Classification & Auto-Match",
      description: "Suppliers grouped by material and service classes; scopes auto-matched to the right vendors.",
    },
    {
      icon: Scale,
      title: "Bid Leveling Engine",
      description: "Missed items, deviations, units, currency, taxes, freight, and terms normalized apple-to-apple.",
    },
    {
      icon: TableProperties,
      title: "Comparison Statements",
      description: "Technical and commercial CS generated automatically for transparent, defensible awards.",
    },
    {
      icon: Stamp,
      title: "Approval Board & Awards",
      description: "Configurable approval chains, award scenarios, and PO/contract drafting support.",
    },
    {
      icon: Fingerprint,
      title: "Supplier Behaviour Analytics",
      description: "Response, revision, and delivery fingerprints captured on every interaction.",
    },
    {
      icon: ShieldCheck,
      title: "Prequalification & Verification",
      description: "Verify licenses, ISO credentials, safety records, and financial standing prior to bid invitation.",
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
      title: "Publish RFQ with Health Score",
      description: "Owners import BOQs from PDF or Excel, attach drawings and specs, and get an RFQ health score before going live.",
      forUser: "EPC Owner",
    },
    {
      number: "02",
      title: "Auto-Match Suppliers",
      description: "The platform classifies suppliers into relevant groups and suggests the strongest invite list — invites go out only after your approval.",
      forUser: "ProSource System",
    },
    {
      number: "03",
      title: "Submit Structured Proposals",
      description: "Invited suppliers submit itemized pricing, technical compliance sheets, and qualification attachments against the same BOQ.",
      forUser: "Qualified Suppliers",
    },
    {
      number: "04",
      title: "Central Recording & Leveling",
      description: "Every bid is centrally recorded and levelled — missed items, deviations, units, currency, taxes, freight, and terms normalized.",
      forUser: "ProSource System",
    },
    {
      number: "05",
      title: "Evaluate & Model Awards",
      description: "Technical evaluation, commercial CS, normalization, and award scenarios give the board a defensible recommendation.",
      forUser: "EPC Owner",
    },
    {
      number: "06",
      title: "Approve, Award & Draft PO",
      description: "Approval board sign-off, transparent award notifications, and PO/contract drafting support close the loop with a full audit trail.",
      forUser: "EPC Owner",
    },
  ];

  const ownerBenefits = [
    { icon: Clock, title: "60% Faster Procurement Cycle", description: "Eliminate spreadsheet friction and manual email follow-ups with automated tendering and leveling." },
    { icon: SearchCheck, title: "Vetted Contractor Network", description: "Instant access to verified EPC vendors across GCC, Middle East, and global markets." },
    { icon: GitCompareArrows, title: "True Apple-to-Apple Awards", description: "Levelled evaluated pricing means the best compliant offer wins — provable in any audit." },
    { icon: DollarSign, title: "15-20% Average Cost Savings", description: "Drive competitive market pricing through transparent and structured bidding rounds." },
  ];

  const vendorBenefits = [
    { icon: Users, title: "Direct EPC Owner Access", description: "Connect with Tier-1 EPC contractors and project developers actively sourcing your packages." },
    { icon: LineChart, title: "Live Tender Market Radar", description: "Gain visibility into high-value procurement opportunities before formal market closing." },
    { icon: ShieldCheck, title: "Fair, Level Playing Field", description: "Structured submissions mean your compliant offer is compared on merit — never lost in formatting." },
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

          <nav className="hidden md:flex items-center gap-7">
            <a href="#why-central" className={navLinkClass}>Why ProSource</a>
            <a href="#boq" className={navLinkClass}>BOQ</a>
            <a href="#leveling" className={navLinkClass}>Bid Leveling</a>
            <a href="#suppliers" className={navLinkClass}>Suppliers</a>
            <a href="#how-it-works" className={navLinkClass}>Process</a>
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
              <a href="#why-central" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                Why ProSource
              </a>
              <a href="#boq" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                BOQ Import
              </a>
              <a href="#leveling" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                Bid Leveling
              </a>
              <a href="#suppliers" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                Supplier Intelligence
              </a>
              <a href="#how-it-works" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>
                How It Works
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
                  <Scale size={14} /> Centralized · Levelled · Compliant Procurement
                </div>
              </Reveal>

              <Reveal delay={90}>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[58px] font-extrabold text-foreground leading-[1.06] tracking-tight font-[family-name:var(--font-heading)]">
                  Every bid centrally recorded.{" "}
                  <span className="text-gradient">Levelled apple-to-apple.</span>{" "}
                  Awarded with confidence.
                </h1>
              </Reveal>

              <Reveal delay={180}>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
                  ProSource records every offer in one registry, normalizes deviations, units, currencies, taxes,
                  freight, and terms, and routes awards through an auditable approval board — for{" "}
                  <span className="text-foreground font-semibold">power</span>,{" "}
                  <span className="text-foreground font-semibold">infrastructure</span>,{" "}
                  <span className="text-foreground font-semibold">petrochemicals</span>, and{" "}
                  <span className="text-foreground font-semibold">oil &amp; gas</span>.
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
                    <CheckCircle2 size={16} className="text-primary" /> Central bid registry
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> Automated bid leveling
                  </span>
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-primary" /> Approval-board compliance
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

            {/* Right Interactive Showcase — mini leveling preview */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0">
              <Reveal delay={200}>
                <TiltCard>
                  <div className="relative rounded-3xl overflow-hidden border border-border bg-card card-3d shadow-[0_24px_64px_-16px_rgba(26,21,18,0.28)] dark:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.7)]">
                    {/* Window chrome */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                      </div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <GitCompareArrows size={12} className="text-primary" /> Bid Leveling · Live
                      </span>
                    </div>

                    <div className="p-5 space-y-3">
                      {[
                        { name: "Gulf Steel Industries", tag: "Levelled L1", tagClass: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", price: "SAR 1,398,500", flag: "Compliant", flagIcon: CheckCircle2, flagClass: "text-emerald-500" },
                        { name: "Aramco Allied Metals", tag: "+2.1% after leveling", tagClass: "bg-amber-500/12 text-amber-600 dark:text-amber-400", price: "SAR 1,427,900", flag: "Spec deviation noted", flagIcon: CircleAlert, flagClass: "text-amber-500" },
                        { name: "Red Sea Piping Co.", tag: "+5.8% after leveling", tagClass: "bg-blue-500/12 text-blue-600 dark:text-blue-400", price: "SAR 1,479,600", flag: "Quoted in EUR · normalized", flagIcon: ArrowLeftRight, flagClass: "text-blue-500" },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-background border border-border">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground truncate">{row.name}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <row.flagIcon size={12} className={row.flagClass} />
                              <span className="text-[11px] text-muted-foreground font-medium">{row.flag}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-extrabold font-mono text-foreground">{row.price}</div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${row.tagClass}`}>
                              {row.tag}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-primary/[0.07] border border-primary/20">
                        <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <Scale size={12} /> Apple-to-apple evaluated price
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">Units · FX · Taxes · Freight · Terms</span>
                      </div>
                    </div>
                  </div>
                </TiltCard>

                {/* Floating Metric Badges */}
                <div className="absolute -top-4 -right-3 glass rounded-2xl px-4 py-3 shadow-xl hidden sm:flex items-center gap-3 animate-chip-bob border border-border">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Lock size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-foreground leading-none">100%</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">Auditable trail</div>
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

      {/* ─── Why Centralized Procurement ─── */}
      <section id="why-central" className="py-24 bg-muted/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="The Central Procurement Advantage"
            title="Why teams move bidding out of inboxes and into ProSource"
            description="When bids live in email threads and spreadsheets, comparisons are manual, deviations hide in attachments, and audits are painful. ProSource centralizes the entire cycle — so every decision is recorded, reviewed, levelled, and compliant."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {centralPillars.map((pillar, i) => (
              <Reveal key={pillar.title} delay={i * 90}>
                <div className="group relative bg-card border border-border rounded-2xl p-6 card-3d card-sheen hover:border-primary/40 h-full">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                    <pillar.icon size={24} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{pillar.description}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="mt-10 bg-card border border-border rounded-2xl p-6 md:p-8 card-3d">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#a03d20] text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/25 ring-top">
                  <ShieldCheck size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">The outcome: decisions you can defend</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Central recording means nothing is lost; structured review means nothing is missed; leveling means
                    nothing is distorted; and the compliance layer means every award can be reconstructed, justified,
                    and audited — months or years later.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/register?type=company")}
                  className="rounded-xl px-6 text-sm font-bold shrink-0 shadow-md shadow-primary/20"
                >
                  Start Centralizing <ArrowRight size={15} className="ml-1.5" />
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── BOQ Intelligence ─── */}
      <section id="boq" className="py-24 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Copy */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                  <FileSpreadsheet size={13} /> BOQ Intelligence
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-5 leading-tight">
                  From BOQ document to biddable package in minutes
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
                  Stop rebuilding bills of quantities by hand. ProSource ingests the BOQ formats your engineering
                  teams already produce and turns them into a structured, priced, supplier-ready package.
                </p>
              </Reveal>

              <div className="space-y-4">
                {boqPoints.map((point, i) => (
                  <Reveal key={point.label} delay={i * 90}>
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-background border border-border card-3d">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <point.icon size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                          {point.label}
                          {point.label.includes("Coming Soon") && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
                              Roadmap
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{point.text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Visual — file → structured BOQ */}
            <Reveal delay={150}>
              <div className="relative">
                <div className="bg-background border border-border rounded-3xl p-6 card-3d shadow-xl">
                  {/* File chips */}
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-500/[0.08] border border-red-500/25 text-xs font-bold text-foreground">
                      <FileText size={14} className="text-red-500" /> BOQ_Rev3.pdf
                    </span>
                    <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/25 text-xs font-bold text-foreground">
                      <FileSpreadsheet size={14} className="text-emerald-500" /> pricing_template.xlsx
                    </span>
                    <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted border border-dashed border-border text-xs font-bold text-muted-foreground">
                      <ScanLine size={14} className="text-amber-500" /> drawings.dwg
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/12 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold uppercase">Soon</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-primary uppercase tracking-widest mb-5">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/40" />
                    <Cpu size={14} /> Parsed &amp; standardized
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/40" />
                  </div>

                  {/* Mini BOQ table */}
                  <div className="rounded-xl border border-border overflow-hidden">
                    <div className="grid grid-cols-[64px_1fr_56px_56px] gap-2 px-4 py-2.5 bg-muted/60 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      <span>Code</span><span>Description</span><span className="text-right">Qty</span><span className="text-right">Unit</span>
                    </div>
                    {[
                      ["M-1042", 'CS Pipe 6" SCH40, API 5L Gr.X52', "1,200", "m"],
                      ["M-1043", "Gate Valve 6\" CL600, RF", "24", "no"],
                      ["E-2081", "XLPE Cable 3C x 185 mm², 33kV", "3,400", "m"],
                      ["S-0917", "Structural Steel S355JR, beams", "86", "ton"],
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-[64px_1fr_56px_56px] gap-2 px-4 py-2.5 border-t border-border text-xs">
                        <span className="font-mono font-bold text-primary">{row[0]}</span>
                        <span className="text-foreground font-medium truncate">{row[1]}</span>
                        <span className="text-right font-mono text-muted-foreground">{row[2]}</span>
                        <span className="text-right font-mono text-muted-foreground">{row[3]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-500" /> 4 of 212 rows previewed
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                      <Gauge size={11} /> RFQ health score ready
                    </span>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -bottom-5 -left-4 glass rounded-2xl px-4 py-3 shadow-xl hidden sm:flex items-center gap-3 animate-chip-bob border border-border">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    <Timer size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-foreground leading-none">~10 min</div>
                    <div className="text-[11px] text-muted-foreground font-medium mt-0.5">BOQ to live RFQ</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Supplier Intelligence & Auto-Matching ─── */}
      <section id="suppliers" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Visual — auto-match with human approval gate */}
            <Reveal className="order-2 lg:order-1">
              <div className="bg-card border border-border rounded-3xl p-6 card-3d shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Radar size={12} className="text-primary" /> Scope · CS Piping Package — 1,200 m
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/12 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase tracking-wider">
                    Auto-matched
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "Gulf Steel Industries", group: "Piping & Fittings · Group A", match: 96 },
                    { name: "Aramco Allied Metals", group: "Piping & Fittings · Group A", match: 91 },
                    { name: "Red Sea Piping Co.", group: "Piping · Stockist · Group B", match: 84 },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-background border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0">
                          {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-foreground truncate">{s.name}</div>
                          <div className="text-[11px] text-muted-foreground font-medium truncate">{s.group}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-foreground">{s.match}%</div>
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500" style={{ width: `${s.match}%` }} />
                          </div>
                        </div>
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#c1502e]" aria-label={`Approve invite for ${s.name}`} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Human approval gate */}
                <div className="mt-5 p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/30 flex items-start gap-3">
                  <UserCheck size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-foreground">Human approval required</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                      Suggestions are only suggestions — invites are sent <span className="font-semibold text-foreground">only after your team approves</span> the list. Full control, zero spam to the market.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Copy */}
            <div className="order-1 lg:order-2">
              <Reveal>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                  <Network size={13} /> Supplier Intelligence
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight mb-5 leading-tight">
                  The right suppliers, suggested — never auto-invited
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
                  Suppliers are classified into relevant material and service groups. When you publish a scope,
                  ProSource auto-matches and auto-suggests the strongest invite list — but nothing reaches the market
                  until a human says so.
                </p>
              </Reveal>

              <div className="space-y-4">
                {[
                  { icon: Layers, title: "Classified into Relevant Groups", text: "Vendors are organized by material classes, service codes, and capability tiers — piping, electrical, civil, rotating equipment, and more." },
                  { icon: Target, title: "Auto-Match & Auto-Suggest", text: "Scope requirements are matched against supplier classifications, certifications, and track record to propose a ranked invite list." },
                  { icon: UserCheck, title: "Human-Approved Invites", text: "Your procurement team reviews, trims, or extends the list — invitations are dispatched only after explicit approval." },
                  { icon: Gauge, title: "RFQ Health Score Before Publish", text: "Completeness of BOQ, specs, terms, and attachments is scored so weak packages never go out and weak bids never come back." },
                ].map((point, i) => (
                  <Reveal key={point.title} delay={i * 90}>
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-card border border-border card-3d">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <point.icon size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-1">{point.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{point.text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bid Leveling — flagship dark section ─── */}
      <section id="leveling" className="relative py-24 bg-[#100e0c] noise overflow-hidden">
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(193,80,46,0.35) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(217,119,6,0.25) 0%, transparent 45%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            dark
            eyebrow="Bid Leveling Engine"
            title="Apple-to-apple, down to the last line item"
            description="Headline prices lie. ProSource levels every offer — surfacing missed items, flagging deviations, and normalizing units, currency, taxes, freight, payment terms, and lead times — so the comparison statement reflects the true evaluated cost."
          />

          {/* Mock leveling table */}
          <Reveal>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-sm overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-white/60 flex items-center gap-2">
                  <Table2 size={13} className="text-primary" /> Levelled Comparison · PKG-1042 CS Piping
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                  Auto-generated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-white/50 border-b border-white/10">
                      <th className="text-left font-extrabold px-6 py-3">Leveling Check</th>
                      <th className="text-left font-extrabold px-4 py-3">Gulf Steel Ind.</th>
                      <th className="text-left font-extrabold px-4 py-3">Aramco Allied</th>
                      <th className="text-left font-extrabold px-4 py-3">Red Sea Piping</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/85">
                    {[
                      {
                        check: "BOQ coverage",
                        a: { text: "212 / 212 items", chip: "Complete", cls: "bg-emerald-500/15 text-emerald-400" },
                        b: { text: "212 / 212 items", chip: "Complete", cls: "bg-emerald-500/15 text-emerald-400" },
                        c: { text: "206 / 212 items", chip: "6 missed — priced in", cls: "bg-red-500/15 text-red-400" },
                      },
                      {
                        check: "Specification",
                        a: { text: "API 5L Gr.X52", chip: "Compliant", cls: "bg-emerald-500/15 text-emerald-400" },
                        b: { text: "API 5L Gr.B offered", chip: "Deviation flagged", cls: "bg-amber-500/15 text-amber-400" },
                        c: { text: "API 5L Gr.X52", chip: "Compliant", cls: "bg-emerald-500/15 text-emerald-400" },
                      },
                      {
                        check: "Units & currency",
                        a: { text: "m · SAR", chip: "As bid", cls: "bg-emerald-500/15 text-emerald-400" },
                        b: { text: "m · SAR", chip: "As bid", cls: "bg-emerald-500/15 text-emerald-400" },
                        c: { text: "ft · EUR", chip: "Normalized", cls: "bg-blue-500/15 text-blue-400" },
                      },
                      {
                        check: "Taxes & freight",
                        a: { text: "Excl. VAT · DDP site", chip: "Equalized", cls: "bg-blue-500/15 text-blue-400" },
                        b: { text: "Incl. VAT · FOB port", chip: "Equalized", cls: "bg-blue-500/15 text-blue-400" },
                        c: { text: "Excl. VAT · Ex-works", chip: "Equalized", cls: "bg-blue-500/15 text-blue-400" },
                      },
                      {
                        check: "Payment · delivery",
                        a: { text: "30 days · 8 wks", chip: "On terms", cls: "bg-emerald-500/15 text-emerald-400" },
                        b: { text: "60 days · 14 wks", chip: "Schedule risk", cls: "bg-amber-500/15 text-amber-400" },
                        c: { text: "45 days · 10 wks", chip: "Levelled", cls: "bg-blue-500/15 text-blue-400" },
                      },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="px-6 py-3.5 text-xs font-bold text-white/70">{row.check}</td>
                        {[row.a, row.b, row.c].map((cell, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="text-xs font-semibold">{cell.text}</div>
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${cell.cls}`}>
                              {cell.chip}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-white/[0.05]">
                      <td className="px-6 py-4 text-xs font-extrabold text-white uppercase tracking-wider">Evaluated price</td>
                      <td className="px-4 py-4">
                        <span className="font-mono font-extrabold text-emerald-400">SAR 1,398,500</span>
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold">L1</span>
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-white/80">SAR 1,427,900</td>
                      <td className="px-4 py-4 font-mono font-bold text-white/80">SAR 1,479,600</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          {/* Leveling checks grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            {levelingChecks.map((check, i) => (
              <Reveal key={check.title} delay={(i % 4) * 80}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.07] hover:border-primary/40 transition-all duration-300">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                    <check.icon size={19} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1.5">{check.title}</h3>
                  <p className="text-[11px] text-white/60 leading-relaxed">{check.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Evaluation → Award Pipeline ─── */}
      <section className="py-24 bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Evaluation to Award"
            title="A governed pipeline from first offer to signed PO"
            description="Six disciplined stages carry every package from receipt of bids to contract — with the audit trail captured automatically along the way."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pipelineSteps.map((step, i) => (
              <Reveal key={step.title} delay={(i % 3) * 90}>
                <div className="group relative bg-card border border-border rounded-2xl p-6 card-3d card-sheen hover:border-primary/40 h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                      <step.icon size={21} />
                    </div>
                    <span className="text-3xl font-extrabold text-muted-foreground/25 font-[family-name:var(--font-heading)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Supplier Analytics & Scorecards ─── */}
      <section className="py-24 bg-muted/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Supplier Analytics"
            title="Know your suppliers before you award"
            description="Behaviour fingerprints, scorecards, and market signals built from every interaction on the platform — so sourcing decisions lean on evidence, not anecdotes."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Behaviour fingerprint mock */}
            <Reveal>
              <div className="bg-card border border-border rounded-3xl p-7 card-3d h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Fingerprint size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Behaviour Fingerprint</h3>
                      <p className="text-[11px] text-muted-foreground">Gulf Steel Industries · captured automatically</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider">
                    Reliable
                  </span>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Invitation response rate", value: 94, note: "47 of 50 invites answered" },
                    { label: "On-time submission", value: 98, note: "1 late submission in 2 years" },
                    { label: "Quote competitiveness", value: 86, note: "Within 3% of L1 on average" },
                    { label: "Clarification discipline", value: 90, note: "Clear, documented deviations" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-foreground">{row.label}</span>
                        <span className="text-xs font-extrabold text-primary">{row.value}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700"
                          style={{ width: `${row.value}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{row.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Activity size={13} className="text-primary" />
                  Fingerprint updates on every bid, revision, clarification, and delivery.
                </div>
              </div>
            </Reveal>

            {/* Scorecard signals */}
            <Reveal delay={120}>
              <div className="bg-card border border-border rounded-3xl p-7 card-3d h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Award size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">Supplier Scorecard</h3>
                      <p className="text-[11px] text-muted-foreground">Evidence-based sourcing signals</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-foreground font-[family-name:var(--font-heading)]">A+</div>
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Grade</div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {scorecardSignals.map((signal) => (
                    <div key={signal.title} className="flex items-start gap-4 p-4 rounded-2xl bg-background border border-border">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <signal.icon size={19} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground mb-0.5">{signal.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* RFQ health score strip */}
          <Reveal delay={180}>
            <div className="mt-8 bg-card border border-border rounded-2xl p-6 md:p-7 card-3d flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
                    <circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
                    <circle
                      cx="32" cy="32" r="27" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 27}`}
                      strokeDashoffset={`${2 * Math.PI * 27 * (1 - 0.87)}`}
                      className="text-primary"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-foreground">87</span>
                </div>
                <div>
                  <div className="text-sm font-extrabold text-foreground">RFQ Health Score</div>
                  <div className="text-[11px] text-muted-foreground">Computed before publish</div>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                {[
                  { label: "BOQ completeness", ok: true },
                  { label: "Specs attached", ok: true },
                  { label: "Delivery terms defined", ok: true },
                  { label: "Evaluation criteria set", ok: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-xs font-semibold">
                    {item.ok ? (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <CircleAlert size={14} className="text-amber-500 shrink-0" />
                    )}
                    <span className={item.ok ? "text-foreground" : "text-amber-600 dark:text-amber-400"}>{item.label}</span>
                  </div>
                ))}
              </div>
              <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold uppercase tracking-wider">
                <HeartPulse size={12} /> Stronger RFQs → stronger bids
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Sectors We Serve (Interactive Grid) ─── */}
      <section id="sectors" className="py-24 bg-background">
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
      <section id="features" className="py-24 bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Platform Capabilities"
            title="Everything a modern procurement team needs, in one stack"
            description="From BOQ ingestion to signed PO — a complete, integrated toolkit for transparent and compliant EPC bidding."
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
            title="How ProSource runs your tendering cycle"
            description="A transparent six-step journey from BOQ import to audited contract award."
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
                    <p className="text-xs text-muted-foreground">Operators, Main EPC Contractors &amp; Sourcing Directors</p>
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
                    <p className="text-xs text-muted-foreground">Equipment Manufacturers, Subcontractors &amp; Service Vendors</p>
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
              <Zap size={12} /> Start In Minutes
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-5 tracking-tight font-[family-name:var(--font-heading)]">
              Ready for procurement you can defend in any audit?
            </h2>
            <p className="text-base sm:text-lg text-white/90 mb-10 leading-relaxed max-w-xl mx-auto">
              Join EPC operators and specialized contractors running centrally recorded, levelled, apple-to-apple
              bidding on ProSource.
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
                Centralized, levelled, and compliant procurement &amp; bidding for EPC companies, project developers, and specialized suppliers.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-5">Platform Modules</h4>
              <ul className="space-y-3 text-xs">
                <li><a href="#boq" className="text-muted-foreground hover:text-white transition-colors">BOQ Import (PDF &amp; Excel)</a></li>
                <li><a href="#leveling" className="text-muted-foreground hover:text-white transition-colors">Bid Leveling Engine</a></li>
                <li><a href="#suppliers" className="text-muted-foreground hover:text-white transition-colors">Supplier Auto-Matching</a></li>
                <li><a href="#features" className="text-muted-foreground hover:text-white transition-colors">Comparison Statements</a></li>
                <li><Link href="/documents" className="text-muted-foreground hover:text-white transition-colors">Document Vault</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-5">EPC Sectors</h4>
              <ul className="space-y-3 text-xs">
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Power &amp; Renewables</a></li>
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Infrastructure &amp; Civil</a></li>
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Petrochemicals</a></li>
                <li><a href="#sectors" className="text-muted-foreground hover:text-white transition-colors">Oil &amp; Gas Upstream</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-5">Account &amp; Access</h4>
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
