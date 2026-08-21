"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { BidForm } from "@/components/bid-form";

export default function NewBidPage({ params }: { params: Promise<{ tenderId: string }> }) {
  const { tenderId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: tender, isLoading } = useQuery({
    queryKey: ["tender", tenderId],
    queryFn: () => fetch(`/api/tenders/${tenderId}`).then((r) => r.json()),
  });

  useEffect(() => {
    if (profile && profile.userType && profile.userType !== "vendor") {
      router.replace(`/tenders/${tenderId}`);
    }
  }, [profile, router, tenderId]);

  useEffect(() => {
    const existing = tender?.myBid;
    if (!existing?._id) return;
    if (existing.status === "draft") router.replace(`/bids/${existing._id}/edit`);
    else router.replace(`/bids/${existing._id}`);
  }, [tender, router]);

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!tender) return <div className="text-center py-16 text-muted-foreground" />;
  if (profile && profile.userType === "vendor" && !tender.participation?.canPrepareOffer) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-muted-foreground">You can prepare an offer only after the company invites you or accepts your request.</p>
        <Link href={`/tenders/${tenderId}`} className="text-sm text-primary hover:underline">Back to tender</Link>
      </div>
    );
  }
  if (tender.myBid?._id) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return <BidForm mode="create" tender={tender} />;
}
