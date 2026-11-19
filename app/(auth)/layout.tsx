import type { Metadata } from "next";
import Link from "next/link";
import { Home, Database, GitCompareArrows, UserCheck, Stamp } from "lucide-react";

export const metadata: Metadata = { title: "ProSource — Account Access" };

const highlights = [
  {
    icon: Database,
    title: "Central bid registry",
    text: "Every offer, revision, and clarification recorded in one auditable place.",
  },
  {
    icon: GitCompareArrows,
    title: "Bid leveling, apple-to-apple",
    text: "Deviations, units, currency, taxes, freight, and terms normalized before you compare.",
  },
  {
    icon: UserCheck,
    title: "Auto-matched suppliers",
    text: "Suggested invite lists from classified supplier groups — sent only after your approval.",
  },
  {
    icon: Stamp,
    title: "Compliant awards",
    text: "Approval board, award scenarios, and PO drafting with a complete audit trail.",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Left Brand Panel (desktop) ─── */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-1/2 relative flex-col justify-between p-10 xl:p-14 overflow-hidden noise bg-gradient-to-br from-primary via-[#b04a28] to-[#8f3a1e] text-white">
        {/* Ambient orbs + grid */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-[12%] -left-[15%] w-[50vh] h-[50vh] rounded-full opacity-30 animate-float"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 65%)" }}
          />
          <div
            className="absolute -bottom-[18%] -right-[10%] w-[55vh] h-[55vh] rounded-full opacity-25 animate-float-delayed"
            style={{ background: "radial-gradient(circle, rgba(255,200,150,0.55) 0%, transparent 65%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>
        <div className="absolute inset-0 ring-top pointer-events-none" />

        {/* Logo — links home */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3.5 group w-fit">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <span className="text-white text-lg font-extrabold">PS</span>
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight font-[family-name:var(--font-heading)] text-white">
                ProSource
              </div>
              <div className="text-[11px] font-semibold text-white/70 uppercase tracking-widest">
                Procurement &amp; Bidding Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Middle: pitch + highlights */}
        <div className="relative z-10 space-y-8 my-10">
          <div>
            <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight font-[family-name:var(--font-heading)]">
              Every bid centrally recorded. Levelled apple-to-apple. Awarded with confidence.
            </h1>
            <p className="mt-3 text-sm xl:text-base text-white/80 leading-relaxed max-w-md">
              The procurement workspace for EPC owners and specialized suppliers — from BOQ import
              to a fully audited contract award.
            </p>
          </div>

          <ul className="space-y-4">
            {highlights.map((h) => (
              <li key={h.title} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/12 border border-white/20 flex items-center justify-center shrink-0">
                  <h.icon size={17} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{h.title}</div>
                  <div className="text-xs text-white/70 leading-relaxed mt-0.5">{h.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: trust stats */}
        <div className="relative z-10 flex items-center gap-8 pt-6 border-t border-white/15">
          {[
            { value: "500+", label: "Verified suppliers" },
            { value: "$200M+", label: "Procurement volume" },
            { value: "100%", label: "Auditable trail" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xl font-extrabold font-[family-name:var(--font-heading)]">{s.value}</div>
              <div className="text-[11px] text-white/70 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* ─── Right Form Panel ─── */}
      <main className="flex-1 relative flex flex-col min-h-screen overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-[15%] -left-[10%] h-[55vh] w-[55vh] rounded-full bg-primary/10 blur-[120px] animate-float" />
          <div className="absolute top-[25%] -right-[10%] h-[50vh] w-[50vh] rounded-full bg-[#e88d5e]/10 blur-[120px] animate-float-delayed" />
          <div
            className="absolute -bottom-[15%] left-[20%] h-[45vh] w-[45vh] rounded-full bg-primary/[0.08] blur-[110px] animate-float"
            style={{ animationDuration: "11s" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.07] via-transparent to-transparent" />
        </div>

        {/* Top bar: mobile logo (left) + Home link (right) */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-8 h-16">
          <Link href="/" className="flex lg:hidden items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-[#8f3a1e] flex items-center justify-center shadow-lg shadow-primary/25 ring-top transition-transform duration-300 group-hover:scale-105">
              <span className="text-primary-foreground text-sm font-bold">PS</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)]">
              ProSource
            </span>
          </Link>
          {/* Desktop spacer keeps Home pinned right */}
          <span className="hidden lg:block" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary px-3.5 py-2 rounded-xl border border-border bg-card/70 backdrop-blur-sm transition-colors shadow-sm"
          >
            <Home size={14} /> Home
          </Link>
        </div>

        {/* Form area */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl mx-auto">
            <div className="mb-6 text-center animate-fade-in-up lg:hidden">
              <p className="text-sm font-medium text-muted-foreground">
                Procurement &amp; Bidding Platform for EPC Companies
              </p>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
