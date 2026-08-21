"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, CalendarClock, MapPin, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  draft: "secondary",
  published: "success",
  closed: "outline",
  awarded: "default",
  cancelled: "destructive",
};

export default function TendersPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const isCompany = profile?.userType === "company";
  const isVendor = profile?.userType === "vendor";

  const qParams = new URLSearchParams({ limit: "20" });
  if (search) qParams.set("search", search);
  if (status) qParams.set("status", status);
  if (type) qParams.set("type", type);

  const { data, isLoading } = useQuery<{ items: any[]; total: number }>({
    queryKey: ["tenders", search, status, type],
    queryFn: () => fetch(`/api/tenders?${qParams}`).then((r) => r.json()),
    enabled: !!session,
  });

  const tenders = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Tenders</h1>
        {isCompany && (
          <Link href="/tenders/new">
            <Button size="sm" id="new-tender-top-btn"><Plus /> New Tender</Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tenders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" id="tender-search" />
        </div>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36" id="tender-status-filter"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32" id="tender-type-filter"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="rfp">RFP</SelectItem>
            <SelectItem value="rfq">RFQ</SelectItem>
            <SelectItem value="tender">Tender</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {isVendor ? "No published tenders to bid on yet." : "No tenders found"}
          </p>
          {isCompany && (
            <Link href="/tenders/new"><Button variant="outline" className="mt-4" size="sm">Create your first tender</Button></Link>
          )}
          {isVendor && (
            <p className="text-sm text-muted-foreground mt-2">When a company publishes a tender, you can prepare an offer from the tender page.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {tenders.map((t: any) => (
            <Link key={t._id} href={`/tenders/${t._id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs uppercase shrink-0">{t.type}</Badge>
                        <Badge variant={STATUS_COLORS[t.status] ?? "outline"} className="shrink-0">{t.status}</Badge>
                      </div>
                      <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{t.title}</h2>
                      {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {t.estimatedValue && (
                        <div className="font-semibold text-foreground">{t.currency} {t.estimatedValue.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {t.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</span>}
                    {t.bidDeadline && <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />Deadline: {new Date(t.bidDeadline).toLocaleDateString()}</span>}
                    <span>Posted {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
