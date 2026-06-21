"use client";

import { useEffect, useState } from "react";

import { auctionContract, type Auction } from "@/lib/contract";

export function useAuctions(): {
  auctions: Auction[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const ids = await auctionContract.list();
        const all = await Promise.all(ids.map((id) => auctionContract.get(id)));
        if (cancelled) return;
        const sorted = all
          .filter((a): a is Auction => Boolean(a))
          .sort((a, b) => b.id - a.id);
        setAuctions(sorted);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    auctions,
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}

export function useAuction(id: number): {
  auction: Auction | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const a = await auctionContract.get(id);
        if (cancelled) return;
        setAuction(a);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, tick]);

  return {
    auction,
    loading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
