"use client";

import { useCallback, useEffect, useState } from "react";

import {
  KitEventType,
  StellarWalletsKit,
  initWalletKit,
  setKitHandle,
} from "@/lib/wallet/kit";
import { config } from "@/lib/config";

export type WalletState = {
  publicKey: string | null;
  /** id of the connected wallet module, e.g. "freighter", "albedo" */
  walletId: string | null;
  /** network the wallet reports it is on (from the kit) */
  walletNetwork: string | null;
  /** network the app is configured for */
  appNetwork: string;
  /** does the wallet's network match the app's network? */
  networkMatches: boolean;
  ready: boolean;
};

const initialWalletState: WalletState = {
  publicKey: null,
  walletId: null,
  walletNetwork: null,
  appNetwork: config.network,
  networkMatches: true,
  ready: false,
};

type WalletListener = () => void;
let sharedWalletState: WalletState = initialWalletState;
let sharedNativeBalance: string | null = null;
const walletListeners = new Set<WalletListener>();
let kitReady = false;
let kitListenersBound = false;

function emitWalletState() {
  for (const listener of walletListeners) {
    listener();
  }
}

function patchWalletState(patch: Partial<WalletState>) {
  sharedWalletState = { ...sharedWalletState, ...patch };
  emitWalletState();
}

function setNativeBalance(balance: string | null) {
  sharedNativeBalance = balance;
  emitWalletState();
}

function subscribeWallet(listener: WalletListener): () => void {
  walletListeners.add(listener);
  return () => {
    walletListeners.delete(listener);
  };
}

async function ensureKitRuntime(): Promise<void> {
  if (kitReady) {
    return;
  }

  initWalletKit();
  setKitHandle({
    signTransaction: (xdr, opts) =>
      StellarWalletsKit.signTransaction(xdr, {
        networkPassphrase: opts?.networkPassphrase ?? config.networkPassphrase,
        address: opts?.address,
      }),
  });

  if (!kitListenersBound) {
    kitListenersBound = true;
    StellarWalletsKit.on(KitEventType.WALLET_SELECTED, (event) => {
      patchWalletState({ walletId: event.payload.id ?? null });
    });
    StellarWalletsKit.on(KitEventType.STATE_UPDATED, (event) => {
      const walletNet = event.payload.networkPassphrase ?? null;
      patchWalletState({
        publicKey: event.payload.address ?? null,
        walletNetwork: walletNet,
        networkMatches: walletNet
          ? walletNet.toLowerCase() === config.networkPassphrase.toLowerCase()
          : true,
        ready: true,
      });
    });
  }

  try {
    const { address } = await StellarWalletsKit.getAddress();
    patchWalletState({ publicKey: address, ready: true });
  } catch {
    patchWalletState({ publicKey: null, ready: true });
  }

  kitReady = true;
}

export function useWallet(): {
  wallet: WalletState;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  warmup: () => Promise<void>;
  /** Native (XLM) balance of the connected address, or null. */
  nativeBalance: string | null;
  refreshBalance: () => Promise<void>;
} {
  const [wallet, setWallet] = useState<WalletState>({
    ...sharedWalletState,
  });
  const [nativeBalance, setNativeBalanceState] = useState<string | null>(sharedNativeBalance);

  const refreshBalance = useCallback(async () => {
    if (!wallet.publicKey) {
      setNativeBalance(null);
      return;
    }
    try {
      const horizonUrl = config.horizonUrl;
      const r = await fetch(`${horizonUrl}/accounts/${wallet.publicKey}`);
      if (!r.ok) {
        setNativeBalance(null);
        return;
      }
      const j = (await r.json()) as {
        balances?: Array<{ asset_type?: string; balance?: string }>;
      };
      const native = j.balances?.find((b) => b.asset_type === "native");
      setNativeBalance(native?.balance ?? "0");
    } catch {
      setNativeBalance(null);
    }
  }, [wallet.publicKey]);

  useEffect(() => {
    const unsubscribe = subscribeWallet(() => {
      setWallet(sharedWalletState);
      setNativeBalanceState(sharedNativeBalance);
    });
    void ensureKitRuntime().catch(() => {
      patchWalletState({ ready: true });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const connect = useCallback(async (): Promise<string> => {
    await ensureKitRuntime();
    const { address } = await StellarWalletsKit.authModal();
    patchWalletState({ publicKey: address, ready: true });
    return address;
  }, []);

  const warmup = useCallback(async (): Promise<void> => {
    await ensureKitRuntime();
  }, []);

  const disconnect = useCallback(async () => {
    await ensureKitRuntime();
    await StellarWalletsKit.disconnect();
    patchWalletState({
      publicKey: null,
      walletId: null,
      walletNetwork: null,
      networkMatches: true,
      ready: true,
    });
    setNativeBalance(null);
    kitReady = false;
  }, []);

  return { wallet, connect, disconnect, warmup, nativeBalance, refreshBalance };
}
