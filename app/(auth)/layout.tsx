import type { Metadata } from "next";

export const metadata: Metadata = { title: "ProcBidCenter — Sign In" };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">PS</span>
            </div>
            <span className="text-xl font-bold text-foreground">ProSource</span>
          </div>
          <p className="text-sm text-muted-foreground">Procurement & Bidding Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
