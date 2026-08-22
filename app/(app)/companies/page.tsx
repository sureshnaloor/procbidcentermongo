"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Loader2, Users, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompaniesPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const qParams = new URLSearchParams({ userType: "company", limit: "50" });
  if (search) qParams.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["companies", search],
    queryFn: () => fetch(`/api/profile/list?${qParams}`).then((r) => r.json()),
    enabled: !!session,
  });
  const companies = data?.items ?? [];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
          Companies
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Public EPC company profiles. Message any registered company from here or Messages.</p>
      </div>
      <Card className="glass border-0 p-1 max-w-md">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" id="company-search" />
          </div>
        </CardContent>
      </Card>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-muted/20">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">No companies found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {companies.map((c: any) => (
            <Card key={c._id} className="card-3d hover:border-primary/30 h-full border-0">
              <CardContent className="p-5 flex flex-col h-full">
                <Link href={`/companies/${c._id}`} className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold truncate">{c.companyName || "Company"}</h2>
                      {c.isVerified && <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.industry || [c.city, c.country].filter(Boolean).join(", ")}</p>
                  </div>
                </Link>
                {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>}
                <div className="flex flex-wrap gap-2 mb-3">
                  {c.employeeCount != null && (
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Users className="h-3 w-3" />{c.employeeCount.toLocaleString()} employees
                    </Badge>
                  )}
                  {c.annualTurnover != null && (
                    <Badge variant="outline" className="text-[10px]">
                      {c.turnoverCurrency || "USD"} {Number(c.annualTurnover).toLocaleString()}
                    </Badge>
                  )}
                </div>
                <div className="mt-auto flex gap-2">
                  <Link href={`/companies/${c._id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">View</Button>
                  </Link>
                  <Link href={`/messages/dm/${c._id}`} className="flex-1">
                    <Button size="sm" className="w-full"><MessageSquare className="h-3.5 w-3.5" /> Message</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
