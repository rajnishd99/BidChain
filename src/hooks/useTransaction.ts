"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Lightweight in-memory + localStorage transaction store.
 *
 * Implements the spec §5.1 state machine:
 *   idle → pending → success | failed
 *
 * Each entry stores: hash, label, status, submittedAt, finalizedAt,
 * errorMessage.
 *
 * The store lives in module scope so it can be subscribed to from
 * any component (toast list, history page, etc.). Components that
 * want to render the list use `useTransactions()` to subscribe.
 */

export type TxStatus = "idle" | "pending" | "success" | "failed";

export type TxEntry = {
  id: string;
  hash: string;
  label: string;
  status: TxStatus;
  submittedAt: number;
  finalizedAt?: number;
  errorMessage?: string;
  errorCode?: number | null;
};

type Listener = (txs: TxEntry[]) => void;

const STORAGE_KEY = "bidchain:tx-history";

let _txs: TxEntry[] = [];
const _listeners = new Set<Listener>();

function emit() {
  for (const l of _listeners) l(_txs);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_txs));
    } catch {
      /* quota exceeded — ignore */
    }
  }
}

function loadFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as TxEntry[];
    if (Array.isArray(parsed)) _txs = parsed.slice(-100);
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  loadFromStorage();
}

export function useTransactions(): {
  transactions: TxEntry[];
  submit: (input: {
    hash: string;
    label: string;
    finalize: (
      update: (entry: TxEntry) => TxEntry,
    ) => Promise<{ ok: true } | { ok: false; error: string }>;
  }) => string;
  clear: () => void;
} {
  const [txs, setTxs] = useState<TxEntry[]>(_txs);

  useEffect(() => {
    const l: Listener = (next) => setTxs(next);
    _listeners.add(l);
    return () => {
      _listeners.delete(l);
    };
  }, []);

  const submit = useCallback(
    (input: {
      hash: string;
      label: string;
      finalize: (
        update: (entry: TxEntry) => TxEntry,
      ) => Promise<{ ok: true } | { ok: false; error: string }>;
    }): string => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: TxEntry = {
        id,
        hash: input.hash,
        label: input.label,
        status: "pending",
        submittedAt: Date.now(),
      };
      _txs = [entry, ..._txs].slice(0, 100);
      emit();

      // Kick off finalization. The caller is expected to await the
      // transaction inside `finalize` and update the entry on
      // success/failure.
      void input
        .finalize((cur) => {
          const idx = _txs.findIndex((t) => t.id === id);
          if (idx < 0) return cur;
          _txs = _txs
            .slice(0, idx)
            .concat([{ ..._txs[idx], ...cur, finalizedAt: Date.now() }])
            .concat(_txs.slice(idx + 1));
          emit();
          return _txs[idx];
        })
        .then((res) => {
          if (!res.ok) {
            const idx = _txs.findIndex((t) => t.id === id);
            if (idx < 0) return;
            _txs = _txs
              .slice(0, idx)
              .concat([
                {
                  ..._txs[idx],
                  status: "failed",
                  errorMessage: res.error,
                  finalizedAt: Date.now(),
                },
              ])
              .concat(_txs.slice(idx + 1));
            emit();
          }
        });

      return id;
    },
    [],
  );

  const clear = useCallback(() => {
    _txs = [];
    emit();
  }, []);

  return { transactions: txs, submit, clear };
}
