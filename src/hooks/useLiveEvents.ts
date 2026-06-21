"use client";

import { useEffect, useRef, useState } from "react";

import { fetchEvents, type AuctionEvent } from "@/lib/events";

export function useLiveEvents(
  intervalMs = 4000,
  maxEvents = 200,
): {
  events: AuctionEvent[];
  lastEvent: AuctionEvent | null;
  error: string | null;
  refresh: () => void;
} {
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<AuctionEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const cursorRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const { events: newEvents, cursor } = await fetchEvents(
          undefined,
          cursorRef.current,
        );
        if (cancelled) return;
        cursorRef.current = cursor;
        if (newEvents.length > 0) {
          setLastEvent(newEvents[newEvents.length - 1]);
          setEvents((prev) => [...newEvents, ...prev].slice(0, maxEvents));
        }
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    };
    poll();
    const t = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [intervalMs, maxEvents, tick]);

  return {
    events,
    lastEvent,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
