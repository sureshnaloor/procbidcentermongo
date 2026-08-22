"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DocumentsPage() {
  const { data: session } = useSession();
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetch("/api/documents").then((r) => r.json()),
    enabled: !!session,
  });
  const { data: signedData, isLoading: loadingSigned } = useQuery({
    queryKey: ["documents", "signed-offers"],
    queryFn: () => fetch("/api/documents/signed-offers").then((r) => r.json()),
    enabled: !!session,
  });
  const signedTenders: any[] = Array.isArray(signedData?.tenders) ? signedData.tenders : [];

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
          Documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Signed offers and public profile documents.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Signed offers</h2>
        {loadingSigned ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : signedTenders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
            <p className="text-sm text-muted-foreground font-medium">No signed offers uploaded yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 stagger-children">
            {signedTenders.map((tender) => (
              <Card key={tender.tenderId} className="border-0 shadow-[var(--shadow-card)]">
                <CardContent className="p-4 space-y-3">
                  <Link href={`/tenders/${tender.tenderId}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors block truncate">
                    {tender.title}
                  </Link>
                  <div className="space-y-3">
                    {(tender.bidders ?? []).map((bidder: any) => (
                      <div key={bidder.bidId} className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium text-foreground">{bidder.vendorName}</div>
                          <Link href={`/bids/${bidder.bidId}`} className="text-xs font-semibold text-primary hover:text-primary/80 link-underline">View offer</Link>
                        </div>
                        {(bidder.files ?? []).map((doc: any) => (
                          <a key={doc.storedName} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Profile documents</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No profile documents yet</p>
          </div>
        ) : (
          <Card className="border-0 shadow-[var(--shadow-card)] overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-border pb-3">
              <CardTitle className="text-base font-[family-name:var(--font-heading)]">Uploaded documents</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {(docs as any[]).map((d: any) => (
                  <a key={d._id} href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors group">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{d.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.category && <span className="mr-2">{d.category}</span>}
                        {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    <Badge variant={d.visibility === "public" ? "success" : d.visibility === "private" ? "secondary" : "default"} className="text-[10px]">{d.visibility}</Badge>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
