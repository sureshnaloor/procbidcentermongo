"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function OfferAccessPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["offer-access", token],
    queryFn: async () => {
      const res = await fetch(`/api/offer/${token}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: status === "authenticated",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/offer/${token}`)}`);
    }
  }, [status, router, token]);

  useEffect(() => {
    if (!data) return;
    if (data.myBid?.status === "draft") {
      router.replace(`/bids/${data.myBid._id}/edit`);
      return;
    }
    if (data.myBid?._id) {
      router.replace(`/bids/${data.myBid._id}`);
      return;
    }
    if (data.tenderId) {
      router.replace(`/bids/new/${data.tenderId}`);
    }
  }, [data, router]);

  if (status === "loading" || isLoading || (isFetched && data)) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return <div className="min-h-[50vh]" />;
}
