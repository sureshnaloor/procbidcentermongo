"use client";

import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { clauseKey } from "@/lib/clauses";

interface LineItem { description: string; quantity: number; unit: string; unitPrice: number; deliveryDays?: number; notes?: string; }

export default function NewBidPage({ params }: { params: Promise<{ tenderId: string }> }) {
  const { tenderId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  useEffect(() => {
    if (profile && profile.userType && profile.userType !== "vendor") {
      router.replace(`/tenders/${tenderId}`);
    }
  }, [profile, router, tenderId]);

  const { data: tender, isLoading } = useQuery({
    queryKey: ["tender", tenderId],
    queryFn: () => fetch(`/api/tenders/${tenderId}`).then((r) => r.json()),
  });

  const [form, setForm] = useState({ totalPrice: "", currency: "USD", validityDays: "90", technicalProposal: "", commercialProposal: "", notes: "" });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit: "unit", unitPrice: 0 }]);
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  function setField(key: keyof typeof form, value: string) { setForm((p) => ({ ...p, [key]: value })); }

  function addLine() { setLineItems((p) => [...p, { description: "", quantity: 1, unit: "unit", unitPrice: 0 }]); }
  function removeLine(i: number) { setLineItems((p) => p.filter((_, idx) => idx !== i)); }
  function setLine(i: number, key: keyof LineItem, value: string | number) { setLineItems((p) => p.map((l, idx) => idx === i ? { ...l, [key]: value } : l)); }

  const submitMutation = useMutation({
    mutationFn: async (draft: boolean) => {
      if (!draft) {
        const required = (tender?.clauses ?? []).filter((c: any) => c.required);
        const missing = required.find((c: any) => !accepted[clauseKey(c)]);
        if (missing) throw new Error(`Please accept: ${missing.title}`);
      }
      const body = {
        tenderId,
        totalPrice: form.totalPrice ? parseFloat(form.totalPrice) : undefined,
        currency: form.currency,
        validityDays: parseInt(form.validityDays),
        technicalProposal: form.technicalProposal,
        commercialProposal: form.commercialProposal,
        notes: form.notes,
        clauseResponses: (tender?.clauses ?? []).map((c: any) => ({
          kind: c.kind,
          slug: c.slug,
          accepted: !!accepted[clauseKey(c)],
        })),
        lineItems: lineItems.filter((l) => l.description),
      };
      const res = await fetch("/api/bids", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!draft) {
        const submitRes = await fetch(`/api/bids/${data._id}/submit`, { method: "POST" });
        if (!submitRes.ok) throw new Error("Failed to submit bid");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("Offer created");
      qc.invalidateQueries({ queryKey: ["bids"] });
      router.push(`/bids/${data._id}`);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to create bid"),
  });

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!tender) return <div className="text-center py-16 text-muted-foreground">Tender not found</div>;
  if (profile && profile.userType === "vendor" && !tender.participation?.canPrepareOffer) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-muted-foreground">You can prepare an offer only after the company invites you or accepts your request.</p>
        <Link href={`/tenders/${tenderId}`} className="text-sm text-primary hover:underline">Back to tender</Link>
      </div>
    );
  }

  const lineTotal = lineItems.reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenders/${tenderId}`}><Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Prepare Offer</h1>
          <p className="text-sm text-muted-foreground">{tender.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing & Terms</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Total Price (optional)</Label>
            <Input type="number" value={form.totalPrice} onChange={(e) => setField("totalPrice", e.target.value)} placeholder="0.00" id="bid-total-price" />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input value={form.currency} onChange={(e) => setField("currency", e.target.value)} id="bid-currency" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Validity (days)</Label>
            <Input type="number" value={form.validityDays} onChange={(e) => setField("validityDays", e.target.value)} id="bid-validity" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Item</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-4"><Input placeholder="Description" value={line.description} onChange={(e) => setLine(i, "description", e.target.value)} /></div>
              <div className="col-span-2"><Input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => setLine(i, "quantity", parseFloat(e.target.value))} /></div>
              <div className="col-span-2"><Input placeholder="Unit" value={line.unit} onChange={(e) => setLine(i, "unit", e.target.value)} /></div>
              <div className="col-span-3"><Input type="number" placeholder="Unit price" value={line.unitPrice} onChange={(e) => setLine(i, "unitPrice", parseFloat(e.target.value))} /></div>
              <div className="col-span-1"><Button variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lineItems.length === 1}><Trash2 className="h-4 w-4 text-destructive/70" /></Button></div>
            </div>
          ))}
          {lineTotal > 0 && <div className="text-right text-sm font-semibold text-foreground dark:text-muted-foreground pt-2 border-t">Line Total: {lineTotal.toLocaleString()}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Proposals</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Technical Proposal</Label>
            <Textarea rows={4} value={form.technicalProposal} onChange={(e) => setField("technicalProposal", e.target.value)} id="bid-technical" />
          </div>
          <div className="space-y-1.5">
            <Label>Commercial Proposal</Label>
            <Textarea rows={4} value={form.commercialProposal} onChange={(e) => setField("commercialProposal", e.target.value)} id="bid-commercial" />
          </div>
          <div className="space-y-1.5">
            <Label>Additional Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setField("notes", e.target.value)} id="bid-notes" />
          </div>
        </CardContent>
      </Card>

      {(tender.clauses ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accept tender terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.clauses.map((c: any) => (
              <div key={clauseKey(c)} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{c.title}{c.required ? " *" : ""}</div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{c.body}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!accepted[clauseKey(c)]}
                    onChange={(e) => setAccepted((prev) => ({ ...prev, [clauseKey(c)]: e.target.checked }))}
                    id={`accept-${clauseKey(c)}`}
                  />
                  I accept these {c.title.toLowerCase()} terms
                </label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => submitMutation.mutate(true)} disabled={submitMutation.isPending} id="save-draft-btn">Save as Draft</Button>
        <Button onClick={() => submitMutation.mutate(false)} disabled={submitMutation.isPending} id="submit-bid-final-btn">
          {submitMutation.isPending ? <><Loader2 className="animate-spin" />Submitting...</> : "Submit Offer"}
        </Button>
      </div>
    </div>
  );
}
