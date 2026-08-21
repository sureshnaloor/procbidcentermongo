"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ThreadVendorOption = { id: string; name: string };

export function OfferThreadPanel({
  tenderId,
  vendorProfileId,
  bidId,
  counterpartName,
  vendorOptions,
  onVendorChange,
}: {
  tenderId: string;
  vendorProfileId?: string | null;
  bidId?: string;
  counterpartName?: string;
  vendorOptions?: ThreadVendorOption[];
  onVendorChange?: (vendorProfileId: string) => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedVendor = vendorProfileId || vendorOptions?.[0]?.id || "";

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
  });

  const enabled = Boolean(tenderId && selectedVendor);
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["offer-thread", tenderId, selectedVendor],
    queryFn: async () => {
      const res = await fetch(`/api/offer-thread?tenderId=${tenderId}&vendorProfileId=${selectedVendor}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load messages");
      return Array.isArray(data) ? data : [];
    },
    enabled,
    refetchInterval: 8000,
    retry: false,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/offer-thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenderId,
          vendorProfileId: selectedVendor,
          bidId,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      return data;
    },
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["offer-thread", tenderId, selectedVendor] });
      qc.invalidateQueries({ queryKey: ["messages", "unread"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function submit() {
    const content = draft.trim();
    if (!content || sendMutation.isPending) return;
    sendMutation.mutate(content);
  }

  const myId = profile?._id ? String(profile._id) : "";
  const title = counterpartName ? `Messages with ${counterpartName}` : "Package messages";

  return (
    <aside className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-4 self-start print:hidden">
      <div className="rounded-xl border border-border bg-card flex flex-col h-[min(70vh,36rem)]">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-sm font-semibold text-foreground">Message trail</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Private to this company and supplier. Not visible to other users.
          </p>
          {vendorOptions && vendorOptions.length > 1 && (
            <div className="mt-2">
              <Select value={selectedVendor} onValueChange={(v) => onVendorChange?.(v)}>
                <SelectTrigger id="thread-vendor-select" className="h-8 text-xs">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {vendorOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(!vendorOptions || vendorOptions.length <= 1) && (
            <div className="text-xs text-foreground mt-1 truncate">{title}</div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {!enabled && (
            <p className="text-xs text-muted-foreground p-2">No supplier on this package to message yet.</p>
          )}
          {enabled && isLoading && (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          )}
          {enabled && !isLoading && messages.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">No messages yet. Start the conversation about this package.</p>
          )}
          {messages.map((msg: any) => {
            const mine = myId && String(msg.senderProfileId) === myId;
            return (
              <div key={msg._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <div className="text-[10px] opacity-80 mb-0.5">
                    {mine ? "You" : (msg.sender?.companyName || "Participant")}
                    {" · "}
                    {msg.createdAt ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true }) : ""}
                  </div>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 space-y-2">
          <Textarea
            rows={3}
            value={draft}
            disabled={!enabled || sendMutation.isPending}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={enabled ? "Write a message…" : "Unavailable"}
            id="offer-thread-input"
            className="text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={submit} disabled={!enabled || !draft.trim() || sendMutation.isPending} id="offer-thread-send">
              {sendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
