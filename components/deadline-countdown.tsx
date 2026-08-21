"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function DeadlineCountdown({ deadline }: { deadline: string | Date }) {
  const end = new Date(deadline).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (Number.isNaN(end)) return null;
  const ms = end - now;
  if (ms <= 0) {
    return <span className="text-destructive font-medium">Deadline passed</span>;
  }

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const label = days > 0
    ? `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)} remaining`
    : `${pad(hours)}:${pad(mins)}:${pad(secs)} remaining`;

  return <span className="text-destructive font-medium tabular-nums">{label}</span>;
}
