import { ALL_CLAUSE_KINDS } from './constants';
import type { ClauseKind, ITenderClause } from './types';

export function clauseKey(clause: { kind: string; slug?: string; title?: string }): string {
  if (clause.kind === 'custom') return `custom:${clause.slug || clause.title || 'term'}`;
  return clause.kind;
}

export function matchesClause(
  clause: { kind: string; slug?: string; title?: string },
  response: { kind: string; slug?: string }
): boolean {
  return clauseKey(clause) === clauseKey(response);
}

export function makeCustomSlug(title: string): string {
  const base = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'term';
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${base}-${suffix}`;
}

export function normalizeTenderClauses(
  clauses: Array<{ kind: string; slug?: string; title: string; body: string; required: boolean }>
): ITenderClause[] {
  return clauses.map((c) => {
    const kind = c.kind as ClauseKind;
    if (kind !== 'custom') {
      return { kind, title: c.title, body: c.body, required: c.required };
    }
    return {
      kind: 'custom',
      slug: c.slug || makeCustomSlug(c.title),
      title: c.title,
      body: c.body,
      required: c.required,
    };
  });
}

export const clauseKindZodValues = ALL_CLAUSE_KINDS as unknown as [string, ...string[]];
