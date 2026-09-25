import { auth } from "@/lib/auth";
import { getProfileForUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { TenderForm } from "@/components/tender-form";

export default async function NewTenderPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  if (user.role === "admin") redirect("/tenders");

  const profile = await getProfileForUser(user.id);
  if (!profile || profile.userType !== "company") redirect("/tenders");

  if (!profile.isVerified) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4 animate-fade-in-up">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
          <span className="text-2xl font-bold">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold">Verification Required</h1>
        <p className="text-muted-foreground">
          Your EPC Company account is currently pending Super Admin verification. You can browse published packages and directory, but cannot create or publish new tenders until verified.
        </p>
        <div className="pt-2">
          <a href="/tenders" className="inline-flex items-center justify-center rounded-xl font-medium bg-primary text-primary-foreground px-4 py-2 text-sm shadow hover:bg-primary/90 transition-colors">
            Back to Tenders
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">Create New Tender</h1>
        <p className="text-sm text-muted-foreground mt-1">Starts as a private draft. RFQ is the default — publish only when the required documents are attached.</p>
      </div>
      <TenderForm mode="create" />
    </div>
  );
}
