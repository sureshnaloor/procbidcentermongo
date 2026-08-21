"use client";

import { useEffect, useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogOut, User, Upload, Trash2, FileText, Plus } from "lucide-react";
import { PUBLIC_DOCUMENT_CATEGORIES } from "@/lib/constants";

const emptyCompany = {
  companyName: "",
  registrationNumber: "",
  taxId: "",
  industry: "",
  yearEstablished: "",
  employeeCount: "",
  annualTurnover: "",
  turnoverCurrency: "USD",
  turnoverYear: "",
  contactPerson: "",
  phone: "",
  website: "",
  country: "",
  city: "",
  address: "",
  description: "",
};

function SettingsClient() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (session as any)?.user;
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState(tabParam || "account");

  useEffect(() => {
    if (tabParam) setTab(tabParam);
  }, [tabParam]);

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const isCompany = profile?.userType === "company";

  const { data: templateData, isLoading: loadingTemplates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetch("/api/templates").then((r) => r.json()),
    enabled: isCompany,
  });
  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "mine"],
    queryFn: () => fetch("/api/documents").then((r) => r.json()),
    enabled: isCompany,
  });

  const [form, setForm] = useState(emptyCompany);
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string }>>({});
  const [customDrafts, setCustomDrafts] = useState<Record<string, { title: string; body: string }>>({});
  const [newCustom, setNewCustom] = useState({ title: "", body: "" });
  const [docCategory, setDocCategory] = useState("balance_sheet");
  const [uploading, setUploading] = useState(false);
  const [dscForm, setDscForm] = useState({
    enabled: false,
    holderName: "",
    serialNumber: "",
    issuer: "",
    validFrom: "",
    validTo: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      companyName: profile.companyName || "",
      registrationNumber: profile.registrationNumber || "",
      taxId: profile.taxId || "",
      industry: profile.industry || "",
      yearEstablished: profile.yearEstablished != null ? String(profile.yearEstablished) : "",
      employeeCount: profile.employeeCount != null ? String(profile.employeeCount) : "",
      annualTurnover: profile.annualTurnover != null ? String(profile.annualTurnover) : "",
      turnoverCurrency: profile.turnoverCurrency || "USD",
      turnoverYear: profile.turnoverYear != null ? String(profile.turnoverYear) : "",
      contactPerson: profile.contactPerson || "",
      phone: profile.phone || "",
      website: profile.website || "",
      country: profile.country || "",
      city: profile.city || "",
      address: profile.address || "",
      description: profile.description || "",
    });
    setDscForm({
      enabled: Boolean(profile.dsc?.enabled),
      holderName: profile.dsc?.holderName || "",
      serialNumber: profile.dsc?.serialNumber || "",
      issuer: profile.dsc?.issuer || "",
      validFrom: profile.dsc?.validFrom && !Number.isNaN(new Date(profile.dsc.validFrom).getTime())
        ? new Date(profile.dsc.validFrom).toISOString().slice(0, 10)
        : "",
      validTo: profile.dsc?.validTo && !Number.isNaN(new Date(profile.dsc.validTo).getTime())
        ? new Date(profile.dsc.validTo).toISOString().slice(0, 10)
        : "",
    });
  }, [profile]);

  useEffect(() => {
    if (!Array.isArray(templateData?.resolved)) return;
    const next: Record<string, { title: string; body: string }> = {};
    for (const t of templateData.resolved) {
      next[t.kind] = { title: t.title, body: t.body };
    }
    setDrafts(next);
  }, [templateData]);

  useEffect(() => {
    if (!Array.isArray(templateData?.custom)) return;
    const next: Record<string, { title: string; body: string }> = {};
    for (const t of templateData.custom) {
      next[String(t._id)] = { title: t.title, body: t.body };
    }
    setCustomDrafts(next);
  }, [templateData]);

  function setField(key: keyof typeof emptyCompany, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const saveProfile = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        yearEstablished: form.yearEstablished ? parseInt(form.yearEstablished, 10) : null,
        employeeCount: form.employeeCount ? parseInt(form.employeeCount, 10) : null,
        annualTurnover: form.annualTurnover ? parseFloat(form.annualTurnover) : null,
        turnoverYear: form.turnoverYear ? parseInt(form.turnoverYear, 10) : null,
      };
      const res = await fetch(`/api/profile/${profile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      toast.success(isCompany
        ? "Company profile saved. Suppliers can view this public information."
        : "Supplier profile saved.");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveVendorProfile = useMutation({
    mutationFn: async () => {
      const payload = {
        companyName: form.companyName,
        registrationNumber: form.registrationNumber,
        contactPerson: form.contactPerson,
        phone: form.phone,
        website: form.website,
        country: form.country,
        city: form.city,
        address: form.address,
        description: form.description,
      };
      if (!profile?._id) {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userType: "vendor", ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create profile");
        return data;
      }
      const res = await fetch(`/api/profile/${profile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      toast.success("Supplier profile saved");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveDsc = useMutation({
    mutationFn: async () => {
      if (dscForm.enabled && (!dscForm.holderName.trim() || !dscForm.serialNumber.trim())) {
        throw new Error("Enter the DSC holder name and certificate serial number");
      }
      const res = await fetch(`/api/profile/${profile._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dsc: {
            enabled: dscForm.enabled,
            holderName: dscForm.holderName,
            serialNumber: dscForm.serialNumber,
            issuer: dscForm.issuer,
            validFrom: dscForm.validFrom || null,
            validTo: dscForm.validTo || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save DSC");
      return data;
    },
    onSuccess: () => {
      toast.success(dscForm.enabled ? "Digital signature certificate saved" : "DSC signing turned off");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveTemplate = useMutation({
    mutationFn: async (kind: string) => {
      const draft = drafts[kind];
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title: draft.title, body: draft.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      toast.success("Template saved to your library");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addCustomTemplate = useMutation({
    mutationFn: async () => {
      if (!newCustom.title.trim() || !newCustom.body.trim()) throw new Error("Title and content are required");
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "custom", title: newCustom.title.trim(), body: newCustom.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add custom term");
      return data;
    },
    onSuccess: () => {
      toast.success("Custom term added to your private library");
      setNewCustom({ title: "", body: "" });
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveCustomTemplate = useMutation({
    mutationFn: async (id: string) => {
      const draft = customDrafts[id];
      const res = await fetch(`/api/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.title, body: draft.body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      return data;
    },
    onSuccess: () => {
      toast.success("Custom term saved");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCustomTemplate = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      return data;
    },
    onSuccess: () => {
      toast.success("Custom term removed from your library");
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      return data;
    },
    onSuccess: () => {
      toast.success("Document removed");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File exceeds 20MB");
      return;
    }
    setUploading(true);
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileBase64,
          fileType: file.type,
          visibility: "public",
          category: docCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success("Public document uploaded");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const categoryLabel = (value?: string) =>
    PUBLIC_DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "Document";

  const isVendor = profile?.userType === "vendor" || user?.userType === "vendor";

  function changeTab(next: string) {
    setTab(next);
    router.replace(`/settings?tab=${next}`, { scroll: false });
  }

  const vendorProfileForm = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Supplier profile</CardTitle>
        <p className="text-xs text-muted-foreground">Add or update the details EPC companies see when they contact you.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Company / trade name</Label>
            <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} id="vendor-company-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Registration number</Label>
            <Input value={form.registrationNumber} onChange={(e) => setField("registrationNumber", e.target.value)} id="vendor-reg" />
          </div>
          <div className="space-y-1.5">
            <Label>Contact person</Label>
            <Input value={form.contactPerson} onChange={(e) => setField("contactPerson", e.target.value)} id="vendor-contact" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} id="vendor-phone" />
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setField("country", e.target.value)} id="vendor-country" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => setField("city", e.target.value)} id="vendor-city" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => setField("website", e.target.value)} id="vendor-website" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => setField("address", e.target.value)} id="vendor-address" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>About your company</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} id="vendor-description" />
          </div>
        </div>
        <Button onClick={() => saveVendorProfile.mutate()} disabled={saveVendorProfile.isPending} id="save-vendor-profile-btn">
          {saveVendorProfile.isPending ? <><Loader2 className="animate-spin h-4 w-4" />Saving...</> : "Save profile"}
        </Button>
      </CardContent>
    </Card>
  );

  const vendorDscForm = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Digital signature certificate (DSC)</CardTitle>
        <p className="text-xs text-muted-foreground">
          If you have a Class 2/3 DSC, register it here. Submitting an offer will then require you to digitally sign it.
          Browser USB-token signing is not available; print the offer, sign it with your DSC software if required, and attach the signed PDF at submit.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dscForm.enabled}
            onChange={(e) => setDscForm((prev) => ({ ...prev, enabled: e.target.checked }))}
            id="dsc-enabled"
          />
          I have a DSC and want to digitally sign offers
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Certificate holder name</Label>
            <Input value={dscForm.holderName} onChange={(e) => setDscForm((p) => ({ ...p, holderName: e.target.value }))} id="dsc-holder" />
          </div>
          <div className="space-y-1.5">
            <Label>Certificate serial number</Label>
            <Input value={dscForm.serialNumber} onChange={(e) => setDscForm((p) => ({ ...p, serialNumber: e.target.value }))} id="dsc-serial" />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Issuing authority</Label>
            <Input value={dscForm.issuer} onChange={(e) => setDscForm((p) => ({ ...p, issuer: e.target.value }))} placeholder="e.g. eMudhra, Capricorn, (n)Code" id="dsc-issuer" />
          </div>
          <div className="space-y-1.5">
            <Label>Valid from</Label>
            <Input type="date" value={dscForm.validFrom} onChange={(e) => setDscForm((p) => ({ ...p, validFrom: e.target.value }))} id="dsc-valid-from" />
          </div>
          <div className="space-y-1.5">
            <Label>Valid to</Label>
            <Input type="date" value={dscForm.validTo} onChange={(e) => setDscForm((p) => ({ ...p, validTo: e.target.value }))} id="dsc-valid-to" />
          </div>
        </div>
        <Button onClick={() => saveDsc.mutate()} disabled={saveDsc.isPending || !profile?._id} id="save-dsc-btn">
          {saveDsc.isPending ? <><Loader2 className="animate-spin h-4 w-4" />Saving...</> : "Save DSC"}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        {isCompany && (
          <p className="text-sm text-muted-foreground mt-1">Company details and documents on this page are public to all suppliers.</p>
        )}
        {isVendor && (
          <p className="text-sm text-muted-foreground mt-1">Manage your account and supplier profile.</p>
        )}
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isCompany && <TabsTrigger value="documents">Documents</TabsTrigger>}
          {isCompany && <TabsTrigger value="terms">Terms</TabsTrigger>}
        </TabsList>

        <TabsContent value="account" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{user?.displayName || user?.username}</div>
                  <div className="text-sm text-muted-foreground">{user?.email}</div>
                  {profile?.userType && (
                    <div className="text-xs text-muted-foreground mt-0.5">{profile.userType === "company" ? "EPC Company" : "Supplier"}</div>
                  )}
                </div>
              </div>
              <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => signOut({ callbackUrl: "/login" })} id="sign-out-btn">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4 space-y-6">
          {isVendor && vendorProfileForm}
          {isVendor && vendorDscForm}
          {isCompany && profile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public company profile</CardTitle>
              <p className="text-xs text-muted-foreground">Visible to all suppliers on your company page and tenders.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company name</Label>
                  <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} id="settings-company-name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Registration number</Label>
                  <Input value={form.registrationNumber} onChange={(e) => setField("registrationNumber", e.target.value)} id="settings-reg" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tax / GST number</Label>
                  <Input value={form.taxId} onChange={(e) => setField("taxId", e.target.value)} id="settings-tax" />
                </div>
                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <Input value={form.industry} onChange={(e) => setField("industry", e.target.value)} placeholder="e.g. Oil & Gas EPC" id="settings-industry" />
                </div>
                <div className="space-y-1.5">
                  <Label>Year established</Label>
                  <Input type="number" value={form.yearEstablished} onChange={(e) => setField("yearEstablished", e.target.value)} id="settings-year" />
                </div>
                <div className="space-y-1.5">
                  <Label>Number of employees</Label>
                  <Input type="number" value={form.employeeCount} onChange={(e) => setField("employeeCount", e.target.value)} id="settings-employees" />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual turnover</Label>
                  <Input type="number" value={form.annualTurnover} onChange={(e) => setField("annualTurnover", e.target.value)} placeholder="0" id="settings-turnover" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Currency</Label>
                    <Input value={form.turnoverCurrency} onChange={(e) => setField("turnoverCurrency", e.target.value)} id="settings-currency" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Turnover year</Label>
                    <Input type="number" value={form.turnoverYear} onChange={(e) => setField("turnoverYear", e.target.value)} id="settings-turnover-year" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact person</Label>
                  <Input value={form.contactPerson} onChange={(e) => setField("contactPerson", e.target.value)} id="settings-contact" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} id="settings-phone" />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => setField("country", e.target.value)} id="settings-country" />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setField("city", e.target.value)} id="settings-city" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setField("website", e.target.value)} id="settings-website" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setField("address", e.target.value)} id="settings-address" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>About the company</Label>
                  <Textarea rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} id="settings-description" />
                </div>
              </div>
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending} id="save-company-profile-btn">
                {saveProfile.isPending ? <><Loader2 className="animate-spin h-4 w-4" />Saving...</> : "Save public profile"}
              </Button>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {isCompany && (
          <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public documents</CardTitle>
              <p className="text-xs text-muted-foreground">Balance sheets, financials, certificates, and similar files are visible to all suppliers. Max 20MB per file.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="space-y-1.5 flex-1 w-full">
                  <Label>Document type</Label>
                  <Select value={docCategory} onValueChange={setDocCategory}>
                    <SelectTrigger id="settings-doc-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PUBLIC_DOCUMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Label
                  htmlFor="public-doc-upload"
                  className="flex items-center justify-center gap-1.5 px-4 py-2 border border-input dark:border-border rounded-lg cursor-pointer hover:bg-accent text-sm font-medium"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload file
                </Label>
                <input id="public-doc-upload" type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </div>
              {(documents as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">No public documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {(documents as any[]).map((d: any) => (
                    <div key={d._id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium truncate block hover:text-primary">
                          {d.name}
                        </a>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{categoryLabel(d.category)}</span>
                          <Badge variant={d.visibility === "public" ? "success" : "secondary"} className="text-[10px]">{d.visibility}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remove this document?")) deleteDoc.mutate(d._id); }}>
                        <Trash2 className="h-4 w-4 text-destructive/70" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}

        {isCompany && (
          <TabsContent value="terms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company terms library</CardTitle>
              <p className="text-xs text-muted-foreground">Pre-prepared, editable templates attached to new tenders. Seeded terms can be customized; your own custom terms stay private to this company and cannot be copied by other EPCs.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingTemplates ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin h-5 w-5 text-muted-foreground" /></div>
              ) : (
                (templateData?.resolved ?? []).map((t: any) => (
                  <div key={t.kind} className="space-y-2 border-b border-border pb-4 last:border-0 last:pb-0">
                    <Label>{drafts[t.kind]?.title || t.title}</Label>
                    <Input
                      value={drafts[t.kind]?.title ?? ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [t.kind]: { ...prev[t.kind], title: e.target.value } }))}
                    />
                    <Textarea
                      rows={7}
                      value={drafts[t.kind]?.body ?? ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [t.kind]: { ...prev[t.kind], body: e.target.value } }))}
                    />
                    <Button size="sm" variant="outline" onClick={() => saveTemplate.mutate(t.kind)} disabled={saveTemplate.isPending}>
                      Save {t.title}
                    </Button>
                  </div>
                ))
              )}

              <div className="pt-2 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground dark:text-muted-foreground">Your custom terms</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">These belong only to your company. Other EPC companies cannot view or copy them.</p>
                </div>
                {(templateData?.custom ?? []).map((t: any) => {
                  const id = String(t._id);
                  return (
                    <div key={id} className="space-y-2 border-b border-border pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <Label>{customDrafts[id]?.title || t.title}</Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { if (confirm("Remove this custom term from your library?")) deleteCustomTemplate.mutate(id); }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive/70" />
                        </Button>
                      </div>
                      <Input
                        value={customDrafts[id]?.title ?? ""}
                        onChange={(e) => setCustomDrafts((prev) => ({ ...prev, [id]: { ...prev[id], title: e.target.value } }))}
                      />
                      <Textarea
                        rows={7}
                        value={customDrafts[id]?.body ?? ""}
                        onChange={(e) => setCustomDrafts((prev) => ({ ...prev, [id]: { ...prev[id], body: e.target.value } }))}
                      />
                      <Button size="sm" variant="outline" onClick={() => saveCustomTemplate.mutate(id)} disabled={saveCustomTemplate.isPending}>
                        Save {customDrafts[id]?.title || t.title}
                      </Button>
                    </div>
                  );
                })}
                <div className="space-y-2 rounded-lg border border-dashed border-input dark:border-border p-3">
                  <Label>Add a custom term</Label>
                  <Input
                    placeholder="Title, e.g. Warranty, Insurance, Local content"
                    value={newCustom.title}
                    onChange={(e) => setNewCustom((p) => ({ ...p, title: e.target.value }))}
                  />
                  <Textarea
                    rows={6}
                    placeholder="Write the clause text..."
                    value={newCustom.body}
                    onChange={(e) => setNewCustom((p) => ({ ...p, body: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => addCustomTemplate.mutate()} disabled={addCustomTemplate.isPending}>
                    {addCustomTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add custom term
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>}>
      <SettingsClient />
    </Suspense>
  );
}
