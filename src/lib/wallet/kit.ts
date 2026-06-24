"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit.tech/stellar-wallets-kit/modules/utils";
import {
  KitEventType,
  Networks,
} from "@creit.tech/stellar-wallets-kit/types";

import { config } from "@/lib/config";

let isInitialized = false;

export const initWalletKit = () => {
  if (isInitialized) {
    return;
  }

  StellarWalletsKit.init({
    modules: defaultModules(),
    network: resolveKitNetwork(),
    authModal: {
      hideUnsupportedWallets: false,
      showInstallLabel: true,
    },
  });

  isInitialized = true;
};

export type KitLike = {
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

export function resolveKitNetwork(): Networks {
  const envName = (config.network ?? "testnet").toLowerCase();
  switch (envName) {
    case "mainnet":
    case "public":
      return Networks.PUBLIC;
    case "futurenet":
      return Networks.FUTURENET;
    case "testnet":
    default:
      return Networks.TESTNET;
  }
}

export { KitEventType, Networks, StellarWalletsKit };
