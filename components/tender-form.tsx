"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Trash2, FileText, Calendar, Upload, Plus, AlertCircle, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { clauseKey, makeCustomSlug } from "@/lib/clauses";
import {
  DEFAULT_PROCUREMENT_TYPE,
  PROCUREMENT_TYPES,
  TENDER_DOCUMENT_CATEGORIES,
  defaultDocumentCategory,
  getPublishBlockers,
  getPublishDateIssues,
} from "@/lib/procurement";
import type { TenderDocumentCategory, TenderType } from "@/lib/types";
import { INCOTERMS } from "@/lib/incoterms";
import { PublishConfirmDialog } from "@/components/publish-confirm-dialog";
import { downloadBoqFile, readFileAsDataUrl } from "@/lib/boq-browser";

interface TenderFormProps {
  mode: "create" | "edit";
  tender?: any;
}

interface SelectedFile {
  category: TenderDocumentCategory;
  fileName: string;
  fileType: string;
  fileBase64: string;
  fileSize: number;
}

interface BoqLine {
  lineCode?: string;
  description: string;
  quantity: number;
  unit: string;
}

const TYPE_ORDER: TenderType[] = ["rfq", "rfp", "tender"];

export function TenderForm({ mode, tender }: TenderFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (session as any)?.user?.role === "admin";
  const isDraft = mode === "create" || tender?.status === "draft";

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: DEFAULT_PROCUREMENT_TYPE as TenderType,
    bidDeadline: "",
    deliveryDeadline: "",
    estimatedValue: "",
    currency: "USD",
    incoterm: "",
    incotermPlace: "",
    location: "",
    requirements: "",
    termsConditions: "",
    statusRemarks: "",
    groupIds: [] as string[],
  });

  const [clauses, setClauses] = useState<{ kind: string; slug?: string; templateId?: string; title: string; body: string; required: boolean; included: boolean }[]>([]);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [fileCategory, setFileCategory] = useState<TenderDocumentCategory>(defaultDocumentCategory(DEFAULT_PROCUREMENT_TYPE));
  const [boqItems, setBoqItems] = useState<BoqLine[]>([{ lineCode: "BOQ-001", description: "", quantity: 1, unit: "unit" }]);
  const [boqBusy, setBoqBusy] = useState(false);
  const [pendingType, setPendingType] = useState<TenderType | null>(null);
  const [saveIntent, setSaveIntent] = useState<"draft" | "publish">("draft");
  const [publishOpen, setPublishOpen] = useState(false);

  const { data: groupsWithTypes = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["master", "groups-with-types"],
    queryFn: () => fetch("/api/master/groups-with-types").then((r) => r.json()),
  });

  const catalog = Array.isArray(groupsWithTypes) ? groupsWithTypes : [];
  const materialGroups = catalog
    .filter((t: any) => t.category === "material")
    .flatMap((t: any) => t.groups ?? []);
  const serviceGroups = catalog
    .filter((t: any) => t.category === "service")
    .flatMap((t: any) => t.groups ?? []);
  const hasGroups = materialGroups.length > 0 || serviceGroups.length > 0;

  const { data: templateData } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetch("/api/templates").then((r) => r.json()),
  });

  useEffect(() => {
    if (tender && mode === "edit") {
      const nextType = (tender.type || DEFAULT_PROCUREMENT_TYPE) as TenderType;
      setForm({
        title: tender.title || "",
        description: tender.description || "",
        type: nextType,
        bidDeadline: tender.bidDeadline ? new Date(tender.bidDeadline).toISOString().split("T")[0] : "",
        deliveryDeadline: tender.deliveryDeadline ? new Date(tender.deliveryDeadline).toISOString().split("T")[0] : "",
        estimatedValue: tender.estimatedValue !== undefined ? String(tender.estimatedValue) : "",
        currency: tender.currency || "USD",
        incoterm: tender.incoterm || "",
        incotermPlace: tender.incotermPlace || "",
        location: tender.location || "",
        requirements: tender.requirements || "",
        termsConditions: tender.termsConditions || "",
        statusRemarks: tender.statusRemarks || "",
        groupIds: Array.isArray(tender.groupIds) ? tender.groupIds.map((g: any) => String(g)) : [],
      });
      setFileCategory(defaultDocumentCategory(nextType));
      if (Array.isArray(tender.clauses) && tender.clauses.length > 0) {
        setClauses(tender.clauses.map((c: any) => ({ ...c, included: true })));
      }
      if (Array.isArray(tender.boqItems) && tender.boqItems.length > 0) {
        setBoqItems(tender.boqItems.map((item: any) => ({
          lineCode: item.lineCode || "",
          description: item.description || "",
          quantity: Number(item.quantity) || 1,
          unit: item.unit || "unit",
        })));
      }
    }
  }, [tender, mode]);

  useEffect(() => {
    if (mode === "create" && clauses.length === 0 && Array.isArray(templateData?.resolved)) {
      const seeded = templateData.resolved.map((t: any) => ({
        kind: t.kind,
        slug: t.slug,
        templateId: t._id ? String(t._id) : undefined,
        title: t.title,
        body: t.body,
        required: true,
        included: true,
      }));
      const custom = (templateData.custom ?? []).map((t: any) => ({
        kind: "custom" as const,
        slug: t.slug,
        templateId: t._id ? String(t._id) : undefined,
        title: t.title,
        body: t.body,
        required: true,
        included: true,
      }));
      setClauses([...seeded, ...custom]);
    }
  }, [mode, templateData, clauses.length]);

  function setField(key: keyof typeof form, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyType(next: TenderType) {
    setForm((prev) => ({ ...prev, type: next }));
    setFileCategory(defaultDocumentCategory(next));
  }

  function requestTypeChange(next: TenderType) {
    if (next === form.type) return;
    if (next === "rfq") {
      applyType(next);
      return;
    }
    setPendingType(next);
  }

  const handleGroupToggle = (groupId: string) => {
    setForm((prev) => {
      const exists = prev.groupIds.includes(groupId);
      return {
        ...prev,
        groupIds: exists
          ? prev.groupIds.filter((id) => id !== groupId)
          : [...prev.groupIds, groupId],
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    Array.from(selectedFiles).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 20MB limit`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFiles((prev) => [
          ...prev,
          {
            category: fileCategory,
            fileName: file.name,
            fileType: file.type || file.name.split(".").pop() || "",
            fileBase64: base64String,
            fileSize: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const nextBoqCode = (items: BoqLine[]) => {
    const nums = items
      .map((item) => Number(String(item.lineCode || "").replace(/\D/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);
    return `BOQ-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
  };

  const downloadBoqTemplate = async () => {
    try {
      setBoqBusy(true);
      if (mode === "edit" && tender?._id) {
        await downloadBoqFile(`/api/tenders/${tender._id}/boq-file`, "BOQ.xlsx");
      } else {
        await downloadBoqFile("/api/boq/template", "ProcBid-BOQ-template.xlsx");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download BOQ template");
    } finally {
      setBoqBusy(false);
    }
  };

  const handleBoqUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setBoqBusy(true);
      const fileBase64 = await readFileAsDataUrl(file);
      const res = await fetch("/api/boq/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "company", fileName: file.name, fileBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not parse BOQ");
      const items = Array.isArray(data.items) ? data.items : [];
      setBoqItems(items.length ? items : [{ lineCode: "BOQ-001", description: "", quantity: 1, unit: "unit" }]);
      setFiles((prev) => [
        ...prev.filter((f) => f.fileName !== file.name),
        {
          category: "boq",
          fileName: file.name,
          fileType: file.type || file.name.split(".").pop() || "",
          fileBase64,
          fileSize: file.size,
        },
      ]);
      toast.success(`Loaded ${items.length} BOQ line${items.length === 1 ? "" : "s"} from ${file.name}`);
      for (const warning of data.warnings ?? []) toast.message(warning);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload BOQ");
    } finally {
      setBoqBusy(false);
    }
  };

  const validBoqItems = boqItems.filter((item) => item.description.trim() && Number(item.quantity) > 0);
  const allDocuments = [
    ...(tender?.documents ?? []),
    ...files.map((f) => ({ category: f.category })),
  ];
  const publishBlockers = getPublishBlockers({
    type: form.type,
    documents: allDocuments,
    boqItems: validBoqItems,
  });
  const publishDates = getPublishDateIssues(form.bidDeadline || null, form.deliveryDeadline || null);
  const allPublishBlockers = [...publishBlockers, ...publishDates.blockers];
  const typeMeta = PROCUREMENT_TYPES[form.type];
  const showBoqEditor = form.type === "rfq" || form.type === "tender";

  const mutation = useMutation({
    mutationFn: async (intent: "draft" | "publish") => {
      const payload = {
        ...form,
        status: intent === "publish" || !isDraft ? undefined : "draft",
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
        incoterm: form.incoterm ? form.incoterm : (mode === "edit" ? null : undefined),
        incotermPlace: form.incoterm ? form.incotermPlace.trim() || undefined : undefined,
        clauses: clauses.filter((c) => c.included).map(({ kind, slug, title, body, required }) => ({ kind, slug, title, body, required })),
        boqItems: validBoqItems.map((item, i) => ({
          lineCode: item.lineCode?.trim() || `BOQ-${String(i + 1).padStart(3, "0")}`,
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim() || "unit",
        })),
        documents: files.map(({ category, fileName, fileType, fileBase64 }) => ({
          category,
          fileName,
          fileType,
          fileBase64,
        })),
      };

      if (intent === "publish" && isDraft) {
        payload.status = "published";
      }

      const url = mode === "create" ? "/api/tenders" : `/api/tenders/${tender._id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save tender");
      }
      return data;
    },
    onSuccess: (data, intent) => {
      setPublishOpen(false);
      const publishedNow = intent === "publish" && isDraft;
      toast.success(
        publishedNow
          ? `${typeMeta.label} published successfully`
          : mode === "create" || isDraft
            ? "Saved as draft"
            : "Tender updated successfully"
      );
      qc.invalidateQueries({ queryKey: ["tenders"] });
      qc.invalidateQueries({ queryKey: ["tender", data._id] });
      router.push(`/tenders/${data._id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save tender");
    },
  });

  const validateBase = () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (form.groupIds.length === 0) {
      toast.error("Please select at least one material/service group");
      return false;
    }
    if (!hasGroups) {
      toast.error("No material or service groups are available yet");
      return false;
    }
    return true;
  };

  const handleSaveDraft = () => {
    if (!validateBase()) return;
    setSaveIntent("draft");
    mutation.mutate("draft");
  };

  const handlePublish = () => {
    if (!validateBase()) return;
    if (allPublishBlockers.length > 0) {
      toast.error(allPublishBlockers[0]);
      return;
    }
    setPublishOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDraft) handleSaveDraft();
    else {
      if (!validateBase()) return;
      setSaveIntent("draft");
      mutation.mutate("draft");
    }
  };

  const requiredCategoryHint = useMemo(() => {
    if (form.type === "rfq") return "Required to publish: BOQ line items with quantities, or a BOQ file.";
    if (form.type === "rfp") return "Required to publish: a complete scope document.";
    return "Required to publish: a compliance / tender terms document.";
  }, [form.type]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up" id="tender-form">
      <Card className="glass border-0">
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tender-title">{typeMeta.label} Title</Label>
            <Input
              id="tender-title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="e.g. EPC Construction of Solar Substation"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tender-type">Procurement Type</Label>
              <Select value={form.type} onValueChange={(v) => requestTypeChange(v as TenderType)}>
                <SelectTrigger id="tender-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ORDER.map((type) => (
                    <SelectItem key={type} value={type}>
                      {PROCUREMENT_TYPES[type].fullLabel}
                      {type === "rfq" ? " — default" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tender-location">Delivery Location</Label>
              <Input
                id="tender-location"
                value={form.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="e.g. Texas, USA"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-accent/40 p-3 text-sm text-foreground">
            <div className="font-medium">{typeMeta.fullLabel}</div>
            <p className="text-muted-foreground mt-1">{typeMeta.summary}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tender-desc">Description</Label>
            <Textarea
              id="tender-desc"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Provide a detailed description of the project..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-0">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-sm text-foreground">Deadlines & Value</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bid-deadline" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Bid Submission Deadline
              </Label>
              <Input
                id="bid-deadline"
                type="date"
                value={form.bidDeadline}
                onChange={(e) => setField("bidDeadline", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Required to publish. Must be a future date.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delivery-deadline" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Project Delivery Deadline
              </Label>
              <Input
                id="delivery-deadline"
                type="date"
                value={form.deliveryDeadline}
                onChange={(e) => setField("deliveryDeadline", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Required to publish. Must be in the future and on or after the bid deadline.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="est-value">Estimated Value</Label>
              <Input
                id="est-value"
                type="number"
                value={form.estimatedValue}
                onChange={(e) => setField("estimatedValue", e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
                placeholder="USD"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="incoterm">Incoterm (2020)</Label>
              <Select value={form.incoterm} onValueChange={(v) => setField("incoterm", v === "none" ? "" : v)}>
                <SelectTrigger id="incoterm">
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  <SelectGroup>
                    <SelectLabel>Any mode of transport</SelectLabel>
                    {INCOTERMS.filter((t) => t.transport === "any").map((t) => (
                      <SelectItem key={t.code} value={t.code}>{t.code} — {t.name}</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Sea & inland waterway</SelectLabel>
                    {INCOTERMS.filter((t) => t.transport === "sea").map((t) => (
                      <SelectItem key={t.code} value={t.code}>{t.code} — {t.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {form.incoterm && (
                <p className="text-[11px] text-muted-foreground">{INCOTERMS.find((t) => t.code === form.incoterm)?.hint}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="incoterm-place">Named place / port</Label>
              <Input
                id="incoterm-place"
                value={form.incotermPlace}
                onChange={(e) => setField("incotermPlace", e.target.value)}
                placeholder={form.incoterm ? "e.g. Jebel Ali Port" : "Choose an incoterm first"}
                disabled={!form.incoterm}
              />
              {form.incoterm && !form.incotermPlace.trim() && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">Add the named port or place for {form.incoterm}.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-0">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Material & Service Groups</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Select at least one group relevant to this package</p>
          </div>

          {loadingGroups ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading master data categories...</span>
            </div>
          ) : !hasGroups ? (
            <div className="rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">
              No material or service groups are configured yet.
              {isAdmin ? (
                <Link href="/admin/masters" className="ml-1 text-primary hover:underline">
                  Add them in Global Masters
                </Link>
              ) : (
                <span> Ask an administrator to add groups in Global Masters.</span>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {materialGroups.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Material Groups</div>
                  <div className="flex flex-wrap gap-2">
                    {materialGroups.map((g: any) => {
                      const isSelected = form.groupIds.includes(g._id);
                      return (
                        <button
                          key={g._id}
                          type="button"
                          onClick={() => handleGroupToggle(g._id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-card border-input text-foreground hover:bg-accent"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {serviceGroups.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Groups</div>
                  <div className="flex flex-wrap gap-2">
                    {serviceGroups.map((g: any) => {
                      const isSelected = form.groupIds.includes(g._id);
                      return (
                        <button
                          key={g._id}
                          type="button"
                          onClick={() => handleGroupToggle(g._id)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-card border-input text-foreground hover:bg-accent"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showBoqEditor && (
        <Card className="glass border-0">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  Bill of Quantities
                  {form.type === "rfq" ? <span className="text-destructive ml-1">*</span> : null}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {form.type === "rfq"
                    ? "Upload an Excel/CSV BOQ or add lines here. An RFQ cannot be published until a BOQ is attached."
                    : "Optional for tenders. Upload Excel/CSV or type materials and service quantities."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={downloadBoqTemplate} disabled={boqBusy} id="download-boq-template-btn">
                  {boqBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download template
                </Button>
                <Label
                  htmlFor="boq-file-upload"
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-input text-sm font-medium cursor-pointer hover:bg-accent"
                >
                  <Upload className="h-4 w-4" />
                  Upload BOQ
                </Label>
                <input
                  id="boq-file-upload"
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={handleBoqUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBoqItems((prev) => [...prev, { lineCode: nextBoqCode(prev), description: "", quantity: 1, unit: "unit" }])}
                >
                  <Plus className="h-4 w-4" /> Add line
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                <div className="col-span-2">Code</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-1" />
              </div>
              {boqItems.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input
                    className="col-span-4 sm:col-span-2 font-mono text-xs"
                    placeholder="BOQ-001"
                    value={line.lineCode || ""}
                    onChange={(e) => setBoqItems((prev) => prev.map((item, idx) => idx === i ? { ...item, lineCode: e.target.value } : item))}
                  />
                  <Input
                    className="col-span-12 sm:col-span-5"
                    placeholder="Material or service description"
                    value={line.description}
                    onChange={(e) => setBoqItems((prev) => prev.map((item, idx) => idx === i ? { ...item, description: e.target.value } : item))}
                  />
                  <Input
                    className="col-span-5 sm:col-span-2"
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    onChange={(e) => setBoqItems((prev) => prev.map((item, idx) => idx === i ? { ...item, quantity: Number(e.target.value) } : item))}
                  />
                  <Input
                    className="col-span-5 sm:col-span-2"
                    placeholder="unit"
                    value={line.unit}
                    onChange={(e) => setBoqItems((prev) => prev.map((item, idx) => idx === i ? { ...item, unit: e.target.value } : item))}
                  />
                  <div className="col-span-2 sm:col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setBoqItems((prev) => prev.length === 1 ? [{ lineCode: "BOQ-001", description: "", quantity: 1, unit: "unit" }] : prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass border-0">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Standard Terms (editable templates)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Seeded terms plus your company&apos;s private custom terms. Custom terms stay in your library and cannot be copied by other EPC companies.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                const title = "Custom term";
                setClauses((prev) => [
                  ...prev,
                  {
                    kind: "custom",
                    slug: makeCustomSlug(title),
                    title,
                    body: "",
                    required: true,
                    included: true,
                  },
                ]);
              }}
            >
              <Plus className="h-4 w-4" /> Add custom term
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tender-reqs">Requirements & Qualifications</Label>
            <Textarea
              id="tender-reqs"
              value={form.requirements}
              onChange={(e) => setField("requirements", e.target.value)}
              placeholder="e.g. ISO 9001 certified, min 5 years experience..."
              rows={3}
            />
          </div>
          {clauses.map((clause, idx) => (
            <div key={clauseKey(clause) + idx} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-medium min-w-0">
                  <input
                    type="checkbox"
                    checked={clause.included}
                    onChange={(e) => setClauses((prev) => prev.map((c, i) => i === idx ? { ...c, included: e.target.checked } : c))}
                  />
                  {clause.kind === "custom" ? (
                    <Input
                      className="h-8"
                      value={clause.title}
                      onChange={(e) => setClauses((prev) => prev.map((c, i) => i === idx ? { ...c, title: e.target.value } : c))}
                      placeholder="Custom term title"
                    />
                  ) : (
                    clause.title
                  )}
                </label>
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={clause.required}
                      onChange={(e) => setClauses((prev) => prev.map((c, i) => i === idx ? { ...c, required: e.target.checked } : c))}
                    />
                    Required
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={async () => {
                      const url = clause.kind === "custom" && clause.templateId
                        ? `/api/templates/${clause.templateId}`
                        : "/api/templates";
                      const method = clause.kind === "custom" && clause.templateId ? "PUT" : "POST";
                      const res = await fetch(url, {
                        method,
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ kind: clause.kind, title: clause.title, body: clause.body }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok) {
                        if (data?._id) {
                          setClauses((prev) => prev.map((c, i) => i === idx ? { ...c, templateId: String(data._id), slug: data.slug || c.slug } : c));
                        }
                        qc.invalidateQueries({ queryKey: ["templates"] });
                        toast.success(`Saved ${clause.title} to your library`);
                      } else {
                        toast.error(data.error || "Could not save template");
                      }
                    }}
                  >
                    Save to library
                  </Button>
                  {clause.kind === "custom" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setClauses((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                    </Button>
                  )}
                </div>
              </div>
              {clause.included && (
                <Textarea
                  rows={6}
                  value={clause.body}
                  onChange={(e) => setClauses((prev) => prev.map((c, i) => i === idx ? { ...c, body: e.target.value } : c))}
                  id={`clause-${clauseKey(clause)}`}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {mode === "edit" && (
        <Card className="glass border-0">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Remarks & Notes</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Additional outcome notes, closure/cancellation remarks, or package notes</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status-remarks">Remarks</Label>
              <Textarea
                id="status-remarks"
                value={form.statusRemarks}
                onChange={(e) => setField("statusRemarks", e.target.value)}
                placeholder="Remarks or notes..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass border-0">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-foreground">Attachments</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{requiredCategoryHint} Max 20MB per file.</p>
          </div>

          {tender?.documents?.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Existing Documents</Label>
              <div className="grid gap-2">
                {tender.documents.map((d: any) => (
                  <div key={d.storedName} className="flex items-center gap-2 text-xs p-2 rounded bg-accent border border-border">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 truncate">{d.name}</span>
                    <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="space-y-1.5 flex-1 w-full">
              <Label>Document Category</Label>
              <Select value={fileCategory} onValueChange={(v) => setFileCategory(v as TenderDocumentCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENDER_DOCUMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                      {cat.value === defaultDocumentCategory(form.type) ? " — required" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Label
                htmlFor="file-upload"
                className="flex items-center gap-1.5 justify-center px-4 py-2 border border-input rounded-lg cursor-pointer hover:bg-accent transition-colors text-sm font-medium text-foreground"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </Label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                multiple
              />
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold text-muted-foreground">New Files to Upload ({files.length})</Label>
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-border text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate font-medium text-foreground">{f.fileName}</span>
                      <span className="text-[10px] text-muted-foreground">({Math.round(f.fileSize / 1024)} KB)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] capitalize">{f.category}</Badge>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFile(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isDraft && allPublishBlockers.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
          <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Not ready to publish</div>
            <p className="text-muted-foreground mt-0.5">{allPublishBlockers[0]} You can still save a draft.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        {isDraft ? (
          <>
            <Button type="submit" variant="outline" disabled={mutation.isPending || !hasGroups} id="save-draft-tender-btn">
              {mutation.isPending && saveIntent === "draft" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save as Draft"
              )}
            </Button>
            <Button type="button" onClick={handlePublish} disabled={mutation.isPending || !hasGroups || allPublishBlockers.length > 0} id="submit-tender-form-btn">
              {mutation.isPending && saveIntent === "publish" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                `Publish ${typeMeta.label}`
              )}
            </Button>
          </>
        ) : (
          <Button type="submit" disabled={mutation.isPending || !hasGroups} id="submit-tender-form-btn">
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        )}
      </div>

      <AlertDialog open={pendingType !== null} onOpenChange={(open) => { if (!open) setPendingType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choose the right procurement type</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>RFQ is the default. Switch only if the package is not a well-defined quotation request.</p>
                {TYPE_ORDER.map((type) => {
                  const meta = PROCUREMENT_TYPES[type];
                  const selected = pendingType === type;
                  return (
                    <div
                      key={type}
                      className={`rounded-lg border p-3 ${selected ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="font-medium text-foreground">{meta.fullLabel}{type === "rfq" ? " — default" : ""}</div>
                      <p className="text-muted-foreground mt-1">{meta.summary}</p>
                    </div>
                  );
                })}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{form.type === "rfq" ? "Stay with RFQ" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingType) applyType(pendingType);
                setPendingType(null);
              }}
            >
              Use {pendingType ? PROCUREMENT_TYPES[pendingType].label : "this type"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublishConfirmDialog
        open={publishOpen}
        typeLabel={typeMeta.label}
        warnings={publishDates.warnings}
        pending={mutation.isPending && saveIntent === "publish"}
        onOpenChange={setPublishOpen}
        onProceed={() => {
          setSaveIntent("publish");
          mutation.mutate("publish");
        }}
      />
    </form>
  );
}
