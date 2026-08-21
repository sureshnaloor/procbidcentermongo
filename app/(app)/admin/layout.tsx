import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  if (!user || user.role !== "admin") redirect("/dashboard");
  return <>{children}</>;
}
