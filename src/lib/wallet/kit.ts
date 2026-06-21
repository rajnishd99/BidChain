/**
 * Stellar Wallets Kit glue.
 *
 * The kit is a static class that owns the connected address, the
 * selected wallet module, and the network. We wrap it in a tiny
 * browser-only `KitHandle` so the rest of the app doesn't have to
 * know about the kit's singleton semantics.
 */

"use client";

import type { Networks } from "@creit.tech/stellar-wallets-kit";

type KitLike = {
  signTransaction: (
    xdr: string,
    opts?: { networkPassphrase?: string; address?: string },
  ) => Promise<{ signedTxXdr: string; signerAddress?: string }>;
};

let current: KitLike | null = null;

export function setKitHandle(handle: KitLike | null): void {
  current = handle;
}

export function getKitHandle(): KitLike {
  if (!current) {
    throw new Error(
      "Stellar Wallets Kit is not initialised. Wrap the app in <WalletKitProvider />.",
    );
  }
  return current;
}

/** Resolved kit network + passphrase. */
export type KitNetwork = {
  name: string;
  passphrase: string;
};

export async function resolveKitNetwork(): Promise<KitNetwork> {
  const { Networks } = await import("@creit.tech/stellar-wallets-kit");
  const envName = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet").toLowerCase();
  const envPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
    "Test SDF Network ; September 2015";
  const map: Record<string, Networks> = {
    public: Networks.PUBLIC,
    mainnet: Networks.PUBLIC,
    testnet: Networks.TESTNET,
    futurenet: Networks.FUTURENET,
  };
  const network = map[envName] ?? (envName as unknown as Networks);
  return { name: String(network), passphrase: envPassphrase };
}
