"use client";

import { useState } from "react";

import { useTransactions } from "@/hooks/useTransaction";
import { useWallet } from "@/hooks/useWallet";
import {
  ContractCallError,
  describeContractError,
  submitAuctionCall,
  type Auction,
} from "@/lib/contract";
import { type AuctionEvent } from "@/lib/events";


function toBigInt(v: string | number | bigint | null | undefined): bigint {
  if (typeof v === "bigint") return v;
  if (v == null || v === "") return 0n;
  return BigInt(v as string | number);
}

const shorten = (pk: string) => `${pk.slice(0, 6)}…${pk.slice(-4)}`;

export function BidPanel({
  auction,
  onSubmitted,
}: {
  auction: Auction;
  onSubmitted?: (e: AuctionEvent) => void;
}) {
  const { wallet } = useWallet();
  const { submit } = useTransactions();
  const [amount, setAmount] = useState<string>(() => {
    // Suggested next bid = current highest + 1 stroop, or the
    // starting price + 1 if no bids yet. The fallback must be
    // explicit: `"0" || starting_price` returns `"0"` because
    // non-empty strings are truthy in JS, which would suggest a
    // bid below the reserve and get rejected by the contract
    // (ContractError::FirstBidBelowStartingPrice, code 9).
    const highest = toBigInt(auction.highest_bid);
    const starting = toBigInt(auction.starting_price);
    const base = highest > 0n ? highest + 1n : starting + 1n;
    return base.toString();
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expired = Math.floor(Date.now() / 1000) >= auction.end_time;
  const isSeller = wallet.publicKey === auction.seller;
  const canBid =
    !expired && !auction.settled && wallet.publicKey && !isSeller;

  function friendlyError(e: unknown): string {
    if (e instanceof ContractCallError) {
      return e.code != null
        ? describeContractError(e.code)
        : e.message;
    }
    if (e instanceof Error) return e.message;
    return String(e);
  }

  async function handleBid() {
    if (!wallet.publicKey) {
      setError("Connect a wallet first");
      return;
    }
    if (isSeller) {
      setError("Seller cannot bid on own auction");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { hash, wait } = await submitAuctionCall(
        "bid",
        [
          { name: "auction_id", value: auction.id },
          { name: "bidder", value: wallet.publicKey },
          { name: "amount", value: amount },
        ],
        wallet.publicKey,
      );
      submit({
        hash,
        label: `Bid ${amount} on auction #${auction.id}`,
        finalize: async (update) => {
          try {
            await wait();
            update({
              status: "success",
            } as Parameters<typeof update>[0]);
            onSubmitted?.({
              type: "BidPlaced",
              auction_id: auction.id,
              bidder: wallet.publicKey!,
              amount,
              highest_bid: amount,
              end_time: auction.end_time,
            });
            return { ok: true };
          } catch (e) {
            const msg = friendlyError(e);
            update({
              status: "failed",
              errorMessage: msg,
              errorCode: e instanceof ContractCallError ? e.code : null,
            } as Parameters<typeof update>[0]);
            setError(msg);
            return { ok: false, error: msg };
          }
        },
      });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSettle() {
    if (!wallet.publicKey) {
      setError("Connect a wallet to settle");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { hash, wait } = await submitAuctionCall(
        "settle",
        [{ name: "auction_id", value: auction.id }],
        wallet.publicKey,
      );
      submit({
        hash,
        label: `Settle auction #${auction.id}`,
        finalize: async (update) => {
          try {
            await wait();
            update({ status: "success" } as Parameters<typeof update>[0]);
            return { ok: true };
          } catch (e) {
            const msg = friendlyError(e);
            update({
              status: "failed",
              errorMessage: msg,
              errorCode: e instanceof ContractCallError ? e.code : null,
            } as Parameters<typeof update>[0]);
            setError(msg);
            return { ok: false, error: msg };
          }
        },
      });
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bid-panel">
      <div className="bid-stats">
        <div>
          <span className="stat-label">Current bid</span>
          <span className="stat-value">
            {auction.highest_bid || "—"} {shorten(auction.token)}
          </span>
        </div>
        <div>
          <span className="stat-label">Reserve</span>
          <span className="stat-value">{auction.reserve_price}</span>
        </div>
        <div>
          <span className="stat-label">Bids</span>
          <span className="stat-value">{auction.bid_count}</span>
        </div>
        {auction.highest_bidder && (
          <div>
            <span className="stat-label">Leader</span>
            <span className="stat-value">{shorten(auction.highest_bidder)}</span>
          </div>
        )}
      </div>

      {auction.settled ? (
        <div className="settled-note">
          {auction.won
            ? `Won by ${shorten(auction.highest_bidder ?? "?")} for ${auction.highest_bid}`
            : "Ended without meeting reserve"}
        </div>
      ) : expired ? (
        <button
          className="btn btn-primary"
          onClick={handleSettle}
          disabled={submitting}
        >
          {submitting ? "Settling…" : "Settle auction"}
        </button>
      ) : (
        <div className="bid-form">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Bid amount"
          />
          <button
            className="btn btn-primary"
            onClick={handleBid}
            disabled={!canBid || submitting}
          >
            {submitting
              ? "Submitting…"
              : !wallet.publicKey
                ? "Connect wallet to bid"
                : isSeller
                  ? "Seller cannot bid"
                  : "Place bid"}
          </button>
        </div>
      )}

      {error && <div className="bid-error">{error}</div>}
    </div>
  );
}
