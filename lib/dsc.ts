type DscLike = {
  enabled?: boolean;
  holderName?: string;
  serialNumber?: string;
  validFrom?: string | Date;
  validTo?: string | Date;
} | null | undefined;

export function hasRegisteredDsc(dsc?: DscLike): boolean {
  return Boolean(dsc?.enabled && dsc.holderName?.trim() && dsc.serialNumber?.trim());
}

export function dscIsValidOn(dsc: DscLike, at = new Date()): boolean {
  if (!hasRegisteredDsc(dsc)) return false;
  if (dsc?.validFrom && new Date(dsc.validFrom).getTime() > at.getTime()) return false;
  if (dsc?.validTo && new Date(dsc.validTo).getTime() < at.getTime()) return false;
  return true;
}
