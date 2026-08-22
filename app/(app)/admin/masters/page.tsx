"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, ChevronDown, ChevronRight, Layers } from "lucide-react";

type Category = "material" | "service";

interface MasterGroup {
  _id: string;
  name: string;
  description?: string;
}

interface MasterItem {
  _id: string;
  groupId: string;
  code: string;
  description?: string;
}

function GroupCatalog({ category, title, hint }: { category: Category; title: string; hint: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [itemDraft, setItemDraft] = useState<Record<string, { code: string; description: string }>>({});

  const { data: groups = [], isLoading } = useQuery<MasterGroup[]>({
    queryKey: ["master", "groups", category],
    queryFn: () => fetch(`/api/master/groups?category=${category}`).then((r) => r.json()),
  });

  const { data: items = [] } = useQuery<MasterItem[]>({
    queryKey: ["master", "items", category],
    queryFn: () => fetch(`/api/master/items?category=${category}`).then((r) => r.json()),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["master"] });
  }

  const addGroup = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/master/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add group");
      return data;
    },
    onSuccess: () => {
      toast.success(`${title.slice(0, -1)} added`);
      setName("");
      setDescription("");
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
    mutationFn: async ({ groupId, code, description: desc }: { groupId: string; code: string; description: string }) => {
      const res = await fetch("/api/master/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, code, description: desc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add item");
      return data;
    },
    onSuccess: (_data, vars) => {
      toast.success("Item added");
      setItemDraft((prev) => ({ ...prev, [vars.groupId]: { code: "", description: "" } }));
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const delItem = useMutation({
    mutationFn: (id: string) => fetch(`/api/master/items/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Item deleted");
      invalidate();
    },
  });

  const itemsByGroup = (groupId: string) => items.filter((item) => item.groupId === groupId);

  return (
    <div className="space-y-4">
      <Card className="glass card-3d border-0">
        <CardHeader>
          <CardTitle className="text-sm font-[family-name:var(--font-heading)]">Add {title.slice(0, -1)}</CardTitle>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${category}-group-name`}>Group name</Label>
              <Input
                id={`${category}-group-name`}
                placeholder={category === "material" ? "e.g. Pipes & Fittings" : "e.g. Welding"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${category}-group-desc`}>Description (optional)</Label>
              <Input
                id={`${category}-group-desc`}
                placeholder="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() => addGroup.mutate()}
            disabled={!name.trim() || addGroup.isPending}
            id={`add-${category}-group-btn`}
          >
            {addGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add group
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground font-medium">
          No {title.toLowerCase()} yet. Add the first group above.
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {groups.map((group) => {
            const open = !!expanded[group._id];
            const groupItems = itemsByGroup(group._id);
            const draft = itemDraft[group._id] ?? { code: "", description: "" };
            return (
              <div key={group._id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setExpanded((prev) => ({ ...prev, [group._id]: !open }))}
                    aria-label={open ? "Collapse items" : "Expand items"}
                  >
                    {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{group.name}</span>
                      <Badge variant="outline" className="text-[10px]">{groupItems.length} items</Badge>
                    </div>
                    {group.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{group.description}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Delete "${group.name}"?`)) delGroup.mutate(group._id);
                    }}
                    id={`del-group-${group._id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive/70" />
                  </Button>
                </div>
                {open && (
                  <div className="border-t border-border p-3 space-y-2 bg-muted/30">
                    <div className="flex flex-wrap gap-2">
                      <Input
                        placeholder="Item code"
                        className="w-32"
                        value={draft.code}
                        onChange={(e) =>
                          setItemDraft((prev) => ({ ...prev, [group._id]: { ...draft, code: e.target.value } }))
                        }
                        id={`item-code-${group._id}`}
                      />
                      <Input
                        placeholder="Description"
                        className="flex-1 min-w-48"
                        value={draft.description}
                        onChange={(e) =>
                          setItemDraft((prev) => ({ ...prev, [group._id]: { ...draft, description: e.target.value } }))
                        }
                        id={`item-desc-${group._id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!draft.code.trim() || addItem.isPending}
                        onClick={() => addItem.mutate({ groupId: group._id, code: draft.code, description: draft.description })}
                        id={`add-item-${group._id}`}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add item
                      </Button>
                    </div>
                    {groupItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">No items in this group yet.</p>
                    ) : (
                      groupItems.map((item) => (
                        <div key={item._id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                          <div>
                            <span className="font-mono text-xs text-muted-foreground mr-2">{item.code}</span>
                            <span className="text-sm text-foreground">{item.description}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => delItem.mutate(item._id)} id={`del-item-${item._id}`}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminMasterDataPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-[family-name:var(--font-heading)] text-gradient">
            Global Masters
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Material groups first, then service groups. Companies select these when publishing tenders so suppliers can prepare matching offers.
        </p>
      </div>

      <Tabs defaultValue="material">
        <TabsList className="glass border-0">
          <TabsTrigger value="material">Material Groups</TabsTrigger>
          <TabsTrigger value="service">Service Groups</TabsTrigger>
        </TabsList>
        <TabsContent value="material" className="mt-4">
          <GroupCatalog
            category="material"
            title="Material Groups"
            hint="Used on tenders for pipes, electrical, equipment, and other buy items."
          />
        </TabsContent>
        <TabsContent value="service" className="mt-4">
          <GroupCatalog
            category="service"
            title="Service Groups"
            hint="Used on tenders for civil, welding, HSE, maintenance, and other work packages."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
