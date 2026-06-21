"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to `endTime` (epoch seconds). Auto-recalculates
 * every second. Shows "Ended" when expired.
 */
export function Countdown({ endTime }: { endTime: number }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, endTime - now);
  if (left === 0) {
    return <span className="countdown ended">Ended</span>;
  }
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <span className="countdown">
      {d > 0 ? `${d}d ` : ""}
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}
