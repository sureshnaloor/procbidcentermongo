"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ClauseDiffText } from "@/components/clause-diff";
import { clauseKey } from "@/lib/clauses";
import { wordsDiffer } from "@/lib/text-diff";
import { formatDelivery } from "@/lib/bid-line";

function money(value: number | undefined | null, currency: string) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BidPreviewDocument({ bid }: { bid: any }) {
  const currency = bid.currency || "USD";
  const vendorName = bid.vendor?.companyName || "Supplier";
  const tenderTitle = bid.tender?.title || "Offer";
  const signed = bid.signature;

  return (
    <article className="bid-print-document bg-white text-black p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
      <header className="border-b border-black/20 pb-4 mb-6">
        <p className="text-xs uppercase tracking-wide text-black/60">Offer document</p>
        <h1 className="text-2xl font-bold mt-1">{tenderTitle}</h1>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>Supplier: <span className="font-semibold">{vendorName}</span></div>
          <div>Offer ID: <span className="font-mono">{String(bid._id).slice(-8)}</span></div>
          <div>Status: <span className="font-semibold capitalize">{String(bid.status || "").replace("_", " ")}</span></div>
          <div>Printed: {format(new Date(), "d MMM yyyy HH:mm")}</div>
          {bid.submittedAt && <div>Submitted: {format(new Date(bid.submittedAt), "d MMM yyyy HH:mm")}</div>}
          {bid.withdrawnAt && <div>Withdrawn: {format(new Date(bid.withdrawnAt), "d MMM yyyy HH:mm")}</div>}
        </div>
      </header>

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Summary</h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr><td className="py-1 pr-4 text-black/60 w-40">Total price</td><td className="py-1 font-semibold">{money(bid.totalPrice, currency)}</td></tr>
            <tr><td className="py-1 pr-4 text-black/60">Currency</td><td className="py-1">{currency}</td></tr>
            <tr><td className="py-1 pr-4 text-black/60">Validity</td><td className="py-1">{bid.validityDays} days</td></tr>
          </tbody>
        </table>
      </section>

      {bid.lineItems?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Line items</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/20 text-left">
                <th className="py-1.5 font-medium">Description</th>
                <th className="py-1.5 font-medium text-right">Qty</th>
                <th className="py-1.5 font-medium">Unit</th>
                <th className="py-1.5 font-medium">Delivery</th>
                <th className="py-1.5 font-medium text-right">Unit price</th>
                <th className="py-1.5 font-medium text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {bid.lineItems.map((item: any, i: number) => (
                <tr key={i} className="border-b border-black/10 align-top">
                  <td className="py-2 pr-2">
                    <div>{item.description}</div>
                    {item.notes && <div className="text-xs text-black/60 mt-0.5 whitespace-pre-wrap">Remarks: {item.notes}</div>}
                    {item.customFields?.map((field: any, fi: number) => (
                      <div key={fi} className="text-xs text-black/60">{field.label}: {field.value}</div>
                    ))}
                  </td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 pl-2">{item.unit}</td>
                  <td className="py-2">{formatDelivery(item) || "—"}</td>
                  <td className="py-2 text-right">{Number(item.unitPrice || 0).toLocaleString()}</td>
                  <td className="py-2 text-right font-medium">{Number(item.totalPrice || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {(bid.clauseResponses?.length > 0 || bid.tender?.clauses?.length > 0) && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Terms response</h2>
          <div className="space-y-3">
            {(bid.tender?.clauses ?? bid.clauseResponses ?? []).map((clause: any, i: number) => {
              const response = (bid.clauseResponses ?? []).find((r: any) => clauseKey(r) === clauseKey(clause));
              const original = response?.originalBody || clause.body || "";
              const proposed = response?.proposedBody || original;
              const modified = Boolean(response?.accepted) && wordsDiffer(original, proposed);
              return (
                <div key={clause.slug || clause.kind || i} className="border border-black/15 rounded-md p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <div className="text-sm font-medium">{clause.title || response?.kind}</div>
                    {!response?.accepted && <Badge variant="outline">Not accepted</Badge>}
                    {response?.accepted && !modified && <Badge variant="success">Accepted as written</Badge>}
                    {modified && <Badge variant="destructive">Accepted with conditions</Badge>}
                  </div>
                  {modified ? (
                    <div className="text-sm"><ClauseDiffText original={original} proposed={proposed} /></div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{original}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {bid.technicalProposal && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Technical proposal</h2>
          <p className="text-sm whitespace-pre-wrap">{bid.technicalProposal}</p>
        </section>
      )}
      {bid.commercialProposal && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Commercial proposal</h2>
          <p className="text-sm whitespace-pre-wrap">{bid.commercialProposal}</p>
        </section>
      )}
      {bid.notes && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Additional notes</h2>
          <p className="text-sm whitespace-pre-wrap">{bid.notes}</p>
        </section>
      )}

      <section className="mt-10 border-t border-black/20 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-2">Digital signature</h2>
        {signed ? (
          <div className="text-sm space-y-1">
            <p>Digitally signed with DSC.</p>
            <p>Holder: <span className="font-medium">{signed.holderName}</span></p>
            <p>Certificate serial: <span className="font-mono">{signed.serialNumber}</span></p>
            {signed.issuer && <p>Issuer: {signed.issuer}</p>}
            <p>Signed at: {format(new Date(signed.signedAt), "d MMM yyyy HH:mm")}</p>
            <p className="break-all">Document hash (SHA-256): <span className="font-mono text-xs">{signed.documentHash}</span></p>
            {signed.signedPdfUrl && (
              <p className="print:hidden">
                <a href={signed.signedPdfUrl} className="text-primary underline" target="_blank" rel="noreferrer">
                  Download attached signed file
                </a>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-black/60">This offer has not been digitally signed.</p>
        )}
        <div className="mt-8 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="h-12 border-b border-black/40" />
            <p className="mt-1 text-xs text-black/60">Authorised signatory</p>
          </div>
          <div>
            <div className="h-12 border-b border-black/40" />
            <p className="mt-1 text-xs text-black/60">Date / company stamp</p>
          </div>
        </div>
      </section>
    </article>
  );
}
