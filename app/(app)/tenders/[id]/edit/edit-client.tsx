"use client";

import { useQuery } from "@tanstack/react-query";
import { TenderForm } from "@/components/tender-form";
import { Loader2 } from "lucide-react";

export function EditTenderClient({ id }: { id: string }) {
  const { data: tender, isLoading } = useQuery({
    queryKey: ["tender", id],
    queryFn: () => fetch(`/api/tenders/${id}`).then((r) => r.json()),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!tender) return <div className="text-center py-16 text-muted-foreground">Tender not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Edit Tender</h1>
      <TenderForm mode="edit" tender={tender} />
    </div>
  );
}
