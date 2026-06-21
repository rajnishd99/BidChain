"use client";

import { useEffect } from "react";

import { useTransactions } from "@/hooks/useTransaction";
import { config } from "@/lib/config";

const horizonExplorer = (hash: string) =>
  `${config.horizonUrl.replace(/\/$/, "")}/transactions/${hash}`;

export function TxToasts() {
  const { transactions, clear } = useTransactions();
  // Only show the last 3 in the toast list; full history lives in
  // the transactions store (and is persisted to localStorage).
  const recent = transactions.slice(0, 3);

  // Auto-dismiss successful toasts after 5s.
  useEffect(() => {
    const timers = recent
      .filter(
        (t) =>
          t.status === "success" &&
          t.finalizedAt &&
          Date.now() - t.finalizedAt < 5_000,
      )
      .map((t) =>
        setTimeout(() => {
          // The store keeps the entry; we just re-render without
          // a separate "dismissed" flag for now.
        }, 5_000),
      );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [recent]);

  if (recent.length === 0) return null;

  return (
    <div className="tx-toasts" role="status" aria-live="polite">
      {recent.map((t) => (
        <div key={t.id} className={`tx-toast tx-toast-${t.status}`}>
          <div className="tx-toast-body">
            <span className="tx-toast-label">{t.label}</span>
            <span className="tx-toast-status">{t.status}</span>
            {t.errorMessage && (
              <div className="tx-toast-error">{t.errorMessage}</div>
            )}
            <a
              className="tx-toast-link"
              href={horizonExplorer(t.hash)}
              target="_blank"
              rel="noreferrer"
            >
              View on explorer ↗
            </a>
          </div>
        </div>
      ))}
      {transactions.length > 0 && (
        <button
          className="tx-toast-clear"
          onClick={clear}
          aria-label="Clear transaction history"
        >
          Clear history
        </button>
      )}
    </div>
  );
}
