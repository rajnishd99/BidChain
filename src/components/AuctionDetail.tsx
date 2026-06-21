"use client";

import Link from "next/link";

import { BidPanel } from "@/components/BidPanel";
import { Countdown } from "@/components/Countdown";
import { EventFeed } from "@/components/EventFeed";
import { useAuction } from "@/hooks/useAuctions";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const shorten = (pk: string) =>
  pk.length > 12 ? `${pk.slice(0, 6)}…${pk.slice(-4)}` : pk;

export function AuctionDetail({ id }: { id: number }) {
  const { auction, loading, error, refresh } = useAuction(id);
  const { events } = useLiveEvents();
  const liveBids = events.filter(
    (e) =>
      (e.type === "BidPlaced" || e.type === "BidRefunded" || e.type === "AuctionExtended") &&
      e.auction_id === id,
  );

  if (loading) return <div className="banner">Loading auction…</div>;
  if (error || !auction)
    return (
      <div className="banner warning">
        Could not load auction #{id}. {error}
      </div>
    );

  return (
    <div className="detail-grid">
      <div>
        <h2>{auction.title}</h2>
        <div className="subtitle">
          {auction.description || "—"} · seller{" "}
          <span style={{ fontFamily: "ui-monospace, monospace" }}>
            {shorten(auction.seller)}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18 }}>
          <Countdown endTime={auction.end_time} />
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            ends {new Date(auction.end_time * 1000).toLocaleString()}
          </span>
        </div>

        <h3 style={{ margin: "0 0 10px" }}>Live activity</h3>
        {liveBids.length === 0 ? (
          <div className="banner">No bids yet — be the first.</div>
        ) : (
          <EventFeed events={liveBids} />
        )}

        <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
          <button className="btn" onClick={refresh}>
            Refresh
          </button>
          <Link href="/auctions" className="btn btn-ghost">
            ← Back to all auctions
          </Link>
        </div>
      </div>

      <div>
        <BidPanel auction={auction} onSubmitted={() => refresh()} />
        <div className="banner" style={{ marginTop: 16 }}>
          <strong>How settlement works:</strong> once the timer ends,
          anyone can call <code>settle()</code>. If the highest bid
          meets the reserve, the seller is paid automatically. Otherwise
          the highest bidder is refunded in full.
        </div>
      </div>
    </div>
  );
}
