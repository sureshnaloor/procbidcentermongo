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
import { Upload, Loader2, FileSpreadsheet, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { readFileAsDataUrl } from "@/lib/boq-browser";

type Props = {
  tenderId: string;
  tenderTitle: string;
  onUploaded: () => void;
  triggerLabel?: string;
};

export function OfflineBidUploadDialog({ tenderId, tenderTitle, onUploaded, triggerLabel = "Upload filled offer" }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [supplier, setSupplier] = useState({ name: "", email: "", contactPerson: "", phone: "" });
  const [workbook, setWorkbook] = useState<File | null>(null);
  const [signedPdf, setSignedPdf] = useState<File | null>(null);

  const reset = () => {
    setError(null);
    setWarnings([]);
    setDone(null);
    setSupplier({ name: "", email: "", contactPerson: "", phone: "" });
    setWorkbook(null);
    setSignedPdf(null);
  };

  const submit = async () => {
    setError(null);
    setWarnings([]);
    setDone(null);
    if (!workbook) {
      setError("Choose the filled Excel workbook the supplier returned.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        supplier: {
          name: supplier.name.trim() || undefined,
          email: supplier.email.trim() || undefined,
          contactPerson: supplier.contactPerson.trim() || undefined,
          phone: supplier.phone.trim() || undefined,
        },
        workbook: { name: workbook.name, base64: await readFileAsDataUrl(workbook) },
      };
      if (signedPdf) {
        payload.signedPdf = { name: signedPdf.name, base64: await readFileAsDataUrl(signedPdf) };
      }
      const res = await fetch(`/api/offline-bids/${tenderId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setDone(data.updated ? "Existing offline offer replaced with the new upload." : "Offline offer recorded. It now appears in the comparison.");
      onUploaded();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" id={`offline-upload-${tenderId}`}>
          <Upload className="h-3.5 w-3.5" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload offline offer</DialogTitle>
          <DialogDescription>
            {tenderTitle} — upload the filled Excel workbook and the signed PDF the supplier emailed back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="offline-supplier-name">Supplier company name</Label>
              <Input
                id="offline-supplier-name"
                value={supplier.name}
                onChange={(e) => setSupplier((s) => ({ ...s, name: e.target.value }))}
                placeholder="As on their letterhead"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offline-supplier-email">Email</Label>
              <Input
                id="offline-supplier-email"
                type="email"
                value={supplier.email}
                onChange={(e) => setSupplier((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offline-supplier-contact">Contact person</Label>
              <Input
                id="offline-supplier-contact"
                value={supplier.contactPerson}
                onChange={(e) => setSupplier((s) => ({ ...s, contactPerson: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offline-supplier-phone">Phone</Label>
              <Input
                id="offline-supplier-phone"
                value={supplier.phone}
                onChange={(e) => setSupplier((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Values filled on the workbook&apos;s Summary sheet take precedence over these fields.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="offline-workbook-file">Filled workbook (.xlsx)</Label>
            <label
              htmlFor="offline-workbook-file"
              className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{workbook ? workbook.name : "Choose the filled Excel file"}</span>
            </label>
            <input
              id="offline-workbook-file"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setWorkbook(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offline-signed-file">Signed PDF / scan (optional)</Label>
            <label
              htmlFor="offline-signed-file"
              className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-sm cursor-pointer hover:bg-muted/40 transition-colors"
            >
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="truncate">{signedPdf ? signedPdf.name : "Choose the signed PDF"}</span>
            </label>
            <input
              id="offline-signed-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => setSignedPdf(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {done && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm space-y-1.5">
              <div className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{done}</span>
              </div>
              {warnings.length > 0 && (
                <ul className="list-disc pl-8 text-xs text-muted-foreground space-y-0.5">
                  {warnings.slice(0, 8).map((w, i) => <li key={i}>{w}</li>)}
                  {warnings.length > 8 && <li>…and {warnings.length - 8} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Close
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {submitting ? "Uploading…" : "Upload offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
