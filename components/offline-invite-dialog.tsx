"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Loader2 } from "lucide-react";

type Props = {
  tenderId: string;
  tenderTitle: string;
  onInvited: () => void;
};

export function OfflineInviteDialog({ tenderId, tenderTitle, onInvited }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ supplierName: "", email: "", note: "" });

  const reset = () => {
    setError(null);
    setForm({ supplierName: "", email: "", note: "" });
  };

  const submit = async () => {
    setError(null);
    if (!form.supplierName.trim() || !form.email.trim()) {
      setError("Supplier company name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/offline-bids/${tenderId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName: form.supplierName.trim(),
          email: form.email.trim(),
          note: form.note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not record the invite");
        return;
      }
      setOpen(false);
      reset();
      onInvited();
    } catch {
      setError("Could not record the invite. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" id={`offline-invite-${tenderId}`}>
          <UserPlus className="h-3.5 w-3.5" /> Invite supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite offline supplier</DialogTitle>
          <DialogDescription>
            {tenderTitle} — record the supplier you emailed the workbook to. Approve the invite once sent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-supplier-name">Supplier company name</Label>
            <Input
              id="invite-supplier-name"
              value={form.supplierName}
              onChange={(e) => setForm((s) => ({ ...s, supplierName: e.target.value }))}
              placeholder="e.g. Gulf Mechanical Works LLC"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="Any email — including Gmail, Outlook, etc."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-note">Note (optional)</Label>
            <Textarea
              id="invite-note"
              rows={2}
              value={form.note}
              onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
              placeholder="e.g. Workbook emailed on 22 Aug, contact: Mr. Rao"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {submitting ? "Saving…" : "Record invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
