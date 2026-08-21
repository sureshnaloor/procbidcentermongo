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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    published: { bg: "bg-emerald-500/12", text: "text-emerald-600 dark:text-emerald-400", label: "Bidding Open" },
    closed: { bg: "bg-slate-500/12", text: "text-slate-600 dark:text-slate-400", label: "Closed" },
    awarded: { bg: "bg-primary/12", text: "text-primary", label: "Awarded" },
    draft: { bg: "bg-muted", text: "text-muted-foreground", label: "Draft" },
  };

  const status = statusConfig[tender.status] || statusConfig.draft;

  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full font-semibold tracking-wide">
          {tender.type.toUpperCase()}
        </span>
        <span className={`px-3 py-1 ${status.bg} ${status.text} text-xs rounded-full font-medium`}>
          {status.label}
        </span>
      </div>
      <h3 className="font-semibold text-foreground text-lg leading-snug mb-2 line-clamp-2">
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
          className="text-primary text-sm font-semibold hover:underline flex items-center gap-1"
        >
          View details <ChevronRight size={14} />
        </button>
        {showSubmitBid && tender.status === "published" && (
          <Button
            onClick={() => router.push(`/bids/new/${tender._id}`)}
            size="sm"
            className="rounded-lg text-xs px-4"
          >
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
    <div className="bg-card border border-border rounded-xl p-6 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-200">
      <div className="rounded-full w-12 h-12 flex items-center justify-center bg-primary/10 text-primary mb-4">
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
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
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-primary">
          <Icon size={22} />
        </div>
        <h4 className="text-lg font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Main Home Page Component ───
export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Fetch active packages
  const { data: tendersData } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", "published"],
    queryFn: () => fetch("/api/tenders?status=published&limit=6").then((r) => r.json()),
    enabled: true,
  });

  // Fetch user profile to check if vendor
  const { data: profile } = useQuery<any>({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  const isVendor = profile?.userType === "vendor";

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Classification",
      description:
        "Automatically classify materials and services across power, infrastructure, petrochemicals, and oil & gas.",
    },
    {
      icon: FileSpreadsheet,
      title: "Automated Tendering",
      description:
        "Create and publish tender packages, RFPs, and RFQs with structured templates and document attachments.",
    },
    {
      icon: Layers,
      title: "Smart Vendor Matching",
      description:
        "Match packages with qualified EPC vendors based on sector, capability, location, and past performance.",
    },
    {
      icon: SlidersHorizontal,
      title: "Bid Comparison",
      description:
        "Side-by-side technical and commercial comparison sheets for faster, more transparent evaluations.",
    },
    {
      icon: Coins,
      title: "Cost Optimization",
      description:
        "Drive competitive pricing across suppliers and track budget performance across projects.",
    },
    {
      icon: ShieldCheck,
      title: "Vendor Qualification",
      description:
        "Verify supplier credentials, certifications, and qualifications before inviting them to bid.",
    },
    {
      icon: Truck,
      title: "Document Control",
      description:
        "Centralize drawings, specs, addendums, and bid submissions with version control and audit trails.",
    },
    {
      icon: Building2,
      title: "Multi-Sector Coverage",
      description:
        "One platform for power, infrastructure, petrochemicals, and upstream/midstream/downstream oil & gas.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "List Your Requirement",
      description:
        "EPC owners publish tender packages with scope, drawings, deadlines, and qualification criteria.",
      forUser: "owner",
    },
    {
      number: "02",
      title: "AI Classification",
      description:
        "The platform auto-classifies requirements by sector, material group, and service category.",
      forUser: "system",
    },
    {
      number: "03",
      title: "Vendor Notification",
      description:
        "Qualified vendors are notified of packages that match their capabilities and sector focus.",
      forUser: "vendor",
    },
    {
      number: "04",
      title: "Submit Bids",
      description:
        "Vendors upload technical and commercial proposals, certifications, and pricing before the deadline.",
      forUser: "vendor",
    },
    {
      number: "05",
      title: "AI Comparison",
      description:
        "System-generated comparison sheets help evaluators score bids consistently and transparently.",
      forUser: "system",
    },
    {
      number: "06",
      title: "Award & Contract",
      description:
        "Owners select the best bid, award the package, and track performance through delivery.",
      forUser: "owner",
    },
  ];

  const ownerBenefits = [
    {
      icon: Clock,
      title: "Time Efficiency",
      description: "Reduce procurement cycle time by up to 60% with automated tendering and evaluation.",
    },
    {
      icon: SearchCheck,
      title: "Quality Vendors",
      description: "Access a pre-qualified network of EPC suppliers across every major sector.",
    },
    {
      icon: FileCheck,
      title: "Smart Comparisons",
      description: "Automatically generated technical and commercial comparison sheets for informed awards.",
    },
    {
      icon: DollarSign,
      title: "Cost Savings",
      description: "Achieve 15-20% average savings through competitive bidding and transparent pricing.",
    },
  ];

  const vendorBenefits = [
    {
      icon: Users,
      title: "Expanded Reach",
      description: "Connect with EPC owners actively looking for your materials, services, and expertise.",
    },
    {
      icon: LineChart,
      title: "Market Insights",
      description: "Gain visibility into live tender opportunities and sector demand trends.",
    },
    {
      icon: ShieldCheck,
      title: "Reduced Overhead",
      description: "Lower customer acquisition costs with standardized bid submissions and digital tracking.",
    },
    {
      icon: CheckCircle2,
      title: "Faster Awards",
      description: "Track bid status in real time and receive prompt notifications on award decisions.",
    },
  ];

  const navLinkClass = "text-sm font-medium text-muted-foreground hover:text-primary transition-colors";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full border-b transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-border shadow-sm"
            : "bg-background/80 backdrop-blur-sm border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">PS</span>
            </div>
            <span className="text-xl font-bold text-foreground">ProSource</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className={navLinkClass}>
              Features
            </a>
            <a href="#how-it-works" className={navLinkClass}>
              How It Works
            </a>
            <a href="#benefits" className={navLinkClass}>
              Benefits
            </a>
            <Link href="/tenders" className={navLinkClass}>
              Packages
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <Button
                onClick={() => router.push("/dashboard")}
                className="rounded-lg px-5 text-sm font-medium"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Link href="/login" className={navLinkClass}>
                  Sign In
                </Link>
                <Button
                  onClick={() => router.push("/register")}
                  className="rounded-lg px-5 text-sm font-medium"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-background border-t border-border px-4 py-4">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium text-foreground" onClick={() => setIsMenuOpen(false)}>
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-foreground" onClick={() => setIsMenuOpen(false)}>
                How It Works
              </a>
              <a href="#benefits" className="text-sm font-medium text-foreground" onClick={() => setIsMenuOpen(false)}>
                Benefits
              </a>
              <Link href="/tenders" className="text-sm font-medium text-foreground">
                Packages
              </Link>
              <div className="flex gap-2 mt-2">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full rounded-lg">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" className="flex-1">
                  <Button className="w-full rounded-lg">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider w-fit">
                <Zap size={14} /> Procurement Platform for EPC Companies
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-foreground leading-[1.1] tracking-tight">
                Procurement & bidding intelligence for every EPC sector
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Connect EPC owners and qualified vendors across power, infrastructure,
                petrochemicals, and oil & gas with smart tendering, automated matching, and
                transparent bid evaluation.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => router.push("/register")}
                  size="lg"
                  className="rounded-lg px-8 font-semibold"
                >
                  Register as EPC Owner
                </Button>
                <Button
                  onClick={() => router.push("/register")}
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 rounded-lg px-8 font-semibold"
                >
                  Register as Vendor
                </Button>
              </div>
              <p className="text-sm text-muted-foreground font-medium italic">
                Join 500+ EPC companies and vendors already streamlining their procurement process.
              </p>
            </div>

            <div className="relative mt-8 lg:mt-0">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-muted p-4 border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-refinery.jpg"
                  alt="EPC industrial facility"
                  className="rounded-xl object-cover w-full h-full"
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card/95 backdrop-blur-sm rounded-xl p-4 shadow-xl max-w-[80%] border border-border">
                  <div className="text-sm font-semibold text-primary">AI-Powered Matching</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Automatically matches packages with qualified EPC vendors
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative blur */}
        <div className="absolute inset-x-0 -bottom-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-bottom-80 pointer-events-none">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary/30 to-muted opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Powered by intelligent procurement technology
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform that simplifies tendering, vendor management, and bid evaluation
              across every EPC sector.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Process
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A streamlined process that saves time and eliminates complexity for owners and vendors.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-primary/20 hidden md:block"></div>

            <div className="space-y-12">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  <div
                    className={`md:absolute md:left-1/2 md:transform md:-translate-x-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md mb-4 md:mb-0 ${
                      step.forUser === "owner"
                        ? "bg-primary text-primary-foreground"
                        : step.forUser === "vendor"
                        ? "bg-foreground text-background"
                        : "bg-muted text-primary border border-border"
                    }`}
                  >
                    {index < steps.length - 1 ? (
                      <ArrowRight className="h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                  </div>

                  <div className="md:grid md:grid-cols-2 md:gap-8 items-center">
                    <div
                      className={`${
                        index % 2 === 0
                          ? "md:text-right md:pr-12"
                          : "md:col-start-2 md:text-left md:pl-12"
                      }`}
                    >
                      <div className="text-sm font-semibold text-primary mb-1">{step.number}</div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                      <div className="mt-3">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
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
      <section id="benefits" className="py-20 bg-gradient-to-b from-card to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
              Benefits
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
              Benefits for all parties
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our platform creates value for both EPC owners issuing packages and vendors bidding on them.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  O
                </div>
                <h3 className="text-2xl font-semibold text-foreground">For EPC Owners</h3>
              </div>
              <div className="grid gap-4">
                {ownerBenefits.map((benefit, index) => (
                  <BenefitCard key={index} {...benefit} />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center text-background font-bold">
                  V
                </div>
                <h3 className="text-2xl font-semibold text-foreground">For Vendors</h3>
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
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                Live Opportunities
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Active packages
              </h2>
            </div>
            <Link
              href="/tenders"
              className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline"
            >
              View all packages <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tendersData?.items?.map((tender: any) => (
              <TenderCard key={tender._id} tender={tender} showSubmitBid={!!session && isVendor} />
            ))}
            {(!tendersData?.items || tendersData.items.length === 0) && (
              <div className="col-span-full text-center py-16 bg-background border border-border rounded-2xl">
                <FileText size={48} className="mx-auto mb-4 opacity-40 text-muted-foreground" />
                <p className="text-lg font-semibold text-foreground">No active packages</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back soon for new procurement opportunities across all sectors.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Ready to transform your EPC procurement?
            </h2>
            <p className="text-lg md:text-xl opacity-90 mb-8">
              Join our platform today and experience smarter tendering, matching, and bid
              evaluation across every EPC sector.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                onClick={() => router.push("/register")}
                size="lg"
                className="bg-background text-primary hover:bg-background/90 rounded-lg px-8 font-semibold"
              >
                Register as EPC Owner
              </Button>
              <Button
                onClick={() => router.push("/register")}
                size="lg"
                variant="outline"
                className="border-background/40 text-background hover:bg-background/10 rounded-lg px-8 font-semibold"
              >
                Register as Vendor
              </Button>
            </div>
            <p className="mt-6 text-sm opacity-80">
              No credit card required. Start with our free tier and upgrade as your business grows.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <span className="text-primary-foreground text-xs font-bold">PS</span>
                </div>
                <span className="text-xl font-bold text-white">ProSource</span>
              </div>
              <p className="text-[#9B8B7A] text-sm leading-relaxed">
                Transforming EPC procurement with intelligent tendering and vendor management.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-white text-lg mb-4">Platform</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/tenders" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Packages
                  </Link>
                </li>
                <li>
                  <Link href="/vendors" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Vendors
                  </Link>
                </li>
                <li>
                  <Link href="/bids" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Bids
                  </Link>
                </li>
                <li>
                  <Link href="/documents" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Documents
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-white text-lg mb-4">Resources</h3>
              <ul className="space-y-2.5">
                <li>
                  <a href="#features" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#benefits" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Benefits
                  </a>
                </li>
                <li>
                  <Link href="/settings" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-white text-lg mb-4">Company</h3>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/profile" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/messages" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/settings" className="text-[#9B8B7A] text-sm hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-[#6B6560]">
            <p>&copy; {new Date().getFullYear()} ProSource Procurement Portal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
