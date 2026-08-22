"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    displayName: "",
    userType: "company" as "company" | "vendor",
    companyName: "",
    contactPerson: "",
    phone: "",
    country: "",
    city: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      // Auto sign-in
      const result = await signIn("credentials", {
        username: form.username,
        password: form.password,
        redirect: false,
      });
      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="glass card-3d border-0 shadow-2xl animate-fade-in-up max-w-lg mx-auto">
      <CardHeader className="pb-2 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight text-gradient">
          Create account
        </CardTitle>
        <CardDescription className="text-muted-foreground/90">
          Join ProSource as an EPC company or supplier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" id="register-form">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Account type</Label>
            <Select value={form.userType} onValueChange={(v) => setField("userType", v)}>
              <SelectTrigger id="userType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">EPC Company</SelectItem>
                <SelectItem value="vendor">Supplier / Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Full name</Label>
              <Input id="displayName" value={form.displayName} onChange={(e) => setField("displayName", e.target.value)} placeholder="Your name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} placeholder="Company" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-email">Email</Label>
            <Input id="reg-email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="you@company.com" required autoComplete="email" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reg-username">Username</Label>
              <Input id="reg-username" value={form.username} onChange={(e) => setField("username", e.target.value)} placeholder="username" required autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder="Min 6 chars" required autoComplete="new-password" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="Country" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="City" />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-base" disabled={loading} id="register-submit-btn">
            {loading ? <><Loader2 className="animate-spin" /> Creating account...</> : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center pb-6">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:text-primary/80 link-underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
