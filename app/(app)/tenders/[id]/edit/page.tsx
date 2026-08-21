import { auth } from "@/lib/auth";
import { getProfileForUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { EditTenderClient } from "./edit-client";

export default async function EditTenderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  if (user.role === "admin") redirect(`/tenders/${id}`);

  const profile = await getProfileForUser(user.id);
  if (!profile || profile.userType !== "company") redirect("/tenders");

  return <EditTenderClient id={id} />;
}
