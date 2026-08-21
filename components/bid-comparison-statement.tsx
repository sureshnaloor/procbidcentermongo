"use client";

import { format } from "date-fns";
import { ClauseDiffText } from "@/components/clause-diff";
import { CLAUSE_KIND_LABELS, type ClauseKindConst } from "@/lib/constants";
import { PROCUREMENT_TYPES } from "@/lib/procurement";
import {
  chunkItems,
  clauseStatusLabel,
  extraBidLines,
  findClauseResponse,
  findMatchingLine,
  lineDelivery,
  lineOtherData,
  money,
  MAX_COMPARISON_REMARKS,
  vendorsPerPage,
  type PaperSize,
} from "@/lib/comparison";
import { acceptedWithConditions } from "@/lib/text-diff";

function statusLabel(status?: string) {
  return (status || "").replace(/_/g, " ");
}

function names(list: { name: string }[]) {
  if (!list.length) return "—";
  return list.map((item) => item.name).join(", ");
}

function clauseTitle(clause: any) {
  if (clause.title) return clause.title;
  return CLAUSE_KIND_LABELS[(clause.kind as ClauseKindConst) ?? "custom"] ?? clause.kind;
}

export function BidComparisonStatement({
  data,
  paper,
}: {
  data: any;
  paper: PaperSize;
}) {
  const tender = data.tender;
  const bids: any[] = data.bids ?? [];
  const typeMeta = PROCUREMENT_TYPES[tender.type as keyof typeof PROCUREMENT_TYPES];
  const currency = tender.currency || bids[0]?.currency || "USD";
  const boqItems: any[] = tender.boqItems ?? [];
  const extraRows = extraBidLines(
    bids.flatMap((bid) => bid.lineItems ?? []),
    boqItems.map((item: any) => item.description)
  );
  const extraKeys = [...new Set(extraRows.map((item: any) => item.description))];
  const lineRows = [
    ...boqItems.map((item: any) => ({
      key: item.description,
      description: item.description,
      originalQuantity: item.quantity,
      unit: item.unit,
      fromBoq: true,
    })),
    ...extraKeys
      .filter((desc) => !boqItems.some((item: any) => item.description === desc))
      .map((description) => {
        const sample = extraRows.find((item: any) => item.description === description);
        return {
          key: description,
          description,
          originalQuantity: sample?.originalQuantity ?? sample?.quantity,
          unit: sample?.unit || "",
          fromBoq: false,
        };
      }),
  ];

  const terms = (tender.clauses ?? []).filter((c: any) => c.kind !== "payment");
  const paymentClauses = (tender.clauses ?? []).filter((c: any) => c.kind === "payment");
  const perPage = vendorsPerPage(paper, Math.max(bids.length, 1));
  const sets = chunkItems(bids, perPage);
  const remarks: any[] = data.remarks ?? [];

  return (
    <article className={`comparison-statement comparison-statement-${paper} bg-white text-black p-4 sm:p-6 print:p-0 overflow-x-auto print:overflow-visible`}>
      {sets.map((set, setIdx) => (
        <section key={setIdx} className={`comparison-set ${setIdx > 0 ? "comparison-set-break" : ""}`}>
          <header className="border-b border-black/30 pb-3 mb-3">
            <p className="text-[10px] uppercase tracking-widest text-black/60">Comparison statement</p>
            <h1 className="text-xl font-bold leading-tight mt-0.5">{tender.title}</h1>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
              <div>Company: <span className="font-semibold">{data.company?.companyName}</span></div>
              <div>Type: <span className="font-semibold">{typeMeta?.label ?? tender.type}</span></div>
              <div>Status: <span className="font-semibold capitalize">{statusLabel(tender.status)}</span></div>
              <div>Currency: <span className="font-semibold">{currency}</span></div>
              {tender.location && <div>Location: <span className="font-semibold">{tender.location}</span></div>}
              {tender.bidDeadline && (
                <div>Bid deadline: <span className="font-semibold">{format(new Date(tender.bidDeadline), "d MMM yyyy")}</span></div>
              )}
              {tender.estimatedValue != null && (
                <div>Estimate: <span className="font-semibold">{money(tender.estimatedValue, currency)}</span></div>
              )}
              <div>Printed: <span className="font-semibold">{format(new Date(), "d MMM yyyy HH:mm")}</span></div>
            </div>
            {sets.length > 1 && (
              <p className="text-[10px] text-black/60 mt-1">Supplier set {setIdx + 1} of {sets.length}</p>
            )}
          </header>

          <div className="mb-4 text-[11px] border border-black/20 rounded-sm p-2">
            <div className="font-semibold uppercase tracking-wide text-[10px] mb-1">Participation</div>
            <div><span className="text-black/60">Invited ({data.participation?.invited?.length ?? 0}):</span> {names(data.participation?.invited ?? [])}</div>
            <div><span className="text-black/60">Quoted ({data.participation?.quoted?.length ?? 0}):</span> {names(data.participation?.quoted ?? [])}</div>
            <div><span className="text-black/60">Did not quote ({data.participation?.notQuoted?.length ?? 0}):</span> {names(data.participation?.notQuoted ?? [])}</div>
            <div><span className="text-black/60">Rejected ({data.participation?.rejected?.length ?? 0}):</span> {names(data.participation?.rejected ?? [])}</div>
          </div>

          {set.length === 0 ? (
            <p className="text-sm text-black/60 py-6">No submitted offers to compare on this package yet.</p>
          ) : (
            <>
              <table className="w-full border-collapse text-[10px] mb-4">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border border-black/20 p-1.5 text-left w-[22%]">Line item</th>
                    {set.map((bid) => (
                      <th key={bid._id} className="border border-black/20 p-1.5 text-left align-top">
                        <div className="font-bold text-[11px]">{bid.vendor?.companyName || "Supplier"}</div>
                        <div className="font-normal capitalize text-black/70">{statusLabel(bid.status)}</div>
                        <div className="font-semibold mt-0.5">{money(bid.totalPrice, bid.currency || currency)}</div>
                        <div className="font-normal text-black/70">Validity {bid.validityDays} days</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lineRows.length === 0 ? (
                    <tr>
                      <td className="border border-black/20 p-2" colSpan={1 + set.length}>No line items</td>
                    </tr>
                  ) : lineRows.map((row, idx) => (
                    <tr key={`${row.key}-${idx}`} className="align-top">
                      <td className="border border-black/20 p-1.5">
                        <div className="font-semibold">{idx + 1}. {row.description}</div>
                        <div className="text-black/70">
                          Original qty: {row.originalQuantity ?? "—"} {row.unit}
                        </div>
                      </td>
                      {set.map((bid) => {
                        const line = findMatchingLine(bid.lineItems, row.description);
                        if (!line) {
                          return (
                            <td key={bid._id} className="border border-black/20 p-1.5 text-black/50">Not quoted</td>
                          );
                        }
                        const orig = line.originalQuantity ?? row.originalQuantity;
                        const qtyChanged = orig != null && Number(line.quantity) !== Number(orig);
                        return (
                          <td key={bid._id} className="border border-black/20 p-1.5">
                            <div>Qty quoted: <span className="font-semibold">{line.quantity}</span> {line.unit || row.unit}
                              {qtyChanged ? <span className="text-black/60"> (orig. {orig})</span> : null}
                            </div>
                            <div>Unit rate: <span className="font-semibold">{money(line.unitPrice, bid.currency || currency)}</span></div>
                            <div>Line value: <span className="font-semibold">{money(line.totalPrice ?? (Number(line.quantity) * Number(line.unitPrice)), bid.currency || currency)}</span></div>
                            <div>Delivery: {lineDelivery(line)}</div>
                            {lineOtherData(line).map((part) => (
                              <div key={part} className="text-black/75">{part}</div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-neutral-50 font-semibold">
                    <td className="border border-black/20 p-1.5">Offer total</td>
                    {set.map((bid) => (
                      <td key={bid._id} className="border border-black/20 p-1.5">
                        {money(bid.totalPrice, bid.currency || currency)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <h2 className="text-[11px] font-bold uppercase tracking-wide mb-1">Terms and conditions</h2>
              {terms.length === 0 ? (
                <p className="text-[11px] text-black/60 mb-3">No terms were attached to this package.</p>
              ) : (
                <table className="w-full border-collapse text-[10px] mb-4">
                  <thead>
                    <tr className="bg-neutral-100">
                      <th className="border border-black/20 p-1.5 text-left w-[22%]">Clause</th>
                      {set.map((bid) => (
                        <th key={bid._id} className="border border-black/20 p-1.5 text-left">{bid.vendor?.companyName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {terms.map((clause: any) => (
                      <tr key={clause.slug || clause.kind} className="align-top">
                        <td className="border border-black/20 p-1.5 font-semibold">{clauseTitle(clause)}</td>
                        {set.map((bid) => {
                          const response = findClauseResponse(bid, clause);
                          return (
                            <td key={bid._id} className="border border-black/20 p-1.5">
                              <div className="font-semibold">{clauseStatusLabel(response)}</div>
                              {acceptedWithConditions(response) && (
                                <div className="mt-1">
                                  <ClauseDiffText original={response.originalBody || clause.body} proposed={response.proposedBody} />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h2 className="text-[11px] font-bold uppercase tracking-wide mb-1">Payment terms and supplier remarks</h2>
              <table className="w-full border-collapse text-[10px] mb-4">
                <thead>
                  <tr className="bg-neutral-100">
                    <th className="border border-black/20 p-1.5 text-left w-[22%]">Item</th>
                    {set.map((bid) => (
                      <th key={bid._id} className="border border-black/20 p-1.5 text-left">{bid.vendor?.companyName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(paymentClauses.length ? paymentClauses : [{ kind: "payment", title: "Payment terms", body: "" }]).map((clause: any) => (
                    <tr key={clause.slug || clause.kind || "payment"} className="align-top">
                      <td className="border border-black/20 p-1.5 font-semibold">{clauseTitle(clause) || "Payment terms"}</td>
                      {set.map((bid) => {
                        const response = findClauseResponse(bid, clause);
                        return (
                          <td key={bid._id} className="border border-black/20 p-1.5">
                            {response ? (
                              <>
                                <div className="font-semibold">{clauseStatusLabel(response)}</div>
                                {acceptedWithConditions(response) && (
                                  <div className="mt-1">
                                    <ClauseDiffText original={response.originalBody || clause.body} proposed={response.proposedBody} />
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-black/50">No payment clause response</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="align-top">
                    <td className="border border-black/20 p-1.5 font-semibold">Commercial / payment notes</td>
                    {set.map((bid) => (
                      <td key={bid._id} className="border border-black/20 p-1.5 whitespace-pre-wrap">{bid.commercialProposal || "—"}</td>
                    ))}
                  </tr>
                  <tr className="align-top">
                    <td className="border border-black/20 p-1.5 font-semibold">Supplier remarks</td>
                    {set.map((bid) => (
                      <td key={bid._id} className="border border-black/20 p-1.5 whitespace-pre-wrap">
                        {bid.notes ? <div>{bid.notes}</div> : <div>—</div>}
                        {bid.technicalProposal && (
                          <div className="mt-1"><span className="text-black/60">Technical: </span>{bid.technicalProposal}</div>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {setIdx === sets.length - 1 && (
            <div className="border border-black/30 p-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wide mb-2">Company remarks (up to {MAX_COMPARISON_REMARKS} levels)</h2>
              <div className="grid gap-2">
                {Array.from({ length: MAX_COMPARISON_REMARKS }, (_, i) => i + 1).map((level) => {
                  const remark = remarks.find((r: any) => r.level === level);
                  return (
                    <div key={level} className="border border-black/15 p-1.5 text-[10px] min-h-[3.2rem]">
                      <div className="font-semibold">Level {level}</div>
                      {remark ? (
                        <>
                          <div className="text-black/70">{remark.userName}{remark.designation ? `, ${remark.designation}` : ""}</div>
                          <div className="whitespace-pre-wrap mt-0.5">{remark.remarks}</div>
                        </>
                      ) : (
                        <div className="text-black/40 italic">No remark</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
