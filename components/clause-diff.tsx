"use client";

import { diffWords, wordsDiffer } from "@/lib/text-diff";

export function ClauseDiffText({
  original,
  proposed,
  className = "",
}: {
  original: string;
  proposed: string;
  className?: string;
}) {
  if (!wordsDiffer(original, proposed)) {
    return <span className={`whitespace-pre-wrap ${className}`}>{proposed || original}</span>;
  }

  const parts = diffWords(original, proposed);
  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {parts.map((part, i) => {
        if (part.type === "same") return <span key={i}>{part.value}</span>;
        if (part.type === "removed") {
          return (
            <span key={i} className="text-muted-foreground line-through decoration-red-500/70">
              {part.value}
            </span>
          );
        }
        return (
          <span key={i} className="font-semibold text-red-600 dark:text-red-400">
            {part.value}
          </span>
        );
      })}
    </span>
  );
}
