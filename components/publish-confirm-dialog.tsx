"use client";

import { Loader2 } from "lucide-react";
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

export function PublishConfirmDialog({
  open,
  typeLabel,
  warnings,
  pending,
  onOpenChange,
  onProceed,
}: {
  open: boolean;
  typeLabel: string;
  warnings: string[];
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent id="publish-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Publish this {typeLabel}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                Once published, suppliers can see this package. You will not be able to edit it.
                You can still manage invites and later close, award, or cancel it.
              </p>
              {warnings.length > 0 && (
                <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-foreground space-y-1.5">
                  <div className="font-medium">Please confirm these dates</div>
                  {warnings.map((warning) => (
                    <p key={warning} className="text-muted-foreground">{warning}</p>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending} id="publish-cancel-btn">Cancel</AlertDialogCancel>
          <Button type="button" onClick={onProceed} disabled={pending} id="publish-proceed-btn">
            {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Publishing...</> : "Proceed"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
