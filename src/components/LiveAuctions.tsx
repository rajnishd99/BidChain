"use client";

import { useAuctions } from "@/hooks/useAuctions";

import { AuctionCard } from "./AuctionCard";

export function LiveAuctions() {
  const { auctions, loading, error } = useAuctions();
  if (loading) return <div className="banner">Loading auctions…</div>;
  if (error)
    return (
      <div className="banner warning">
        Couldn&apos;t reach the network. {error}
      </div>
    );
  if (auctions.length === 0)
    return (
      <div className="banner">
        No auctions yet. Be the first to{" "}
        <a href="/create" style={{ color: "var(--primary)" }}>
          create one
        </a>
        .
      </div>
    );
  return (
    <div className="auction-grid">
      {auctions.map((a) => (
        <AuctionCard auction={a} key={a.id} />
      ))}
    </div>
  );
}
