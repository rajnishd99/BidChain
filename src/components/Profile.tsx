"use client";

import { useEffect, useState } from "react";

import { useWallet } from "@/hooks/useWallet";
import { auctionContract, type Reputation } from "@/lib/contract";

export function Profile() {
  const { wallet } = useWallet();
  const [rep, setRep] = useState<Reputation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey) {
      setRep(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    auctionContract
      .reputation(wallet.publicKey)
      .then((r) => !cancelled && setRep(r))
      .catch((e) => !cancelled && setError(String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [wallet.publicKey]);

  if (!wallet.publicKey)
    return <div className="banner">Connect a wallet to view your reputation.</div>;
  if (loading) return <div className="banner">Loading reputation…</div>;
  if (error) return <div className="banner warning">{error}</div>;
  if (!rep) return null;

  return (
    <div className="auction-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      <Stat label="Auctions created" value={rep.auctions_created} />
      <Stat label="Sold successfully" value={rep.auctions_won_as_seller} />
      <Stat label="Bids placed" value={rep.bids_placed} />
      <Stat label="Auctions won" value={rep.auctions_won_as_bidder} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="auction-card" style={{ alignItems: "center" }}>
      <div style={{ fontSize: 36, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "var(--muted)" }}>{label}</div>
    </div>
  );
}
