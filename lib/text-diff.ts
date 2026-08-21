export type DiffPart = {
  value: string;
  type: 'same' | 'added' | 'removed';
};

function tokenize(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

export function wordsDiffer(original?: string | null, proposed?: string | null): boolean {
  return (original ?? '').trim() !== (proposed ?? '').trim();
}

export function acceptedWithConditions(response?: {
  accepted?: boolean;
  originalBody?: string | null;
  proposedBody?: string | null;
} | null): boolean {
  if (!response?.accepted || !response.proposedBody) return false;
  return wordsDiffer(response.originalBody, response.proposedBody);
}

export function diffWords(original: string, proposed: string): DiffPart[] {
  const a = tokenize(original);
  const b = tokenize(proposed);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      parts.push({ value: a[i], type: 'same' });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      parts.push({ value: a[i], type: 'removed' });
      i += 1;
    } else {
      parts.push({ value: b[j], type: 'added' });
      j += 1;
    }
  }
  while (i < n) {
    parts.push({ value: a[i], type: 'removed' });
    i += 1;
  }
  while (j < m) {
    parts.push({ value: b[j], type: 'added' });
    j += 1;
  }
  return parts;
}
