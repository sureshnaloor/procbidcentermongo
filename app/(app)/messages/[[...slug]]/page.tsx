"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, Hash, Info, Megaphone, AlertTriangle, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { PROCUREMENT_TYPES } from "@/lib/procurement";

const CHANNEL_ICONS: Record<string, typeof Hash> = {
  information: Info,
  announcement: Megaphone,
  alert: AlertTriangle,
  general: Hash,
};

function channelCanPost(kind: string, role?: string, userType?: string | null) {
  if (kind === "alert") return role === "admin";
  if (kind === "announcement") return role === "admin" || userType === "company";
  return true;
}

export default function MessagesPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams?.slug ?? [];
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  const qc = useQueryClient();

  const isDM = slug[0] === "dm";
  const isChannel = slug[0] === "channel";
  const targetId = slug[1] ?? null;

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetch("/api/messages/conversations").then((r) => r.json()),
    enabled: !!session,
    refetchInterval: 10000,
  });
  const { data: channels = [], isLoading: loadingChannels } = useQuery({
    queryKey: ["channels"],
    queryFn: () => fetch("/api/messages/channels").then((r) => r.json()),
    enabled: !!session,
  });
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", isDM ? "dm" : "channel", targetId],
    queryFn: () => {
      if (isDM && targetId) return fetch(`/api/messages/dm/${targetId}`).then((r) => r.json());
      if (isChannel && targetId) return fetch(`/api/messages/channel/${targetId}`).then((r) => r.json());
      return [];
    },
    enabled: !!targetId,
    refetchInterval: 5000,
  });

  const dmThreads = useMemo(() => {
    const rows = Array.isArray(messages) ? (messages as any[]) : [];
    const general: any[] = [];
    const byPackage = new Map<string, { tender: any; messages: any[] }>();
    for (const msg of rows) {
      const tenderId = msg.tenderId ? String(msg.tenderId) : "";
      if (msg.kind === "offer_thread" || tenderId) {
        const key = tenderId || "unknown";
        const existing = byPackage.get(key) ?? { tender: msg.tender || null, messages: [] };
        if (msg.tender && !existing.tender) existing.tender = msg.tender;
        existing.messages.push(msg);
        byPackage.set(key, existing);
      } else {
        general.push(msg);
      }
    }
    const packages = [...byPackage.entries()].map(([id, group]) => ({ id, ...group }));
    return { general, packages };
  }, [messages]);

  const contactType = profile?.userType === "vendor" ? "company" : profile?.userType === "company" ? "vendor" : null;
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ["dm-contacts", contactType],
    queryFn: () => fetch(`/api/profile/list?userType=${contactType}&limit=100`).then((r) => r.json()),
    enabled: !!contactType,
  });

  const { data: dmPartner } = useQuery({
    queryKey: ["profile", targetId],
    queryFn: () => fetch(`/api/profile/${targetId}`).then((r) => r.json()),
    enabled: isDM && !!targetId,
  });

  const [contactSearch, setContactSearch] = useState("");
  const conversationByPartner = useMemo(() => {
    const map = new Map<string, any>();
    for (const c of conversations as any[]) map.set(String(c.partnerId), c);
    return map;
  }, [conversations]);

  const directory = useMemo(() => {
    const items = (contactsData?.items ?? []) as any[];
    const myId = profile?._id ? String(profile._id) : "";
    const q = contactSearch.trim().toLowerCase();
    return items
      .filter((p) => String(p._id) !== myId)
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.companyName ?? ""} ${p.city ?? ""} ${p.country ?? ""} ${p.contactPerson ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const aUnread = conversationByPartner.get(String(a._id))?.unreadCount ?? 0;
        const bUnread = conversationByPartner.get(String(b._id))?.unreadCount ?? 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        const aHas = conversationByPartner.has(String(a._id)) ? 1 : 0;
        const bHas = conversationByPartner.has(String(b._id)) ? 1 : 0;
        if (aHas !== bHas) return bHas - aHas;
        return String(a.companyName ?? "").localeCompare(String(b.companyName ?? ""));
      });
  }, [contactsData, profile, contactSearch, conversationByPartner]);

  const activeChannel = isChannel ? (channels as any[]).find((c: any) => c._id === targetId) : null;
  const canPost = !isChannel || channelCanPost(activeChannel?.kind, user?.role, profile?.userType);
  const placeholder = !canPost
    ? activeChannel?.kind === "alert"
      ? "Only administrators can post alerts"
      : "Only companies and administrators can post announcements"
    : isDM
      ? `Message ${dmPartner?.companyName || "this contact"}...`
      : "Type a message...";

  const [newMsg, setNewMsg] = useState("");
  const [packageDrafts, setPackageDrafts] = useState<Record<string, string>>({});
  const sendMutation = useMutation({
    mutationFn: async (opts: { tenderId?: string; content?: string } = {}) => {
      const content = (opts?.content ?? newMsg).trim();
      if (!content) throw new Error("Enter a message");
      if (isDM && opts?.tenderId) {
        const vendorProfileId = profile?.userType === "vendor" ? String(profile._id) : String(targetId);
        const res = await fetch("/api/offer-thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenderId: opts.tenderId, vendorProfileId, content }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send");
        return data;
      }
      const url = isDM ? `/api/messages/dm/${targetId}` : `/api/messages/channel/${targetId}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      return data;
    },
    onSuccess: (_data, opts) => {
      if (opts?.tenderId) {
        setPackageDrafts((prev) => ({ ...prev, [opts.tenderId!]: "" }));
      } else {
        setNewMsg("");
      }
      qc.invalidateQueries({ queryKey: ["messages", isDM ? "dm" : "channel", targetId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["messages", "unread"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const directoryLabel = contactType === "company" ? "Companies" : contactType === "vendor" ? "Suppliers" : "Contacts";

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-in-up">
      <div className="w-72 shrink-0 space-y-4 overflow-y-auto pr-1">
        <div className="glass rounded-2xl p-3 border-0">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Channels</h3>
          {loadingChannels ? (
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
            </div>
          ) : (
            <div className="space-y-0.5">
              {(channels as any[]).map((c: any) => {
                const Icon = CHANNEL_ICONS[c.kind] ?? Hash;
                const active = isChannel && targetId === c._id;
                return (
                  <Link
                    key={c._id}
                    href={`/messages/channel/${c._id}`}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? "bg-primary/10 text-primary shadow-[0_0_14px_-6px_rgba(200,90,58,0.3)]"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="truncate">{c.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {contactType && (
          <div className="glass rounded-2xl p-3 border-0">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Direct Messages</h3>
            <p className="text-[11px] text-muted-foreground px-1 mb-2">
              {contactType === "company" ? "Message any registered EPC company." : "Message any registered supplier."}
            </p>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                placeholder={`Search ${directoryLabel.toLowerCase()}...`}
                className="h-9 pl-9 text-xs rounded-xl"
                id="dm-contact-search"
              />
            </div>
            {loadingContacts ? (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
              </div>
            ) : directory.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-2">No {directoryLabel.toLowerCase()} found.</p>
            ) : (
              <div className="space-y-0.5">
                {directory.map((p: any) => {
                  const id = String(p._id);
                  const conv = conversationByPartner.get(id);
                  const active = isDM && targetId === id;
                  return (
                    <Link
                      key={id}
                      href={`/messages/dm/${id}`}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-primary/10 text-primary shadow-[0_0_14px_-6px_rgba(200,90,58,0.3)]"
                          : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-muted shrink-0 flex items-center justify-center text-[10px] font-bold">
                        {p.companyName?.[0] ?? "?"}
                      </div>
                      <span className="truncate flex-1">{p.companyName ?? "Unknown"}</span>
                      {conv?.unreadCount > 0 && (
                        <span className="ml-auto bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 font-bold">{conv.unreadCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 border border-border rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-[var(--shadow-card)]">
        {!targetId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Select a channel or start a direct message</p>
              <p className="text-xs text-muted-foreground mt-1">
                {contactType === "vendor"
                  ? "Suppliers can message any registered EPC company."
                  : contactType === "company"
                    ? "Companies can message any registered supplier."
                    : "Information, Announcements, Alerts, and General are always available."}
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeChannel && (
              <div className="border-b border-border px-5 py-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = CHANNEL_ICONS[activeChannel.kind] ?? Hash;
                    return <Icon className="h-4 w-4 text-primary" />;
                  })()}
                  <h2 className="font-semibold text-sm text-foreground font-[family-name:var(--font-heading)]">{activeChannel.name}</h2>
                </div>
                {activeChannel.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{activeChannel.description}</p>
                )}
              </div>
            )}
            {isDM && (
              <div className="border-b border-border px-5 py-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-sm text-foreground font-[family-name:var(--font-heading)]">{dmPartner?.companyName || "Direct message"}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[dmPartner?.city, dmPartner?.country].filter(Boolean).join(", ") || "Private conversation"}
                </p>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
              ) : isDM ? (
                <div className="space-y-4">
                  {dmThreads.packages.map((pkg) => {
                    const typeKey = pkg.tender?.type as keyof typeof PROCUREMENT_TYPES | undefined;
                    const typeLabel = typeKey && PROCUREMENT_TYPES[typeKey] ? PROCUREMENT_TYPES[typeKey].label : "Package";
                    const draft = packageDrafts[pkg.id] ?? "";
                    return (
                      <div key={pkg.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                        <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] uppercase">{typeLabel}</Badge>
                              {pkg.tender?.status && (
                                <span className="text-[10px] text-muted-foreground capitalize">{String(pkg.tender.status).replace("_", " ")}</span>
                              )}
                            </div>
                            <div className="text-sm font-semibold text-foreground truncate mt-0.5">
                              {pkg.id !== "unknown" ? (
                                <Link href={`/tenders/${pkg.id}`} className="hover:text-primary transition-colors">
                                  {pkg.tender?.title || "Package conversation"}
                                </Link>
                              ) : (
                                pkg.tender?.title || "Package conversation"
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="p-3 space-y-3">
                          {pkg.messages.map((m: any) => (
                            <DirectMessageRow key={m._id} message={m} fallback={user?.role === "admin" ? "A" : "?"} />
                          ))}
                        </div>
                        {pkg.id !== "unknown" && (
                          <div className="border-t border-border p-2 flex gap-2">
                            <Input
                              value={draft}
                              onChange={(e) => setPackageDrafts((prev) => ({ ...prev, [pkg.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && draft.trim()) {
                                  e.preventDefault();
                                  sendMutation.mutate({ tenderId: pkg.id, content: draft });
                                }
                              }}
                              placeholder={`Reply on this ${typeLabel}...`}
                              className="h-9 text-xs rounded-xl"
                              id={`package-msg-${pkg.id}`}
                            />
                            <Button
                              size="icon"
                              className="h-9 w-9 rounded-xl"
                              disabled={!draft.trim() || sendMutation.isPending}
                              onClick={() => sendMutation.mutate({ tenderId: pkg.id, content: draft })}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 border-b border-border bg-muted/40">
                      <div className="text-sm font-semibold text-foreground font-[family-name:var(--font-heading)]">Direct messages</div>
                      <p className="text-[11px] text-muted-foreground">Not tied to an RFQ, RFP, or tender.</p>
                    </div>
                    <div className="p-3 space-y-3 min-h-[4.5rem]">
                      {dmThreads.general.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-6">No general messages yet.</p>
                      ) : (
                        dmThreads.general.map((m: any) => (
                          <DirectMessageRow key={m._id} message={m} fallback={user?.role === "admin" ? "A" : "?"} />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Send the first one.</p>
              ) : (
                (messages as any[]).map((m: any) => (
                  <DirectMessageRow key={m._id} message={m} fallback={user?.role === "admin" ? "A" : "?"} />
                ))
              )}
            </div>
            <div className="border-t border-border p-3 flex gap-2 bg-muted/30">
              <Input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newMsg.trim() && canPost) sendMutation.mutate({}); }}
                placeholder={isDM ? `General message to ${dmPartner?.companyName || "this contact"}...` : placeholder}
                id="message-input"
                className="flex-1 rounded-xl"
                disabled={!canPost}
              />
              <Button size="icon" className="rounded-xl" onClick={() => sendMutation.mutate({})} disabled={!canPost || !newMsg.trim() || sendMutation.isPending} id="send-message-btn">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DirectMessageRow({ message: m, fallback }: { message: any; fallback: string }) {
  if (m.isSystem) {
    return (
      <div className="py-1">
        <p className="text-sm text-primary whitespace-pre-wrap">{m.content}</p>
        <p className="text-xs text-primary/70 mt-0.5">
          {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
        {m.sender?.companyName?.[0] ?? fallback}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-foreground">{m.sender?.companyName ?? "Administrator"}</span>
          <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}</span>
        </div>
        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{m.content}</p>
      </div>
    </div>
  );
}
