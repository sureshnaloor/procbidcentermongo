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
