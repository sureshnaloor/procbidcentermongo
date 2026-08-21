"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { BidForm } from "@/components/bid-form";

export default function EditBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: bid, isLoading } = useQuery({
    queryKey: ["bid", id],
    queryFn: () => fetch(`/api/bids/${id}`).then((r) => r.json()),
  });

  const canEditDraft = Boolean(bid?.canModify);
  const canRevise = Boolean(bid?.canRevise || bid?.canVerbalRevise);

  useEffect(() => {
    if (!bid || !profile) return;
    if (canEditDraft || canRevise) return;
    router.replace(`/bids/${id}`);
  }, [bid, profile, router, id, canEditDraft, canRevise]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!bid || !bid.tender) return <div className="text-center py-16 text-muted-foreground" />;
  if (!canEditDraft && !canRevise) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return <BidForm mode={canRevise ? "revise" : "edit"} tender={bid.tender} bid={bid} />;
}
