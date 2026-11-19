"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Layers,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Package,
} from "lucide-react";

type Category = "material" | "service";

interface MasterType {
  _id: string;
  category: Category;
  name: string;
  description?: string;
  groups?: MasterGroup[];
}

interface MasterGroup {
  _id: string;
  typeId: string;
  name: string;
  description?: string;
}

interface MasterItem {
  _id: string;
  groupId: string;
  code: string;
  description?: string;
  unit?: string;
}

interface UploadResult {
  title: string;
  totalRows: number;
  createdTypes?: number;
  createdGroups?: number;
  updatedGroups?: number;
  createdItems?: number;
  updatedItems?: number;
  errors: string[];
}

async function triggerDownload(url: string, fallbackName: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Download failed");
    }
    const blob = await res.blob();
    const header = res.headers.get("Content-Disposition") || "";
    const match = header.match(/filename="([^"]+)"/);
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = match?.[1] || fallbackName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
    toast.success(`Downloaded ${a.download}`);
  } catch (err: any) {
    toast.error(err.message || "Failed to download template");
  }
}

function TaxonomyCatalog({ category }: { category: Category }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // New Type inputs
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");

  // New Group drafts per Type
  const [groupDraft, setGroupDraft] = useState<Record<string, { name: string; description: string }>>({});

  // New Item drafts per Group
  const [itemDraft, setItemDraft] = useState<Record<string, { code: string; description: string; unit: string }>>({});

  // Bulk Upload state
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const groupsFileRef = useRef<HTMLInputElement>(null);
  const itemsFileRef = useRef<HTMLInputElement>(null);

  // Fetch Types with Groups
  const { data: rawTypes = [], isLoading: loadingTypes } = useQuery<MasterType[]>({
    queryKey: ["master", "groups-with-types", category],
    queryFn: () => fetch(`/api/master/groups-with-types?category=${category}`).then((r) => r.json()),
  });

  // Fetch Items
  const { data: items = [], isLoading: loadingItems } = useQuery<MasterItem[]>({
    queryKey: ["master", "items", category],
    queryFn: () => fetch(`/api/master/items?category=${category}`).then((r) => r.json()),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["master"] });
  }

  // Mutations
  const addType = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/master/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, name: typeName.trim(), description: typeDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add type");
      return data;
    },
    onSuccess: (created) => {
      toast.success(`Added ${category === "material" ? "Material Type" : "Service Type"}: ${created.name}`);
      setTypeName("");
      setTypeDesc("");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const delType = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/types/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cannot delete type");
      return data;
    },
    onSuccess: () => {
      toast.success("Type removed");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addGroup = useMutation({
    mutationFn: async ({ typeId, name, description }: { typeId: string; name: string; description: string }) => {
      const res = await fetch("/api/master/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeId, name: name.trim(), description: description.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add group");
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(`Group "${vars.name}" added`);
      setGroupDraft((prev) => ({ ...prev, [vars.typeId]: { name: "", description: "" } }));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const delGroup = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/groups/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cannot delete group");
      return data;
    },
    onSuccess: () => {
      toast.success("Group deleted");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addItem = useMutation({
    mutationFn: async ({
      groupId,
      code,
      description,
      unit,
    }: {
      groupId: string;
      code: string;
      description: string;
      unit: string;
    }) => {
      const res = await fetch("/api/master/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          code: code.trim(),
          description: description.trim() || undefined,
          unit: unit.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add item");
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success(`Item "${vars.code}" added`);
      setItemDraft((prev) => ({ ...prev, [vars.groupId]: { code: "", description: "", unit: "" } }));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const delItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/master/items/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cannot delete item");
      return data;
    },
    onSuccess: () => {
      toast.success("Item deleted");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Bulk Upload Handler
  async function handleFileUpload(file: File, endpoint: string, title: string) {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadResult({ title, ...data });
      invalidate();
      toast.success(`${title} processed successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (groupsFileRef.current) groupsFileRef.current.value = "";
      if (itemsFileRef.current) itemsFileRef.current.value = "";
    }
  }

  // Filtered types & groups based on search
  const term = search.trim().toLowerCase();
  const types = rawTypes.filter((t) => {
    if (!term) return true;
    if (t.name.toLowerCase().includes(term)) return true;
    if (t.description?.toLowerCase().includes(term)) return true;
    const hasMatchingGroup = (t.groups || []).some(
      (g) => g.name.toLowerCase().includes(term) || g.description?.toLowerCase().includes(term)
    );
    if (hasMatchingGroup) return true;
    const hasMatchingItem = items.some(
      (item) =>
        (t.groups || []).some((g) => g._id === item.groupId) &&
        (item.code.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term))
    );
    return hasMatchingItem;
  });

  const totalGroups = rawTypes.reduce((acc, t) => acc + (t.groups?.length || 0), 0);
  const totalItems = items.length;

  return (
    <div className="space-y-6">
      {/* Hidden file inputs for bulk upload */}
      <input
        type="file"
        ref={groupsFileRef}
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f, "/api/master/groups/upload", "Groups Bulk Upload");
        }}
      />
      <input
        type="file"
        ref={itemsFileRef}
        className="hidden"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f, "/api/master/items/upload", "Materials Bulk Upload");
        }}
      />

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${category === "material" ? "materials" : "services"}, types, groups, or codes...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download Templates */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-dashed"
            onClick={() =>
              triggerDownload(
                `/api/master/groups/template?category=${category}`,
                `ProcBid-${category}-groups-template.xlsx`
              )
            }
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>Groups Template</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-xl border-dashed"
            onClick={() =>
              triggerDownload(
                `/api/master/items/template`,
                `ProcBid-materials-template.xlsx`
              )
            }
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>Materials Template</span>
          </Button>

          {/* Upload Buttons */}
          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 rounded-xl shadow-xs"
            disabled={isUploading}
            onClick={() => groupsFileRef.current?.click()}
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span>Upload Groups</span>
          </Button>

          <Button
            size="sm"
            className="h-9 gap-1.5 rounded-xl shadow-xs"
            disabled={isUploading}
            onClick={() => itemsFileRef.current?.click()}
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            <span>Upload Materials</span>
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-foreground">{rawTypes.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {category === "material" ? "Material Types" : "Service Types"}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-foreground">{totalGroups}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Discipline Groups</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-foreground">{totalItems}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Catalog Items</div>
        </div>
      </div>

      {/* Add Root Type Card */}
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-[family-name:var(--font-heading)]">
              Add Root {category === "material" ? "Material Type" : "Service Type"}
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Top-level taxonomy discipline (e.g. Electrical, Mechanical, Civil, Instrumentation).
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                placeholder={category === "material" ? "Type name (e.g. Electrical)" : "Type name (e.g. Civil & Construction)"}
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Discipline description (optional)"
                value={typeDesc}
                onChange={(e) => setTypeDesc(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              onClick={() => addType.mutate()}
              disabled={!typeName.trim() || addType.isPending}
              size="sm"
              className="h-9 shrink-0 gap-1.5"
            >
              {addType.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Type
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Taxonomy Tree (Types -> Groups -> Items) */}
      {loadingTypes ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </div>
      ) : types.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card text-sm text-muted-foreground">
          {search ? "No matching types or groups found." : `No ${category} types created yet. Add one above or use Bulk Upload.`}
        </div>
      ) : (
        <div className="space-y-4">
          {types.map((type) => {
            const isTypeOpen = expandedTypes[type._id] ?? true;
            const groups = type.groups || [];
            const typeGroupDraft = groupDraft[type._id] || { name: "", description: "" };

            return (
              <div
                key={type._id}
                className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all"
              >
                {/* Type Header */}
                <div className="flex items-center gap-2 p-3 bg-muted/40 border-b border-border">
                  <button
                    type="button"
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setExpandedTypes((p) => ({ ...p, [type._id]: !isTypeOpen }))}
                    aria-label={isTypeOpen ? "Collapse type" : "Expand type"}
                  >
                    {isTypeOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground tracking-tight">{type.name}</span>
                      <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0">
                        {groups.length} {groups.length === 1 ? "group" : "groups"}
                      </Badge>
                    </div>
                    {type.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{type.description}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (groups.length > 0) {
                        toast.error("Please delete or move all groups under this type first.");
                        return;
                      }
                      if (confirm(`Delete "${type.name}"?`)) delType.mutate(type._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Type Content: Groups */}
                {isTypeOpen && (
                  <div className="p-3 sm:p-4 space-y-3">
                    {/* Add Group inline under this Type */}
                    <div className="bg-muted/30 border border-dashed border-border/80 rounded-xl p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        <span>Add Group under {type.name}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Group name (e.g. Glands, Lugs, Cables HV)"
                          className="h-8 text-xs flex-1"
                          value={typeGroupDraft.name}
                          onChange={(e) =>
                            setGroupDraft((prev) => ({
                              ...prev,
                              [type._id]: { ...typeGroupDraft, name: e.target.value },
                            }))
                          }
                        />
                        <Input
                          placeholder="Group description (optional)"
                          className="h-8 text-xs flex-1"
                          value={typeGroupDraft.description}
                          onChange={(e) =>
                            setGroupDraft((prev) => ({
                              ...prev,
                              [type._id]: { ...typeGroupDraft, description: e.target.value },
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0"
                          disabled={!typeGroupDraft.name.trim() || addGroup.isPending}
                          onClick={() =>
                            addGroup.mutate({
                              typeId: type._id,
                              name: typeGroupDraft.name,
                              description: typeGroupDraft.description,
                            })
                          }
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Group
                        </Button>
                      </div>
                    </div>

                    {/* Groups List */}
                    {groups.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        No groups under {type.name} yet. Add a group above or upload a template.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {groups.map((group) => {
                          const isGroupOpen = !!expandedGroups[group._id];
                          const groupItems = items.filter((it) => it.groupId === group._id);
                          const currentItemDraft = itemDraft[group._id] || { code: "", description: "", unit: "" };

                          return (
                            <div
                              key={group._id}
                              className="rounded-xl border border-border/80 bg-background/50 hover:bg-background/80 transition-colors overflow-hidden"
                            >
                              {/* Group Row Header */}
                              <div className="flex items-center gap-2 p-2.5">
                                <button
                                  type="button"
                                  className="p-1 rounded-md hover:bg-muted transition-colors"
                                  onClick={() =>
                                    setExpandedGroups((p) => ({ ...p, [group._id]: !isGroupOpen }))
                                  }
                                  aria-label={isGroupOpen ? "Collapse items" : "Expand items"}
                                >
                                  {isGroupOpen ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">{group.name}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                      {groupItems.length} {groupItems.length === 1 ? "item" : "items"}
                                    </Badge>
                                  </div>
                                  {group.description && (
                                    <p className="text-[11px] text-muted-foreground truncate">{group.description}</p>
                                  )}
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Delete group "${group.name}"?`)) delGroup.mutate(group._id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>

                              {/* Expanded Items under Group */}
                              {isGroupOpen && (
                                <div className="border-t border-border/60 bg-muted/20 p-3 space-y-2.5">
                                  {/* Add Item form */}
                                  <div className="flex flex-wrap gap-2">
                                    <Input
                                      placeholder="Item code (e.g. CAB-LV-4C16)"
                                      className="h-8 text-xs w-44 font-mono"
                                      value={currentItemDraft.code}
                                      onChange={(e) =>
                                        setItemDraft((prev) => ({
                                          ...prev,
                                          [group._id]: { ...currentItemDraft, code: e.target.value },
                                        }))
                                      }
                                    />
                                    <Input
                                      placeholder="Material description"
                                      className="h-8 text-xs flex-1 min-w-44"
                                      value={currentItemDraft.description}
                                      onChange={(e) =>
                                        setItemDraft((prev) => ({
                                          ...prev,
                                          [group._id]: { ...currentItemDraft, description: e.target.value },
                                        }))
                                      }
                                    />
                                    <Input
                                      placeholder="Unit (MTR, NOS)"
                                      className="h-8 text-xs w-24"
                                      value={currentItemDraft.unit}
                                      onChange={(e) =>
                                        setItemDraft((prev) => ({
                                          ...prev,
                                          [group._id]: { ...currentItemDraft, unit: e.target.value },
                                        }))
                                      }
                                    />
                                    <Button
                                      size="sm"
                                      className="h-8 text-xs"
                                      disabled={!currentItemDraft.code.trim() || addItem.isPending}
                                      onClick={() =>
                                        addItem.mutate({
                                          groupId: group._id,
                                          code: currentItemDraft.code,
                                          description: currentItemDraft.description,
                                          unit: currentItemDraft.unit,
                                        })
                                      }
                                    >
                                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                                    </Button>
                                  </div>

                                  {/* Items Table / List */}
                                  {groupItems.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-1">No items under this group yet.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {groupItems.map((item) => (
                                        <div
                                          key={item._id}
                                          className="flex items-center justify-between rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-mono font-semibold text-primary">{item.code}</span>
                                            {item.unit && (
                                              <Badge variant="secondary" className="text-[10px] py-0 px-1">
                                                {item.unit}
                                              </Badge>
                                            )}
                                            <span className="text-muted-foreground truncate">{item.description}</span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive/60 hover:text-destructive hover:bg-destructive/10 shrink-0"
                                            onClick={() => delItem.mutate(item._id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Summary Dialog */}
      {uploadResult && (
        <Dialog open={Boolean(uploadResult)} onOpenChange={() => setUploadResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <DialogTitle>{uploadResult.title} Results</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-muted/40 p-3 rounded-xl">
                <div>Total Rows Processed:</div>
                <div className="font-semibold text-right">{uploadResult.totalRows}</div>

                {uploadResult.createdTypes != null && (
                  <>
                    <div>Types Created:</div>
                    <div className="font-semibold text-right">{uploadResult.createdTypes}</div>
                  </>
                )}

                {uploadResult.createdGroups != null && (
                  <>
                    <div>Groups Created:</div>
                    <div className="font-semibold text-right text-emerald-600">{uploadResult.createdGroups}</div>
                  </>
                )}

                {uploadResult.updatedGroups != null && (
                  <>
                    <div>Groups Updated:</div>
                    <div className="font-semibold text-right">{uploadResult.updatedGroups}</div>
                  </>
                )}

                {uploadResult.createdItems != null && (
                  <>
                    <div>Materials Created:</div>
                    <div className="font-semibold text-right text-emerald-600">{uploadResult.createdItems}</div>
                  </>
                )}

                {uploadResult.updatedItems != null && (
                  <>
                    <div>Materials Updated:</div>
                    <div className="font-semibold text-right">{uploadResult.updatedItems}</div>
                  </>
                )}
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Errors / Warnings ({uploadResult.errors.length})</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-border p-2 bg-muted/20 text-xs font-mono space-y-1 text-destructive">
                    {uploadResult.errors.map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full mt-2" onClick={() => setUploadResult(null)}>
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function AdminMasterDataPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
          <Layers size={11} /> Classification Taxonomy
        </span>
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
            Taxonomy & Master Catalog
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Root taxonomy types (e.g. Electrical, Mechanical, Civil) classify granular material & service groups (e.g. Glands, Lugs, Cables HV, Valves). Suppliers and tenders map to these groups for granular qualification and procurement.
        </p>
      </div>

      <Tabs defaultValue="material">
        <TabsList className="glass border-0">
          <TabsTrigger value="material" className="gap-2">
            <Package className="h-4 w-4" /> Material Classification
          </TabsTrigger>
          <TabsTrigger value="service" className="gap-2">
            <FolderTree className="h-4 w-4" /> Service Classification
          </TabsTrigger>
        </TabsList>

        <TabsContent value="material" className="mt-4">
          <TaxonomyCatalog category="material" />
        </TabsContent>

        <TabsContent value="service" className="mt-4">
          <TaxonomyCatalog category="service" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
