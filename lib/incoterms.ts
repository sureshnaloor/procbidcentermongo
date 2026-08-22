// Incoterms 2020 (ICC) — the current edition; 11 rules.
export type Incoterm = {
  code: string;
  name: string;
  transport: 'any' | 'sea';
  hint: string;
};

export const INCOTERMS: Incoterm[] = [
  { code: 'EXW', name: 'Ex Works', transport: 'any', hint: 'Buyer collects at seller’s premises' },
  { code: 'FCA', name: 'Free Carrier', transport: 'any', hint: 'Seller hands over to buyer’s carrier' },
  { code: 'CPT', name: 'Carriage Paid To', transport: 'any', hint: 'Seller pays carriage to destination' },
  { code: 'CIP', name: 'Carriage and Insurance Paid To', transport: 'any', hint: 'CPT plus seller-paid insurance' },
  { code: 'DAP', name: 'Delivered at Place', transport: 'any', hint: 'Seller delivers ready for unloading' },
  { code: 'DPU', name: 'Delivered at Place Unloaded', transport: 'any', hint: 'Seller delivers and unloads' },
  { code: 'DDP', name: 'Delivered Duty Paid', transport: 'any', hint: 'Seller bears all costs incl. duties' },
  { code: 'FAS', name: 'Free Alongside Ship', transport: 'sea', hint: 'Alongside vessel at named port' },
  { code: 'FOB', name: 'Free on Board', transport: 'sea', hint: 'On board vessel at named port' },
  { code: 'CFR', name: 'Cost and Freight', transport: 'sea', hint: 'Seller pays freight to destination port' },
  { code: 'CIF', name: 'Cost, Insurance and Freight', transport: 'sea', hint: 'CFR plus seller-paid insurance' },
];

export const INCOTERM_CODES = INCOTERMS.map((t) => t.code) as [string, ...string[]];

export function incotermLabel(code?: string): string | null {
  if (!code) return null;
  const found = INCOTERMS.find((t) => t.code === code);
  return found ? `${found.code} — ${found.name}` : code;
}
