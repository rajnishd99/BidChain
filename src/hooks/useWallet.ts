"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { setKitHandle } from "@/lib/wallet/kit";
import { resolveKitNetwork } from "@/lib/wallet/kit";
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

export function useWallet(): {
  wallet: WalletState;
  connect: () => Promise<string>;
  disconnect: () => Promise<void>;
  /** Native (XLM) balance of the connected address, or null. */
  nativeBalance: string | null;
  refreshBalance: () => Promise<void>;
} {
  const [wallet, setWallet] = useState<WalletState>({
    publicKey: null,
    walletId: null,
    walletNetwork: null,
    appNetwork: config.network,
    networkMatches: true,
    ready: false,
  });
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  // Mirror of the active wallet id we get from WALLET_SELECTED
  // events. We never read StellarWalletsKit.selectedModule directly
  // because it's a throwing getter that raises `{ code: -3,
  // message: 'Please set the wallet first' }` until the user picks
  // a wallet via the auth modal.
  const walletIdRef = useRef<string | null>(null);

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
    let cancelled = false;
    const unbinds: Array<() => void> = [];

    (async () => {
      try {
        const { StellarWalletsKit, KitEventType } = await import(
          "@creit.tech/stellar-wallets-kit"
        );
        const { defaultModules } = await import(
          "@creit.tech/stellar-wallets-kit/modules/utils"
        );
        const net = await resolveKitNetwork();

        StellarWalletsKit.init({
          network: net.name as Parameters<typeof StellarWalletsKit.init>[0]["network"],
          modules: defaultModules(),
        });
        StellarWalletsKit.setNetwork(
          net.name as Parameters<typeof StellarWalletsKit.setNetwork>[0],
        );
        setKitHandle({
          signTransaction: (xdr, opts) =>
            StellarWalletsKit.signTransaction(xdr, {
              networkPassphrase: opts?.networkPassphrase ?? net.passphrase,
              address: opts?.address,
            }),
        });

        // Track the active wallet id via the dedicated event. This
        // is the supported way to learn the id — reading
        // `StellarWalletsKit.selectedModule` directly is a throwing
        // getter that raises `{ code: -3 }` until a wallet is set.
        unbinds.push(
          StellarWalletsKit.on(KitEventType.WALLET_SELECTED, (event) => {
            if (cancelled) return;
            walletIdRef.current = event.payload.id ?? null;
            setWallet((w) => ({ ...w, walletId: event.payload.id ?? null }));
          }),
        );

        unbinds.push(
          StellarWalletsKit.on(
            KitEventType.STATE_UPDATED,
            (event) => {
              if (cancelled) return;
              const walletNet = event.payload.networkPassphrase ?? null;
              setWallet((w) => ({
                ...w,
                publicKey: event.payload.address ?? null,
                walletNetwork: walletNet,
                networkMatches: walletNet
                  ? walletNet === net.passphrase
                  : w.networkMatches,
                ready: true,
              }));
            },
          ),
        );

        if (cancelled) return;
        // The kit's `getAddress()` may throw `{ code: -3 }` if no
        // wallet was ever selected (e.g. fresh visitor, hot-reload).
        // The kit throws a plain object, not an Error instance, so a
        // bare `catch {}` swallows it correctly.
        try {
          const { address } = await StellarWalletsKit.getAddress();
          if (!cancelled) {
            setWallet((w) => ({ ...w, publicKey: address, ready: true }));
          }
        } catch {
          if (!cancelled) {
            setWallet((w) => ({ ...w, publicKey: null, ready: true }));
          }
        }
      } catch {
        if (!cancelled) {
          setWallet((w) => ({ ...w, publicKey: null, ready: true }));
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const u of unbinds) {
        try {
          u();
        } catch {
          /* unbind may throw if the kit wasn't initialised */
        }
      }
    };
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const connect = useCallback(async (): Promise<string> => {
    const { StellarWalletsKit, KitEventType } = await import(
      "@creit.tech/stellar-wallets-kit"
    );
    const net = await resolveKitNetwork();
    const { address } = await StellarWalletsKit.authModal();
    // After authModal, the kit has fired a WALLET_SELECTED event
    // that our subscription captured; we just need to push the
    // public key into React state. Reading `selectedModule` would
    // also work now, but we avoid the throwing getter to keep the
    // path consistent.
    setWallet((w) => ({ ...w, publicKey: address, ready: true }));
    setKitHandle({
      signTransaction: (xdr, opts) =>
        StellarWalletsKit.signTransaction(xdr, {
          networkPassphrase: opts?.networkPassphrase ?? net.passphrase,
          address: opts?.address,
        }),
    });
    // Re-bind the event listeners defensively in case the kit was
    // re-initialised between mount and connect (HMR can do that).
    StellarWalletsKit.on(KitEventType.WALLET_SELECTED, (event) => {
      setWallet((w) => ({ ...w, walletId: event.payload.id ?? null }));
    });
    return address;
  }, []);

  const disconnect = useCallback(async () => {
    const { StellarWalletsKit } = await import(
      "@creit.tech/stellar-wallets-kit"
    );
    await StellarWalletsKit.disconnect();
    setWallet((w) => ({
      ...w,
      publicKey: null,
      walletId: null,
      ready: true,
    }));
    setNativeBalance(null);
  }, []);

  return { wallet, connect, disconnect, nativeBalance, refreshBalance };
}
