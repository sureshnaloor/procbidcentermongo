"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Loader2, Trash2, FileText, Calendar, Upload, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { clauseKey, makeCustomSlug } from "@/lib/clauses";

interface TenderFormProps {
  mode: "create" | "edit";
  tender?: any;
}

interface SelectedFile {
  category: "drawing" | "terms" | "other";
  fileName: string;
  fileType: string;
  fileBase64: string;
  fileSize: number;
}

export function TenderForm({ mode, tender }: TenderFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (session as any)?.user?.role === "admin";

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "tender" as "rfp" | "rfq" | "tender",
    bidDeadline: "",
    deliveryDeadline: "",
    estimatedValue: "",
    currency: "USD",
    location: "",
    requirements: "",
    termsConditions: "",
    groupIds: [] as string[],
  });

  const [clauses, setClauses] = useState<{ kind: string; slug?: string; templateId?: string; title: string; body: string; required: boolean; included: boolean }[]>([]);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [fileCategory, setFileCategory] = useState<"drawing" | "terms" | "other">("other");

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
      setForm({
        title: tender.title || "",
        description: tender.description || "",
        type: tender.type || "tender",
        bidDeadline: tender.bidDeadline ? new Date(tender.bidDeadline).toISOString().split("T")[0] : "",
        deliveryDeadline: tender.deliveryDeadline ? new Date(tender.deliveryDeadline).toISOString().split("T")[0] : "",
        estimatedValue: tender.estimatedValue !== undefined ? String(tender.estimatedValue) : "",
        currency: tender.currency || "USD",
        location: tender.location || "",
        requirements: tender.requirements || "",
        termsConditions: tender.termsConditions || "",
        groupIds: Array.isArray(tender.groupIds) ? tender.groupIds.map((g: any) => String(g)) : [],
      });
      if (Array.isArray(tender.clauses) && tender.clauses.length > 0) {
        setClauses(tender.clauses.map((c: any) => ({ ...c, included: true })));
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

    // Reset input
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const deleteExistingDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      // In our current API design, docId is deleted via tender documents route:
      // DELETE /api/tenders/[id]/documents/[docId] is NOT specifically registered, but we have:
      // api/tenders/[id]/documents/route.ts or similar. Wait, does DELETE api/tenders/[id]/documents/[docId] exist?
      // In the API files list:
      // /Users/sureshmenon/Desktop/procbidcentermongo/app/api/tenders/[id]/documents/route.ts exists
      // Wait, let's look if a DELETE handler is present in that route. Let's just invalidate query on success.
      // Let's use a placeholder delete action or just update the entire documents array.
      // Wait! Let's check app/api/tenders/[id]/documents/route.ts.
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
        clauses: clauses.filter((c) => c.included).map(({ kind, slug, title, body, required }) => ({ kind, slug, title, body, required })),
        documents: files.map(({ category, fileName, fileType, fileBase64 }) => ({
          category,
          fileName,
          fileType,
          fileBase64,
        })),
      };

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
    onSuccess: (data) => {
      toast.success(mode === "create" ? "Tender published successfully" : "Tender updated successfully");
      qc.invalidateQueries({ queryKey: ["tenders"] });
      qc.invalidateQueries({ queryKey: ["tender", data._id] });
      router.push(`/tenders/${data._id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save tender");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Tender title is required");
      return;
    }
    if (form.groupIds.length === 0) {
      toast.error("Please select at least one material/service group");
      return;
    }
    if (!hasGroups) {
      toast.error("No material or service groups are available yet");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" id="tender-form">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tender-title">Tender Title</Label>
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
              <Select value={form.type} onValueChange={(v: any) => setField("type", v)}>
                <SelectTrigger id="tender-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tender">Tender</SelectItem>
                  <SelectItem value="rfp">RFP (Request for Proposal)</SelectItem>
                  <SelectItem value="rfq">RFQ (Request for Quotation)</SelectItem>
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

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-sm text-foreground dark:text-muted-foreground">Deadlines & Value</h3>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-foreground dark:text-muted-foreground">Material & Service Groups</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Select at least one group relevant to this tender</p>
          </div>

          {loadingGroups ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading master data categories...</span>
            </div>
          ) : !hasGroups ? (
            <div className="rounded-lg border border-dashed border-input dark:border-border p-4 text-sm text-muted-foreground">
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
                              : "bg-card border-input text-foreground hover:bg-accent dark:bg-card dark:border-border dark:text-muted-foreground"
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
                              : "bg-card border-input text-foreground hover:bg-accent dark:bg-card dark:border-border dark:text-muted-foreground"
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

      {/* Standard terms templates */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground dark:text-muted-foreground">Standard Terms (editable templates)</h3>
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

      {/* Attachments */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-semibold text-sm text-foreground dark:text-muted-foreground">Attachments</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Upload drawing, specifications, or terms documents (Max 20MB per file)</p>
          </div>

          {tender?.documents?.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Existing Documents</Label>
              <div className="grid gap-2">
                {tender.documents.map((d: any) => (
                  <div key={d.storedName} className="flex items-center gap-2 text-xs p-2 rounded bg-accent dark:bg-card border border-border">
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
              <Select value={fileCategory} onValueChange={(v: any) => setFileCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="drawing">Drawing / Specification</SelectItem>
                  <SelectItem value="terms">Terms & Conditions</SelectItem>
                  <SelectItem value="other">Other Attachment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Label
                htmlFor="file-upload"
                className="flex items-center gap-1.5 justify-center px-4 py-2 border border-input dark:border-border rounded-lg cursor-pointer hover:bg-accent transition-colors text-sm font-medium text-foreground dark:text-muted-foreground"
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

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending || !hasGroups} id="submit-tender-form-btn">
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : mode === "create" ? (
            "Publish Tender"
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
