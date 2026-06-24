"use client";

import { useState } from "react";

import { useWallet } from "@/hooks/useWallet";

const shorten = (pk: string) => `${pk.slice(0, 6)}…${pk.slice(-4)}`;

function formatWalletError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const maybeMessage = (e as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "Wallet action failed";
}

export function WalletButton() {
  const { wallet, connect, disconnect, warmup, nativeBalance } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (wallet.publicKey) {
    return (
      <div className="wallet connected">
        <div className="wallet-stack">
          <span className="wallet-pk">{shorten(wallet.publicKey)}</span>
          {wallet.walletId && (
            <span className="wallet-source">({wallet.walletId})</span>
          )}
          {nativeBalance !== null && (
            <span className="wallet-balance" title="Native (XLM) balance">
              {nativeBalance} XLM
            </span>
          )}
        </div>
        {!wallet.networkMatches && (
          <span
            className="wallet-warning"
            title={`Wallet network (${wallet.walletNetwork}) does not match the app (${wallet.appNetwork}).`}
          >
            ⚠ wrong network
          </span>
        )}
        <button
          className="btn btn-small"
          onClick={async () => {
          try {
            setError(null);
            setBusy(true);
            await disconnect();
          } catch (e) {
            setError(formatWalletError(e));
          } finally {
            setBusy(false);
          }
          }}
          disabled={busy}
        >
          {busy ? "Disconnecting…" : "Disconnect"}
        </button>
        {error && <div className="wallet-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="wallet">
      <button
        className="btn btn-small wallet-connect-btn"
        disabled={busy || !wallet.ready}
        onPointerEnter={() => {
          void warmup();
        }}
        onFocus={() => {
          void warmup();
        }}
        onClick={async () => {
          try {
            setError(null);
            setBusy(true);
            await warmup();
            await connect();
          } catch (e) {
            setError(formatWalletError(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Connecting…" : "Connect wallet"}
      </button>
      {error && <div className="wallet-error">{error}</div>}
    </div>
  );
}
