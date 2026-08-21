"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Documents</h1>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-muted-foreground">No documents yet</p>
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
    </div>
  );
}
