"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Documents</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Signed offers</h2>
        {loadingSigned ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : signedTenders.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signed offers uploaded yet.</p>
        ) : (
          <div className="space-y-4">
            {signedTenders.map((tender) => (
              <Card key={tender.tenderId}>
                <CardContent className="p-4 space-y-3">
                  <Link href={`/tenders/${tender.tenderId}`} className="font-semibold text-sm text-foreground hover:text-primary">
                    {tender.title}
                  </Link>
                  <div className="space-y-3">
                    {(tender.bidders ?? []).map((bidder: any) => (
                      <div key={bidder.bidId} className="rounded-lg border border-border p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">{bidder.vendorName}</div>
                          <Link href={`/bids/${bidder.bidId}`} className="text-xs text-primary hover:underline">View offer</Link>
                        </div>
                        {(bidder.files ?? []).map((doc: any) => (
                          <a key={doc.storedName} href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Profile documents</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-muted-foreground">No profile documents yet</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {(docs as any[]).map((d: any) => (
              <a key={d._id} href={d.fileUrl} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-accent transition-colors group">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.category && <span className="mr-2">{d.category}</span>}
                    {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <Badge variant={d.visibility === "public" ? "success" : d.visibility === "private" ? "secondary" : "default"}>{d.visibility}</Badge>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
