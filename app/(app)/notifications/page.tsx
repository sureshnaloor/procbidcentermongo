"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell, Trophy, XCircle, FileText, Package, MessageSquare, Mail, Clock,
  BadgeCheck, FileEdit, CheckCheck, Inbox,
} from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

function targetUrlFor(n: any): string {
  if (n.type === "message_received") return n.relatedId ? `/messages/dm/${n.relatedId}` : "/messages";
  if (n.relatedType === "tender" && n.relatedId) return `/tenders/${n.relatedId}`;
  if (n.relatedType === "bid" && n.relatedId) return `/bids/${n.relatedId}`;
  return "/dashboard";
}

function iconFor(type: string) {
  switch (type) {
    case "tender_awarded": return Trophy;
    case "tender_award_lost": return XCircle;
    case "tender_published": return FileText;
    case "bid_received":
    case "bid_status_changed": return Package;
    case "bid_deadline": return Clock;
    case "vendor_qualified": return BadgeCheck;
    case "message_received": return MessageSquare;
    case "tender_invite":
    case "invite_requested":
    case "invite_accepted":
    case "invite_declined": return Mail;
    case "revision_requested":
    case "revision_request_received":
    case "revision_request_declined": return FileEdit;
    default: return Bell;
  }
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");

  const { data } = useQuery({
    queryKey: ["notifications", "full"],
    queryFn: () => fetch("/api/notifications?limit=100").then((r) => (r.ok ? r.json() : [])),
    enabled: !!session,
  });
  const notifications: any[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visible = tab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const markAll = useMutation({
    mutationFn: () => fetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const openNotification = async (n: any) => {
    if (!n.isRead) {
      fetch(`/api/notifications/${n._id}/read`, { method: "POST" }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
    }
    router.push(targetUrlFor(n));
  };

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      <div className="pointer-events-none absolute -top-6 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.06] to-transparent rounded-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            id="mark-all-read-btn"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="relative flex items-center gap-2">
        {(["all", "unread"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              tab === t
                ? "bg-primary/10 text-primary shadow-[0_0_18px_-6px_rgba(193,80,46,0.4)]"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {t === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <Card className="glass card-3d border-0">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="font-semibold text-foreground">No notifications</div>
            <div className="text-sm text-muted-foreground mt-1">
              {tab === "unread" ? "No unread updates right now." : "Updates about tenders, bids and awards will appear here."}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-0 shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {visible.map((n: any) => {
                const isAwardWin = n.type === "tender_awarded";
                const isAwardLost = n.type === "tender_award_lost";
                const Icon = iconFor(n.type);
                return (
                  <button
                    key={n._id}
                    onClick={() => openNotification(n)}
                    className={`w-full text-left px-6 py-4 transition-colors ${
                      isAwardWin
                        ? "bg-amber-500/[0.07] border-l-2 border-l-amber-500/60 hover:bg-amber-500/[0.12]"
                        : `hover:bg-muted/40 ${!n.isRead ? "bg-primary/[0.04]" : ""}`
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isAwardWin
                            ? "bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-500/40"
                            : isAwardLost
                            ? "bg-muted/60 border border-border"
                            : "bg-primary/10"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            isAwardWin ? "text-amber-500" : isAwardLost ? "text-muted-foreground" : "text-primary"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm truncate ${n.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                            {n.title}
                          </span>
                          {isAwardWin && (
                            <span className="badge-celebrate-chip inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0">
                              <Trophy className="h-2.5 w-2.5" /> Won
                            </span>
                          )}
                          {!n.isRead && !isAwardWin && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" title="Unread" />
                          )}
                        </div>
                        {n.content && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</div>
                        )}
                        <div className="text-[11px] text-muted-foreground/70 mt-1">
                          {n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : ""}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
