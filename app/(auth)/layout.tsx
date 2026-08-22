import type { Metadata } from "next";

export const metadata: Metadata = { title: "ProcBidCenter — Sign In" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden bg-background">
      {/* Premium ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] h-[55vh] w-[55vh] rounded-full bg-primary/10 blur-[120px] animate-float" />
        <div className="absolute top-[25%] -right-[10%] h-[50vh] w-[50vh] rounded-full bg-[#e88d5e]/10 blur-[120px] animate-float-delayed" />
        <div
          className="absolute -bottom-[15%] left-[20%] h-[45vh] w-[45vh] rounded-full bg-primary/[0.08] blur-[110px] animate-float"
          style={{ animationDuration: "11s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.07] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-xl mx-auto">
        <div className="mb-8 text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-white/20">
              <span className="text-primary-foreground text-base font-bold">PS</span>
            </div>
            <span className="text-2xl font-bold text-foreground font-[family-name:var(--font-heading)]">ProSource</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Procurement & Bidding Platform for EPC Companies
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
