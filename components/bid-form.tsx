"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { clauseKey } from "@/lib/clauses";
import { wordsDiffer } from "@/lib/text-diff";
import { ClauseDiffText } from "@/components/clause-diff";
import {
  CUSTOM_FIELD_SUGGESTIONS,
  DELIVERY_MODES,
  MAX_CUSTOM_FIELDS,
  MIN_QTY_CHANGE_REASON,
  quantityChangeError,
  type DeliveryMode,
} from "@/lib/bid-line";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OfferConfirmDialog, type OfferConfirmPayload } from "@/components/offer-confirm-dialog";
import { hasRegisteredDsc } from "@/lib/dsc";

interface CustomField {
  label: string;
  value: string;
}

interface LineItem {
  description: string;
  quantity: string;
  originalQuantity: number | null;
  quantityUnlocked: boolean;
  quantityChangeReason: string;
  unit: string;
  unitPrice: string;
  notes: string;
  deliveryMode: DeliveryMode;
  deliveryValue: string;
  deliveryDate: string;
  customFields: CustomField[];
}

function emptyLine(): LineItem {
  return {
    description: "",
    quantity: "1",
    originalQuantity: null,
    quantityUnlocked: true,
    quantityChangeReason: "",
    unit: "unit",
    unitPrice: "",
    notes: "",
    deliveryMode: "days",
    deliveryValue: "",
    deliveryDate: "",
    customFields: [],
  };
}

function lineFromStored(item: any): LineItem {
  let deliveryDate = "";
  if (item.deliveryDate) {
    const d = new Date(item.deliveryDate);
    if (!Number.isNaN(d.getTime())) deliveryDate = d.toISOString().slice(0, 10);
  }
  const originalQuantity = item.originalQuantity != null && Number.isFinite(Number(item.originalQuantity))
    ? Number(item.originalQuantity)
    : null;
  const quantity = item.quantity != null ? String(item.quantity) : "";
  const changed = originalQuantity != null && Number(item.quantity) !== originalQuantity;
  return {
    description: item.description || "",
    quantity,
    originalQuantity,
    quantityUnlocked: originalQuantity == null || changed,
    quantityChangeReason: item.quantityChangeReason || "",
    unit: item.unit || "unit",
    unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
    notes: item.notes || "",
    deliveryMode: (item.deliveryMode as DeliveryMode) || "days",
    deliveryValue: item.deliveryValue != null ? String(item.deliveryValue) : (item.deliveryDays != null ? String(item.deliveryDays) : ""),
    deliveryDate,
    customFields: Array.isArray(item.customFields)
      ? item.customFields.map((field: any) => ({ label: field.label || "", value: field.value || "" }))
      : [],
  };
}

type ClauseMode = "" | "accepted" | "conditional";

function parseAmount(value: string): number {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildPayload(tender: any, form: any, lineItems: LineItem[], clauseModes: Record<string, ClauseMode>, clauseBodies: Record<string, string>, lineTotal: number) {
  const currency = form.currency.trim() || "USD";
  return {
    tenderId: String(tender._id),
    totalPrice: form.totalPrice ? parseAmount(form.totalPrice) : (lineTotal || undefined),
    currency,
    validityDays: parseInt(form.validityDays, 10) || 90,
    technicalProposal: form.technicalProposal,
    commercialProposal: form.commercialProposal,
    notes: form.notes,
    clauseResponses: (tender?.clauses ?? []).map((c: any) => {
      const key = clauseKey(c);
      const mode = clauseModes[key] || "";
      const edited = clauseBodies[key] ?? c.body ?? "";
      const modified = mode === "conditional" && wordsDiffer(c.body, edited);
      return {
        kind: c.kind,
        slug: c.slug,
        accepted: mode === "accepted" || mode === "conditional",
        originalBody: c.body,
        proposedBody: modified ? edited : undefined,
      };
    }),
    lineItems: lineItems.filter((l) => l.description.trim()).map((l) => ({
      description: l.description.trim(),
      quantity: parseAmount(l.quantity),
      originalQuantity: l.originalQuantity ?? undefined,
      quantityChangeReason: l.quantityChangeReason.trim() || undefined,
      unit: l.unit.trim() || "unit",
      unitPrice: parseAmount(l.unitPrice),
      notes: l.notes.trim() || undefined,
      deliveryMode: l.deliveryMode,
      deliveryValue: l.deliveryMode !== "date" && l.deliveryValue ? parseAmount(l.deliveryValue) : undefined,
      deliveryDate: l.deliveryMode === "date" && l.deliveryDate ? l.deliveryDate : undefined,
      customFields: l.customFields
        .filter((field) => field.label.trim() && field.value.trim())
        .slice(0, MAX_CUSTOM_FIELDS)
        .map((field) => ({ label: field.label.trim(), value: field.value.trim() })),
    })),
  };
}

export function BidForm({ tender, bid, mode }: { tender: any; bid?: any; mode: "create" | "edit" }) {
  const router = useRouter();
  const qc = useQueryClient();
  const tenderId = String(tender._id);

  const [form, setForm] = useState({
    totalPrice: bid?.totalPrice != null ? String(bid.totalPrice) : "",
    currency: bid?.currency || tender.currency || "USD",
    validityDays: bid?.validityDays != null ? String(bid.validityDays) : "90",
    technicalProposal: bid?.technicalProposal || "",
    commercialProposal: bid?.commercialProposal || "",
    notes: bid?.notes || "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>(() => {
    if (Array.isArray(bid?.lineItems) && bid.lineItems.length > 0) {
      return bid.lineItems.map((item: any) => lineFromStored(item));
    }
    return [emptyLine()];
  });
  const [clauseModes, setClauseModes] = useState<Record<string, ClauseMode>>({});
  const [clauseBodies, setClauseBodies] = useState<Record<string, string>>({});
  const [boqSeeded, setBoqSeeded] = useState(mode === "edit");
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
  });

  useEffect(() => {
    if (boqSeeded || mode === "edit") return;
    if (!Array.isArray(tender?.boqItems) || tender.boqItems.length === 0) return;
    const seeded = tender.boqItems
      .filter((item: any) => item.description?.trim() && Number(item.quantity) > 0)
      .map((item: any) => ({
        ...emptyLine(),
        description: item.description,
        quantity: String(item.quantity),
        originalQuantity: Number(item.quantity),
        quantityUnlocked: false,
        unit: item.unit || "unit",
      }));
    if (seeded.length > 0) {
      setLineItems(seeded);
      setBoqSeeded(true);
      if (tender.currency) setForm((prev) => ({ ...prev, currency: prev.currency || tender.currency }));
    }
  }, [tender, boqSeeded, mode]);

  useEffect(() => {
    if (!Array.isArray(tender?.clauses)) return;
    setClauseBodies((prev) => {
      const next = { ...prev };
      for (const clause of tender.clauses) {
        const key = clauseKey(clause);
        if (next[key] === undefined) {
          const response = (bid?.clauseResponses ?? []).find((r: any) => clauseKey(r) === key);
          next[key] = response?.proposedBody || clause.body || "";
        }
      }
      return next;
    });
    setClauseModes((prev) => {
      const next = { ...prev };
      for (const clause of tender.clauses) {
        const key = clauseKey(clause);
        if (next[key] !== undefined) continue;
        const response = (bid?.clauseResponses ?? []).find((r: any) => clauseKey(r) === key);
        if (!response?.accepted) continue;
        next[key] = response.proposedBody && wordsDiffer(response.originalBody || clause.body, response.proposedBody)
          ? "conditional"
          : "accepted";
      }
      return next;
    });
  }, [tender, bid]);

  function setField(key: keyof typeof form, value: string) { setForm((p) => ({ ...p, [key]: value })); }
  function addLine() { setLineItems((p) => [...p, emptyLine()]); }
  function removeLine(i: number) { setLineItems((p) => p.filter((_, idx) => idx !== i)); }
  function setLine(i: number, patch: Partial<LineItem>) {
    setLineItems((p) => p.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function setCustomField(i: number, fieldIdx: number, patch: Partial<CustomField>) {
    setLineItems((p) => p.map((l, idx) => {
      if (idx !== i) return l;
      return { ...l, customFields: l.customFields.map((field, fi) => fi === fieldIdx ? { ...field, ...patch } : field) };
    }));
  }

  const currency = form.currency.trim() || "USD";
  const lineTotal = lineItems.reduce((sum, l) => sum + parseAmount(l.quantity) * parseAmount(l.unitPrice), 0);
  const computedTotal = lineTotal;

  function quantityIssue(line: LineItem) {
    if (line.originalQuantity == null) return null;
    return quantityChangeError({
      quantity: parseAmount(line.quantity),
      originalQuantity: line.originalQuantity,
      quantityChangeReason: line.quantityChangeReason,
    });
  }

  const mutation = useMutation({
    mutationFn: async (opts: { draft: boolean; preview?: boolean } & OfferConfirmPayload) => {
      const qtyIssue = lineItems.find((line) => line.description.trim() && quantityIssue(line));
      if (qtyIssue) {
        throw new Error(`${qtyIssue.description || "A line item"}: ${quantityIssue(qtyIssue)}`);
      }
      if (!opts.draft) {
        const required = (tender?.clauses ?? []).filter((c: any) => c.required);
        const missing = required.find((c: any) => {
          const mode = clauseModes[clauseKey(c)];
          return mode !== "accepted" && mode !== "conditional";
        });
        if (missing) throw new Error(`Please accept or accept with conditions: ${missing.title}`);
      }
      const payload = buildPayload(tender, form, lineItems, clauseModes, clauseBodies, lineTotal);
      const url = mode === "edit" ? `/api/bids/${bid._id}` : "/api/bids";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save offer");
      const bidId = data._id || bid?._id;
      if (!opts.draft) {
        const submitRes = await fetch(`/api/bids/${bidId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signWithDsc: opts.signWithDsc,
            signedPdfName: opts.signedPdfName,
            signedPdfBase64: opts.signedPdfBase64,
          }),
        });
        const submitData = await submitRes.json().catch(() => ({}));
        if (!submitRes.ok) throw new Error(submitData.error || "Failed to submit offer");
      }
      return { ...data, _id: bidId, draft: opts.draft, preview: Boolean(opts.preview) };
    },
    onSuccess: (data) => {
      setSubmitOpen(false);
      toast.success(data.preview ? "Draft saved — opening preview" : data.draft ? "Draft saved" : "Offer submitted");
      qc.invalidateQueries({ queryKey: ["bids"] });
      qc.invalidateQueries({ queryKey: ["bid", data._id] });
      qc.invalidateQueries({ queryKey: ["tender", tenderId] });
      router.push(data.preview ? `/bids/${data._id}/preview` : `/bids/${data._id}`);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save offer"),
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={mode === "edit" ? `/bids/${bid._id}` : `/tenders/${tenderId}`}>
          <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{mode === "edit" ? "Modify Offer" : "Prepare Offer"}</h1>
          <p className="text-sm text-muted-foreground">{tender.title}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pricing & Terms</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bid-currency">Currency</Label>
            <Input value={form.currency} onChange={(e) => setField("currency", e.target.value)} id="bid-currency" placeholder="USD" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bid-validity">Validity (days)</Label>
            <Input type="number" value={form.validityDays} onChange={(e) => setField("validityDays", e.target.value)} id="bid-validity" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bid-total-price">Offer total (optional override)</Label>
            <Input type="number" value={form.totalPrice} onChange={(e) => setField("totalPrice", e.target.value)} placeholder={computedTotal ? formatAmount(computedTotal) : "0.00"} id="bid-total-price" />
            <p className="text-[11px] text-muted-foreground">Leave blank to use the sum of line totals ({currency} {formatAmount(computedTotal)}).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Line Items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Add Item</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {boqSeeded && mode === "create" && (
            <p className="text-xs text-muted-foreground">Quantities were copied from the buyer&apos;s BOQ. Use Change quantity if you must quote a different MOQ or packing quantity, and give a justification.</p>
          )}
          {lineItems.map((line, i) => {
            const qty = parseAmount(line.quantity);
            const unitPrice = parseAmount(line.unitPrice);
            const total = qty * unitPrice;
            const locked = line.originalQuantity != null && !line.quantityUnlocked;
            const qtyChanged = line.originalQuantity != null && qty !== line.originalQuantity;
            const qtyError = quantityIssue(line);
            return (
              <div key={i} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Label htmlFor={`line-desc-${i}`}>Description</Label>
                    <Input id={`line-desc-${i}`} placeholder="Material or service" value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="mt-6 shrink-0" onClick={() => removeLine(i)} disabled={lineItems.length === 1}>
                    <Trash2 className="h-4 w-4 text-destructive/70" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`line-qty-${i}`}>Quantity</Label>
                      {line.originalQuantity != null && (
                        locked ? (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-primary hover:underline"
                            onClick={() => setLine(i, { quantityUnlocked: true })}
                            id={`change-qty-${i}`}
                          >
                            Change quantity
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground hover:underline"
                            onClick={() => setLine(i, {
                              quantityUnlocked: false,
                              quantity: String(line.originalQuantity),
                              quantityChangeReason: "",
                            })}
                            id={`reset-qty-${i}`}
                          >
                            Use original qty
                          </button>
                        )
                      )}
                    </div>
                    <Input
                      id={`line-qty-${i}`}
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0"
                      value={line.quantity}
                      disabled={locked}
                      onChange={(e) => setLine(i, { quantity: e.target.value })}
                    />
                    {line.originalQuantity != null && (
                      <p className="text-[11px] text-muted-foreground">
                        Invited qty: {line.originalQuantity}
                        {qtyChanged ? ` → ${qty || 0}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`line-unit-${i}`}>Unit</Label>
                    <Input id={`line-unit-${i}`} placeholder="e.g. NOS, m, kg" value={line.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`line-price-${i}`}>Unit price ({currency})</Label>
                    <Input id={`line-price-${i}`} type="number" min={0} step="any" placeholder="0.00" value={line.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Total line item price ({currency})</Label>
                    <div className="h-9 px-3 flex items-center rounded-lg border border-input bg-accent/40 text-sm font-semibold">
                      {formatAmount(total)}
                    </div>
                  </div>
                </div>
                {line.originalQuantity != null && line.quantityUnlocked && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`line-qty-reason-${i}`}>
                      Quantity change justification{qtyChanged ? " (required)" : ""}
                    </Label>
                    <Textarea
                      id={`line-qty-reason-${i}`}
                      rows={2}
                      placeholder="e.g. Minimum order quantity is 50 NOS / packing is in lots of 12"
                      value={line.quantityChangeReason}
                      onChange={(e) => setLine(i, { quantityChangeReason: e.target.value })}
                    />
                    <p className={`text-[11px] ${qtyError ? "text-destructive" : "text-muted-foreground"}`}>
                      {qtyError || `Required when the offered quantity differs from the invited quantity (min ${MIN_QTY_CHANGE_REASON} characters). Line and bid totals update automatically.`}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Delivery</Label>
                    <Select value={line.deliveryMode} onValueChange={(v) => setLine(i, { deliveryMode: v as DeliveryMode })}>
                      <SelectTrigger id={`line-delivery-mode-${i}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {line.deliveryMode === "date" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor={`line-delivery-date-${i}`}>Delivery date</Label>
                      <Input
                        id={`line-delivery-date-${i}`}
                        type="date"
                        value={line.deliveryDate}
                        onChange={(e) => setLine(i, { deliveryDate: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor={`line-delivery-value-${i}`}>
                        {line.deliveryMode === "weeks" ? "Number of weeks" : line.deliveryMode === "working_weeks" ? "Number of working weeks" : "Number of days"}
                      </Label>
                      <Input
                        id={`line-delivery-value-${i}`}
                        type="number"
                        min={1}
                        step={1}
                        placeholder="e.g. 14"
                        value={line.deliveryValue}
                        onChange={(e) => setLine(i, { deliveryValue: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`line-notes-${i}`}>Remarks</Label>
                  <Textarea id={`line-notes-${i}`} rows={2} placeholder="Exceptions, packing, make, or other remarks for this item" value={line.notes} onChange={(e) => setLine(i, { notes: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Custom data</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={line.customFields.length >= MAX_CUSTOM_FIELDS}
                      onClick={() => setLine(i, { customFields: [...line.customFields, { label: "", value: "" }] })}
                    >
                      <Plus className="h-4 w-4" /> Add field
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Up to {MAX_CUSTOM_FIELDS} free-text labels, e.g. country of origin, OEM, brand, part/catalog number, vendor approval number.</p>
                  {line.customFields.map((field, fi) => (
                    <div key={fi} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-5"
                        list={`custom-label-suggestions-${i}`}
                        placeholder="Label"
                        value={field.label}
                        onChange={(e) => setCustomField(i, fi, { label: e.target.value })}
                      />
                      <Input
                        className="col-span-6"
                        placeholder="Value"
                        value={field.value}
                        onChange={(e) => setCustomField(i, fi, { value: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="col-span-1"
                        onClick={() => setLine(i, { customFields: line.customFields.filter((_, idx) => idx !== fi) })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive/70" />
                      </Button>
                    </div>
                  ))}
                  <datalist id={`custom-label-suggestions-${i}`}>
                    {CUSTOM_FIELD_SUGGESTIONS.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
            <span className="text-muted-foreground">Sum of line items ({currency})</span>
            <span className="font-semibold text-foreground">{formatAmount(lineTotal)}</span>
          </div>
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
            <p className="text-xs text-muted-foreground mt-1">You can accept a clause as written, or accept it with conditions by editing the text. Edited wording is shown in red.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.clauses.map((c: any) => {
              const key = clauseKey(c);
              const clauseMode = clauseModes[key] || "";
              const edited = clauseBodies[key] ?? c.body ?? "";
              const modified = clauseMode === "conditional" && wordsDiffer(c.body, edited);
              return (
                <div key={key} className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{c.title}{c.required ? " *" : ""}</div>
                    {modified && <Badge variant="destructive">Edited</Badge>}
                    {clauseMode === "accepted" && <Badge variant="success">Accepted as written</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{c.body}</p>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`clause-mode-${key}`}
                        checked={clauseMode === "accepted"}
                        onChange={() => setClauseModes((prev) => ({ ...prev, [key]: "accepted" }))}
                        id={`accept-${key}`}
                      />
                      Accept as written
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`clause-mode-${key}`}
                        checked={clauseMode === "conditional"}
                        onChange={() => {
                          setClauseModes((prev) => ({ ...prev, [key]: "conditional" }));
                          setClauseBodies((prev) => ({ ...prev, [key]: prev[key] ?? c.body ?? "" }));
                        }}
                        id={`accept-conditions-${key}`}
                      />
                      Accept with conditions (edit the terms)
                    </label>
                  </div>
                  {clauseMode === "conditional" && (
                    <div className="space-y-2">
                      <Label htmlFor={`clause-edit-${key}`}>Proposed terms</Label>
                      <Textarea
                        id={`clause-edit-${key}`}
                        rows={8}
                        value={edited}
                        onChange={(e) => setClauseBodies((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                      {modified && (
                        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm">
                          <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Changes vs original (red = your wording)</div>
                          <ClauseDiffText original={c.body || ""} proposed={edited} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => mutation.mutate({ draft: true, preview: true })} disabled={mutation.isPending} id="preview-bid-btn">
          <Eye className="h-4 w-4" /> Preview
        </Button>
        <Button variant="outline" onClick={() => mutation.mutate({ draft: true })} disabled={mutation.isPending} id="save-draft-btn">Save as Draft</Button>
        <Button onClick={() => setSubmitOpen(true)} disabled={mutation.isPending} id="submit-bid-final-btn">
          {mutation.isPending ? <><Loader2 className="animate-spin" />Saving...</> : "Submit Offer"}
        </Button>
      </div>
      {!hasRegisteredDsc(profile?.dsc) && (
        <p className="text-xs text-muted-foreground text-right">
          To digitally sign offers, register your DSC in{" "}
          <Link href="/settings?tab=profile" className="text-primary hover:underline">Settings</Link>.
        </p>
      )}

      <OfferConfirmDialog
        open={submitOpen}
        kind="submit"
        dsc={profile?.dsc}
        pending={mutation.isPending}
        onOpenChange={setSubmitOpen}
        onProceed={(payload) => mutation.mutate({ draft: false, ...payload })}
      />
    </div>
  );
}
