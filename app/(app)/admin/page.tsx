"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Shield, Trash2, Loader2, UserCheck, Settings } from "lucide-react";

export default function AdminPage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => fetch("/api/admin/users").then((r) => r.json()),
    enabled: !!session,
  });
  const { data: admins = [] } = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => fetch("/api/admin/admins").then((r) => r.json()),
    enabled: !!session,
  });
  const { data: adminInfo } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => fetch("/api/admin/me").then((r) => r.json()),
    enabled: !!session,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, isVerified }: { id: string; isVerified: boolean }) =>
      fetch(`/api/admin/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVerified }) }).then((r) => r.json()),
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/users/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (err: any) => toast.error(err.message || "Cannot delete"),
  });

  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/admins/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => { toast.success("Admin removed"); qc.invalidateQueries({ queryKey: ["admin", "admins"] }); },
    onError: (err: any) => toast.error(err.message || "Cannot remove"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          {adminInfo?.isSuperAdmin && <p className="text-sm text-amber-600">Super Admin</p>}
        </div>
        <div className="flex gap-2">
          <Link href="/admin/masters"><Button variant="outline" size="sm" id="master-data-btn"><Settings className="h-4 w-4" />Global Masters</Button></Link>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Business Users ({(users as any[]).length})</TabsTrigger>
          {adminInfo?.isSuperAdmin && <TabsTrigger value="admins">Admins ({(admins as any[]).length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="users" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>
          ) : (
            <div className="grid gap-3">
              {(users as any[]).map((u: any) => (
                <Card key={u._id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted dark:bg-card flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{u.companyName || u.user?.username}</div>
                          <div className="text-xs text-muted-foreground">{u.user?.email} · {u.userType === "company" ? "EPC Company" : "Supplier"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.isVerified ? (
                          <Badge variant="success" className="flex items-center gap-1"><Shield className="h-3 w-3" />Verified</Badge>
                        ) : (
                          <Button size="sm" variant="outline" id={`verify-${u._id}`} onClick={() => verifyMutation.mutate({ id: u._id, isVerified: true })}>
                            <UserCheck className="h-4 w-4" />Verify
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this user?")) deleteUserMutation.mutate(u._id); }} id={`delete-user-${u._id}`}>
                          <Trash2 className="h-4 w-4 text-destructive/70" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {adminInfo?.isSuperAdmin && (
          <TabsContent value="admins" className="mt-4">
            <div className="grid gap-3">
              {(admins as any[]).map((a: any) => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{a.displayName || a.username}</div>
                          <div className="text-xs text-muted-foreground">{a.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {a.isSuperAdmin && <Badge variant="warning">Super Admin</Badge>}
                        {!a.isSuperAdmin && user?.isSuperAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove this admin?")) deleteAdminMutation.mutate(a.id); }} id={`remove-admin-${a.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive/70" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
