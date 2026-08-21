"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { hasRegisteredDsc } from "@/lib/dsc";

export type OfferConfirmKind = "submit" | "withdraw-draft" | "withdraw-submitted";

type DscInfo = {
  enabled?: boolean;
  holderName?: string;
  serialNumber?: string;
  issuer?: string;
  validFrom?: string | Date;
  validTo?: string | Date;
} | null | undefined;

export type OfferConfirmPayload = {
  signWithDsc?: boolean;
  signedPdfName?: string;
  signedPdfBase64?: string;
};

const COPY: Record<OfferConfirmKind, { title: string; description: string; proceed: string }> = {
  submit: {
    title: "Submit this offer?",
    description:
      "Once submitted, you cannot edit this offer. You may withdraw it until the bid deadline. Preview and print a copy first if you need a record.",
    proceed: "Proceed",
  },
  "withdraw-draft": {
    title: "Withdraw this draft?",
    description: "The draft will be marked withdrawn and stay on record for you and the company.",
    proceed: "Proceed",
  },
  "withdraw-submitted": {
    title: "Withdraw this submitted offer?",
    description:
      "Withdrawing cannot be undone. The company will still see this offer as withdrawn, and it remains on record permanently. They may blacklist your company from future packages.",
    proceed: "Proceed",
  },
};

export function OfferConfirmDialog({
  open,
  kind,
  dsc,
  pending,
  onOpenChange,
  onProceed,
}: {
  open: boolean;
  kind: OfferConfirmKind;
  dsc?: DscInfo;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: (payload: OfferConfirmPayload) => void;
}) {
  const copy = COPY[kind];
  const needsDsc = kind === "submit" && hasRegisteredDsc(dsc);
  const [ackSign, setAckSign] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileBase64, setFileBase64] = useState("");

  useEffect(() => {
    if (!open) {
      setAckSign(false);
      setFileName("");
      setFileBase64("");
    }
  }, [open]);

  function handleFile(file?: File) {
    if (!file) {
      setFileName("");
      setFileBase64("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileName(file.name);
      setFileBase64(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  const canProceed = !needsDsc || ackSign;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent id={`offer-confirm-${kind}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {needsDsc && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-3 text-sm">
            <div>
              <div className="font-medium text-foreground">Digital signature (DSC)</div>
              <p className="text-xs text-muted-foreground mt-1">
                This offer will be signed with your registered DSC. Optionally attach a DSC-signed PDF of the printed offer.
              </p>
            </div>
            <div className="text-xs space-y-0.5 text-muted-foreground">
              <div><span className="text-foreground">Holder:</span> {dsc?.holderName}</div>
              <div><span className="text-foreground">Serial:</span> {dsc?.serialNumber}</div>
              {dsc?.issuer && <div><span className="text-foreground">Issuer:</span> {dsc.issuer}</div>}
            </div>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={ackSign}
                onChange={(e) => setAckSign(e.target.checked)}
                id="dsc-sign-ack"
              />
              <span>
                I confirm I am authorised to digitally sign this offer using DSC {dsc?.serialNumber}.
              </span>
            </label>
            <div className="space-y-1.5">
              <Label className="text-xs">Signed PDF / PKCS#7 (optional)</Label>
              <input
                type="file"
                accept=".pdf,.p7s,.p7b,.sig,application/pdf"
                className="block w-full text-xs"
                id="dsc-signed-file"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {fileName && <p className="text-xs text-muted-foreground">{fileName}</p>}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} id={`offer-cancel-${kind}`}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            disabled={!canProceed || pending}
            onClick={() =>
              onProceed({
                signWithDsc: needsDsc,
                signedPdfName: fileName || undefined,
                signedPdfBase64: fileBase64 || undefined,
              })
            }
            id={`offer-proceed-${kind}`}
          >
            {pending ? <><Loader2 className="animate-spin h-4 w-4" />Please wait...</> : copy.proceed}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
