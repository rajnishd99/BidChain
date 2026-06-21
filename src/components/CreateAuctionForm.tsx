"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTransactions } from "@/hooks/useTransaction";
import { useWallet } from "@/hooks/useWallet";
import { config } from "@/lib/config";
import {
  ContractCallError,
  describeContractError,
  submitAuctionCall,
} from "@/lib/contract";

export function CreateAuctionForm() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { submit } = useTransactions();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [token, setToken] = useState(config.defaultTokenAddress);
  const [reserve, setReserve] = useState("100");
  const [starting, setStarting] = useState("50");
  const [duration, setDuration] = useState("300");
  const [antiSnipeWindow, setAntiSnipeWindow] = useState("60");
  const [antiSnipeExtension, setAntiSnipeExtension] = useState("120");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  function friendlyError(e: unknown): string {
    if (e instanceof ContractCallError) {
      return e.code != null ? describeContractError(e.code) : e.message;
    }
    if (e instanceof Error) return e.message;
    return String(e);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wallet.publicKey) {
      setError("Connect a wallet first");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const { hash, wait } = await submitAuctionCall(
        "create_auction",
        [
          { name: "seller", value: wallet.publicKey },
          { name: "token", value: token },
          { name: "title", value: title.toUpperCase().replace(/\s+/g, "_").slice(0, 28) || "AUCTION" },
          { name: "description", value: description.toUpperCase().replace(/\s+/g, "_").slice(0, 28) || "NONE" },
          { name: "reserve_price", value: reserve },
          { name: "starting_price", value: starting },
          { name: "duration_seconds", value: Number(duration) },
          { name: "anti_snipe_window", value: Number(antiSnipeWindow) },
          { name: "anti_snipe_extension", value: Number(antiSnipeExtension) },
        ],
        wallet.publicKey,
      );
      submit({
        hash,
        label: `Create auction "${title || "AUCTION"}"`,
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
      setSuccessId(0);
      setTimeout(() => router.push("/auctions"), 1500);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={28}
          required
          placeholder="Rare Collectible"
        />
      </label>
      <label>
        Description
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={28}
          placeholder="Genesis edition"
        />
      </label>
      <label>
        Settlement token (SAC address)
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
          spellCheck={false}
          placeholder="C… (Stellar Asset Contract)"
        />
      </label>
      <div className="form-row">
        <label>
          Reserve price
          <input
            type="number"
            min="1"
            value={reserve}
            onChange={(e) => setReserve(e.target.value)}
            required
          />
        </label>
        <label>
          Starting price
          <input
            type="number"
            min="1"
            value={starting}
            onChange={(e) => setStarting(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Duration (seconds)
          <input
            type="number"
            min="10"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </label>
        <label>
          Anti-snipe window (s)
          <input
            type="number"
            min="0"
            value={antiSnipeWindow}
            onChange={(e) => setAntiSnipeWindow(e.target.value)}
            required
          />
        </label>
      </div>
      <label>
        Anti-snipe extension (s)
        <input
          type="number"
          min="0"
          value={antiSnipeExtension}
          onChange={(e) => setAntiSnipeExtension(e.target.value)}
          required
        />
      </label>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={submitting || !wallet.publicKey}
      >
        {submitting
          ? "Submitting…"
          : wallet.publicKey
            ? "Create auction"
            : "Connect wallet to create"}
      </button>

      {error && <div className="form-error">{error}</div>}
      {successId !== null && (
        <div className="form-success">
          ✅ Auction created. Redirecting…
        </div>
      )}
    </form>
  );
}
