"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, Loader2, Users, Shield, MessageSquare, Activity, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EngagementDialog } from "@/components/engagement-dialog";

export default function CompaniesPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{ id: string; name: string } | null>(null);

  const userType = (session?.user as any)?.userType;
  const isVendor = userType === "vendor";

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
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
          <Users size={11} /> EPC Owner Network
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
          Companies
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Public EPC company profiles. Message any registered company from here or Messages.</p>
      </div>
      <div className="bg-card border border-border rounded-2xl card-3d max-w-md">
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" id="company-search" />
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-border bg-card card-3d">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">No companies found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {companies.map((c: any) => (
            <div key={c._id} className="group relative bg-card border border-border rounded-2xl card-3d card-sheen hover:border-primary/40 h-full overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent" />
              <div className="p-5 flex flex-col h-full">
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
                <div className="mt-auto space-y-2">
                  <div className="flex gap-2">
                    <Link href={`/companies/${c._id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full rounded-xl">View</Button>
                    </Link>
                    <Link href={`/messages/dm/${c._id}`} className="flex-1">
                      <Button size="sm" className="w-full rounded-xl"><MessageSquare className="h-3.5 w-3.5" /> Message</Button>
                    </Link>
                  </div>

                  {isVendor && (
                    <div className="flex gap-2 pt-1 border-t border-border/50">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 rounded-xl text-xs h-8 gap-1.5"
                        onClick={() => setSelectedCompany({ id: c._id, name: c.companyName || "Company" })}
                      >
                        <Activity className="h-3.5 w-3.5 text-primary" /> My Bids
                      </Button>
                      <Link href={`/companies/${c._id}/bids-eval`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-xl text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <Award className="h-3.5 w-3.5 text-primary" /> Performance
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCompany && (
        <EngagementDialog
          open={Boolean(selectedCompany)}
          onOpenChange={(open) => !open && setSelectedCompany(null)}
          companyId={selectedCompany.id}
          companyName={selectedCompany.name}
          isCompanyViewer={false}
        />
      )}
    </div>
  );
}
