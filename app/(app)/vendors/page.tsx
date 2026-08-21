"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Search, Loader2, Globe, Phone, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VendorsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");

  const qParams = new URLSearchParams({ userType: "vendor", limit: "50" });
  if (search) qParams.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", search],
    queryFn: () => fetch(`/api/profile/list?${qParams}`).then((r) => r.json()),
    enabled: !!session,
  });

  const vendors = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
        <p className="text-sm text-muted-foreground mt-1">Message any registered supplier directly.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" id="vendor-search" />
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v: any) => (
            <Card key={v._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-semibold text-foreground truncate">{v.companyName || "Unknown"}</h2>
                      {v.isVerified && <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    {v.city && v.country && <p className="text-xs text-muted-foreground">{v.city}, {v.country}</p>}
                  </div>
                </div>
                {v.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{v.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  {v.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{v.phone}</span>}
                  {v.website && (
                    <a href={v.website.startsWith("http") ? v.website : `https://${v.website}`} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-primary hover:underline">
                      <Globe className="h-3 w-3" />Website
                    </a>
                  )}
                </div>
                <Link href={`/messages/dm/${v._id}`}>
                  <Button size="sm" className="w-full"><MessageSquare className="h-3.5 w-3.5" /> Message</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
