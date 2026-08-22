"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Calendar,
  Tag,
  ChevronRight,
  FileText,
  Shield,
  HardHat,
  Zap,
  Wrench,
  BarChart3,
  Flame,
  FlaskConical,
  Settings2,
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
  Award,
  Landmark,
  Factory,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Animated Mesh Hero Background ───
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted" />

      {/* Warm copper orb */}
      <div
        className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full opacity-40 dark:opacity-25 animate-float"
        style={{
          background: "radial-gradient(circle, rgba(200,90,58,0.45) 0%, rgba(200,90,58,0) 65%)",
        }}
      />
      {/* Cool blue orb */}
      <div
        className="absolute top-[5%] -right-[10%] w-[55vw] h-[55vw] rounded-full opacity-30 dark:opacity-20 animate-float-delayed"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0) 65%)",
        }}
      />
      {/* Amber orb */}
      <div
        className="absolute -bottom-[15%] left-[15%] w-[50vw] h-[50vw] rounded-full opacity-30 dark:opacity-15 animate-float"
        style={{
          background: "radial-gradient(circle, rgba(234,179,8,0.35) 0%, rgba(234,179,8,0) 65%)",
          animationDelay: "-2s",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,17,17,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, transparent 0%, rgba(0,0,0,0.03) 100%)",
        }}
      />
    </div>
  );
}

// ─── Sector Badge ───
function SectorBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-semibold text-foreground shadow-sm">
      <Icon size={16} className="text-primary" />
      {label}
    </span>
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
  };
  showSubmitBid: boolean;
}) {
  const router = useRouter();

  const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    published: { bg: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-400", label: "Bidding Open", dot: "bg-emerald-500" },
    closed: { bg: "bg-slate-500/12", text: "text-slate-600 dark:text-slate-400", label: "Closed", dot: "bg-slate-500" },
    awarded: { bg: "bg-primary/12", text: "text-primary", label: "Awarded", dot: "bg-primary" },
    draft: { bg: "bg-muted", text: "text-muted-foreground", label: "Draft", dot: "bg-muted-foreground" },
  };

  const status = statusConfig[tender.status] || statusConfig.draft;

  return (
    <div className="group bg-card border border-border rounded-2xl p-6 card-3d hover:border-primary/30">
      <div className="flex items-center gap-2 mb-4">
        <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full font-bold uppercase tracking-wider">
          {tender.type}
        </span>
        <span className={`flex items-center gap-1.5 px-3 py-1 ${status.bg} ${status.text} text-xs rounded-full font-semibold`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>
      <h3 className="font-bold text-foreground text-lg leading-snug mb-2 line-clamp-2 font-[family-name:var(--font-heading)]">
        {tender.title}
      </h3>
      {tender.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{tender.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-5">
        {tender.bidDeadline && (
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />
            Bid by: {new Date(tender.bidDeadline).toLocaleDateString()}
          </span>
        )}
        {tender.location && (
          <span className="flex items-center gap-1.5">
            <Users size={14} />
            {tender.location}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Tag size={14} />
          {tender.type.toUpperCase()}
        </span>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={() => router.push(`/tenders/${tender._id}`)}
          className="text-primary text-sm font-bold hover:underline flex items-center gap-1 transition-all group-hover:gap-1.5"
        >
          View details <ChevronRight size={14} />
        </button>
        {showSubmitBid && tender.status === "published" && (
          <Button onClick={() => router.push(`/bids/new/${tender._id}`)} size="sm" className="rounded-xl text-xs px-4">
            Submit Bid
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Feature Card ───
function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative bg-card border border-border rounded-2xl p-6 card-3d hover:border-primary/30 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <div className="rounded-xl w-12 h-12 flex items-center justify-center bg-primary/10 text-primary mb-4 group-hover:scale-110 group-hover:shadow-[0_0_20px_-6px_rgba(200,90,58,0.4)] transition-all duration-300">
          <Icon size={24} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2 font-[family-name:var(--font-heading)]">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Benefit Card ───
function BenefitCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group flex items-start gap-4 p-5 rounded-2xl bg-card border border-border card-3d hover:border-primary/30">
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform duration-200">
        <Icon size={22} />
      </div>
      <div>
        <h4 className="text-base font-bold text-foreground mb-1 font-[family-name:var(--font-heading)]">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Main Home Page Component ───
export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const { data: tendersData } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", "published"],
    queryFn: () => fetch("/api/tenders?status=published&limit=6").then((r) => r.json()),
    enabled: true,
  });

  const { data: profile } = useQuery<any>({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  const isVendor = profile?.userType === "vendor";

  const features = [
    { icon: Brain, title: "AI-Powered Classification", description: "Auto-classify materials and services across every EPC sector with minimal input." },
    { icon: FileSpreadsheet, title: "Automated Tendering", description: "Create and publish tender packages, RFPs, and RFQs with structured templates." },
    { icon: Layers, title: "Smart Vendor Matching", description: "Match packages with qualified vendors by capability, location, and track record." },
    { icon: SlidersHorizontal, title: "Bid Comparison", description: "Side-by-side technical and commercial comparison sheets for transparent awards." },
    { icon: Coins, title: "Cost Optimization", description: "Drive competitive pricing and track budget performance across projects." },
    { icon: ShieldCheck, title: "Vendor Qualification", description: "Verify credentials, certifications, and qualifications before inviting bids." },
    { icon: Truck, title: "Document Control", description: "Centralize drawings, specs, addendums, and submissions with full audit trails." },
    { icon: Building2, title: "Multi-Sector Coverage", description: "One platform for power, infrastructure, petrochemicals, and oil & gas." },
  ];

  const sectors = [
    { icon: Zap, title: "Power & Energy", subtitle: "Generation, T&D, Renewables", description: "Thermal, solar, wind, and grid infrastructure packages." },
    { icon: Landmark, title: "Infrastructure", subtitle: "Civil, Industrial & Urban", description: "Roads, bridges, utilities, water treatment, and industrial facilities." },
    { icon: Factory, title: "Petrochemicals", subtitle: "Plants, Refineries & Chemicals", description: "Process units, storage terminals, and specialty chemical projects." },
    { icon: Droplets, title: "Oil & Gas", subtitle: "Upstream, Midstream & Downstream", description: "Exploration, pipelines, terminals, refining, and maintenance." },
  ];

  const steps = [
    { number: "01", title: "List Your Requirement", description: "EPC owners publish tender packages with scope, drawings, deadlines, and criteria.", forUser: "owner" },
    { number: "02", title: "AI Classification", description: "The platform auto-classifies requirements by sector, material group, and service category.", forUser: "system" },
    { number: "03", title: "Vendor Notification", description: "Qualified vendors are notified of packages matching their capabilities.", forUser: "vendor" },
    { number: "04", title: "Submit Bids", description: "Vendors upload technical and commercial proposals, certifications, and pricing.", forUser: "vendor" },
    { number: "05", title: "AI Comparison", description: "System-generated comparison sheets help evaluators score bids consistently.", forUser: "system" },
    { number: "06", title: "Award & Contract", description: "Owners select the best bid, award the package, and track performance.", forUser: "owner" },
  ];

  const ownerBenefits = [
    { icon: Clock, title: "Time Efficiency", description: "Reduce procurement cycle time by up to 60% with automated tendering." },
    { icon: SearchCheck, title: "Quality Vendors", description: "Access a pre-qualified network of EPC suppliers across every sector." },
    { icon: FileCheck, title: "Smart Comparisons", description: "Automatically generated comparison sheets for informed awards." },
    { icon: DollarSign, title: "Cost Savings", description: "Achieve 15-20% average savings through competitive bidding." },
  ];

  const vendorBenefits = [
    { icon: Users, title: "Expanded Reach", description: "Connect with EPC owners actively looking for your materials and services." },
    { icon: LineChart, title: "Market Insights", description: "Gain visibility into live tender opportunities and sector demand trends." },
    { icon: ShieldCheck, title: "Reduced Overhead", description: "Lower acquisition costs with standardized bid submissions and tracking." },
    { icon: CheckCircle2, title: "Faster Awards", description: "Track bid status in real time and receive prompt award notifications." },
  ];

  const stats = [
    { icon: Briefcase, value: "100+", label: "Active Packages" },
    { icon: Users, value: "500+", label: "Registered Vendors" },
    { icon: Building2, value: "50+", label: "EPC Clients" },
    { icon: TrendingUp, value: "$200M+", label: "Contract Value" },
  ];

  const navLinkClass = "text-sm font-semibold text-muted-foreground hover:text-primary transition-colors";

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-all duration-300 ${
          scrolled ? "bg-background/85 backdrop-blur-xl border-border shadow-sm" : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground text-sm font-bold">PS</span>
            </div>
            <span className="text-xl font-bold text-foreground font-[family-name:var(--font-heading)]">ProSource</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className={navLinkClass}>Features</a>
            <a href="#how-it-works" className={navLinkClass}>How It Works</a>
            <a href="#benefits" className={navLinkClass}>Benefits</a>
            <a href="#sectors" className={navLinkClass}>Sectors</a>
            <Link href="/tenders" className={navLinkClass}>Packages</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <Button onClick={() => router.push("/dashboard")} className="rounded-xl px-5 text-sm">
                Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login" className={navLinkClass}>Sign In</Link>
                <Button onClick={() => router.push("/register")} className="rounded-xl px-5 text-sm">
                  Get Started
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)} className="rounded-full">
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden glass border-t border-border px-4 py-4">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>How It Works</a>
              <a href="#benefits" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>Benefits</a>
              <a href="#sectors" className="text-sm font-bold text-foreground" onClick={() => setIsMenuOpen(false)}>Sectors</a>
              <Link href="/tenders" className="text-sm font-bold text-foreground">Packages</Link>
              <div className="flex gap-2 mt-2">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl">Sign In</Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button className="w-full rounded-xl">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
        <HeroBackground />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="flex flex-col space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-bold uppercase tracking-wider w-fit text-primary">
                <Zap size={14} /> Procurement Platform for EPC Companies
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.05] tracking-tight font-[family-name:var(--font-heading)]">
                Procurement & bidding{" "}
                <span className="text-gradient">intelligence</span> for every sector
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Connect EPC owners and qualified vendors across{" "}
                <span className="text-foreground font-semibold">power</span>,{" "}
                <span className="text-foreground font-semibold">infrastructure</span>,{" "}
                <span className="text-foreground font-semibold">petrochemicals</span>, and{" "}
                <span className="text-foreground font-semibold">oil & gas</span>.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => router.push("/register")} size="lg" className="rounded-xl px-8 text-base">
                  Register as EPC Owner
                </Button>
                <Button onClick={() => router.push("/register")} size="lg" variant="outline" className="rounded-xl px-8 text-base border-primary text-primary hover:bg-primary/5">
                  Register as Vendor
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" /> Free vendor registration
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" /> Real-time bid tracking
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-primary" /> EPC-qualified suppliers
                </span>
              </div>
            </div>

            <div className="relative mt-8 lg:mt-0">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-border shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/hero-refinery.jpg" alt="EPC industrial facility" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-5">
                  <div className="text-sm font-bold text-primary mb-1">AI-Powered Matching</div>
                  <div className="text-xs text-muted-foreground">Automatically matches packages with qualified EPC vendors</div>
                </div>
              </div>

              {/* Floating search panel */}
              <div className="absolute -bottom-8 -left-8 right-8 glass rounded-2xl p-4 shadow-xl hidden lg:block">
                <div className="flex items-center gap-3 bg-background/50 rounded-xl px-4 py-3 border border-border">
                  <Search size={20} className="text-primary" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery) {
                        router.push(`/tenders?search=${encodeURIComponent(searchQuery)}`);
                      }
                    }}
                    placeholder="Search packages, materials, services..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                  />
                  <button
                    onClick={() => searchQuery && router.push(`/tenders?search=${encodeURIComponent(searchQuery)}`)}
                    className="bg-primary text-primary-foreground text-sm font-bold px-5 py-2 rounded-lg hover:brightness-105 transition-all"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="relative z-20 pt-24 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-card border border-border rounded-3xl shadow-[var(--shadow-card)] p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <stat.icon size={22} className="text-primary" />
                  </div>
                  <div className="text-3xl font-extrabold text-foreground font-[family-name:var(--font-heading)]">{stat.value}</div>
                  <div className="text-sm text-muted-foreground font-medium mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sectors Section */}
      <section id="sectors" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Sectors We Serve
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight mb-5 font-[family-name:var(--font-heading)]">
              Built for the full EPC landscape
            </h2>
            <p className="text-lg text-muted-foreground">
              From power plants to pipelines, ProSource supports procurement across every major EPC sector.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sectors.map((sector) => (
              <div
                key={sector.title}
                className="group relative bg-card border border-border rounded-2xl p-6 card-3d hover:border-primary/30 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <div className="relative">
                  <div className="w-13 h-13 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <sector.icon size={26} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1 font-[family-name:var(--font-heading)]">{sector.title}</h3>
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">{sector.subtitle}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{sector.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Features
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight font-[family-name:var(--font-heading)]">
              Powered by intelligent procurement
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform that simplifies tendering, vendor management, and bid evaluation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Process
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight font-[family-name:var(--font-heading)]">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A streamlined process that saves time and eliminates complexity.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent hidden md:block" />

            <div className="space-y-16">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div
                    className={`md:absolute md:left-1/2 md:transform md:-translate-x-1/2 z-10 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg mb-4 md:mb-0 ${
                      step.forUser === "owner"
                        ? "bg-primary text-primary-foreground shadow-primary/30"
                        : step.forUser === "vendor"
                        ? "bg-foreground text-background"
                        : "bg-card text-primary border border-border shadow-[var(--shadow-card)]"
                    }`}
                  >
                    {index < steps.length - 1 ? <ArrowRight className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  </div>

                  <div className="md:grid md:grid-cols-2 md:gap-12 items-center">
                    <div className={index % 2 === 0 ? "md:text-right md:pr-12" : "md:col-start-2 md:text-left md:pl-12"}>
                      <div className="text-sm font-extrabold text-primary mb-1 font-[family-name:var(--font-heading)]">{step.number}</div>
                      <h3 className="text-2xl font-bold text-foreground mb-3 font-[family-name:var(--font-heading)]">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed text-base">{step.description}</p>
                      <div className="mt-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            step.forUser === "owner"
                              ? "bg-primary/10 text-primary"
                              : step.forUser === "vendor"
                              ? "bg-foreground/10 text-foreground"
                              : "bg-muted text-muted-foreground border border-border"
                          }`}
                        >
                          {step.forUser === "owner" ? "EPC Owner" : step.forUser === "vendor" ? "Vendor" : "System"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-gradient-to-b from-card to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Benefits
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-foreground mb-5 tracking-tight font-[family-name:var(--font-heading)]">
              Benefits for all parties
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform creates value for both EPC owners and vendors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div className="bg-card border border-border rounded-3xl p-8 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/25">
                  O
                </div>
                <h3 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">For EPC Owners</h3>
              </div>
              <div className="grid gap-4">
                {ownerBenefits.map((benefit, index) => (
                  <BenefitCard key={index} {...benefit} />
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-8 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-12 w-12 rounded-xl bg-foreground flex items-center justify-center text-background font-extrabold text-lg">
                  V
                </div>
                <h3 className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">For Vendors</h3>
              </div>
              <div className="grid gap-4">
                {vendorBenefits.map((benefit, index) => (
                  <BenefitCard key={index} {...benefit} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Packages Section */}
      <section className="py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                Live Opportunities
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight font-[family-name:var(--font-heading)]">
                Active packages
              </h2>
            </div>
            <Link href="/tenders" className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
              View all packages <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tendersData?.items?.map((tender: any) => (
              <TenderCard key={tender._id} tender={tender} showSubmitBid={!!session && isVendor} />
            ))}
            {(!tendersData?.items || tendersData.items.length === 0) && (
              <div className="col-span-full text-center py-20 bg-background border border-dashed border-border rounded-3xl">
                <FileText size={56} className="mx-auto mb-4 opacity-40 text-muted-foreground" />
                <p className="text-xl font-bold text-foreground font-[family-name:var(--font-heading)]">No active packages</p>
                <p className="text-muted-foreground mt-1">Check back soon for new procurement opportunities across all sectors.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden bg-primary">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 25%), radial-gradient(circle at 80% 50%, white 0%, transparent 25%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-primary-foreground mb-5 tracking-tight font-[family-name:var(--font-heading)]">
            Ready to bid smarter?
          </h2>
          <p className="text-lg md:text-xl text-primary-foreground/85 mb-10 leading-relaxed">
            Join EPC owners and vendors across every sector who use ProSource to run transparent, efficient procurement.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => router.push("/register")} size="lg" className="bg-background text-primary hover:bg-background/90 rounded-xl px-8 text-base shadow-xl">
              Register as EPC Owner
            </Button>
            <Button onClick={() => router.push("/register")} size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-xl px-8 text-base">
              Register as Vendor
            </Button>
          </div>
          <p className="mt-8 text-sm text-primary-foreground/80 font-medium">
            No credit card required. Start with our free tier and upgrade as you grow.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B0C0F] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-primary-foreground text-sm font-bold">PS</span>
                </div>
                <span className="text-xl font-bold text-white font-[family-name:var(--font-heading)]">ProSource</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Transforming EPC procurement with intelligent tendering and vendor management.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-white text-base mb-5 font-[family-name:var(--font-heading)]">Platform</h3>
              <ul className="space-y-3">
                <li><Link href="/tenders" className="text-muted-foreground text-sm hover:text-white transition-colors">Packages</Link></li>
                <li><Link href="/vendors" className="text-muted-foreground text-sm hover:text-white transition-colors">Vendors</Link></li>
                <li><Link href="/bids" className="text-muted-foreground text-sm hover:text-white transition-colors">Bids</Link></li>
                <li><Link href="/documents" className="text-muted-foreground text-sm hover:text-white transition-colors">Documents</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white text-base mb-5 font-[family-name:var(--font-heading)]">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-muted-foreground text-sm hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-muted-foreground text-sm hover:text-white transition-colors">How It Works</a></li>
                <li><a href="#benefits" className="text-muted-foreground text-sm hover:text-white transition-colors">Benefits</a></li>
                <li><Link href="/settings" className="text-muted-foreground text-sm hover:text-white transition-colors">Help Center</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-white text-base mb-5 font-[family-name:var(--font-heading)]">Company</h3>
              <ul className="space-y-3">
                <li><Link href="/profile" className="text-muted-foreground text-sm hover:text-white transition-colors">About</Link></li>
                <li><Link href="/settings" className="text-muted-foreground text-sm hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/messages" className="text-muted-foreground text-sm hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/settings" className="text-muted-foreground text-sm hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} ProSource Procurement Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
