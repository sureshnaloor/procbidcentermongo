import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[60vh] w-[60vh] rounded-full bg-primary/10 blur-[120px] animate-float" />
        <div className="absolute top-[30%] -right-[10%] h-[50vh] w-[50vh] rounded-full bg-primary/8 blur-[110px] animate-float-delayed" />
      </div>
      <div className="relative z-10 text-center animate-fade-in-up">
        <h1 className="text-7xl sm:text-8xl font-bold text-muted-foreground/30 mb-2 font-[family-name:var(--font-heading)]">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link href="/dashboard"><Button>Go to Dashboard</Button></Link>
      </div>
    </div>
  );
}
