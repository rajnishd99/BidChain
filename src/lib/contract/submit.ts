/**
 * Build / prepare / sign (via the Stellar Wallets Kit) / submit a
 * write-call to the auction contract. Decodes the contract error
 * code (if any) and rethrows as a `ContractCallError` so callers
 * can surface a human-readable message.
 *
 * Per spec §5.1, every write-call should go through an explicit
 * `idle → pending → success | failed` state machine. This module
 * only implements the "submit + wait" half — the state machine
 * lives in the React layer (see `src/hooks/useTransaction.ts`).
 */

"use client";

import {
  Address,
  nativeToScVal,
  rpc,
  TransactionBuilder,
  Transaction,
  xdr,
} from "@stellar/stellar-sdk";

import { config } from "@/lib/config";
import { getKitHandle } from "@/lib/wallet/kit";

import { contract, getRpc } from "./client";

export type InvokeArg = { name: string; value: unknown };

function toScVal(name: string, value: unknown): xdr.ScVal {
  switch (name) {
    case "auction_id":
      return nativeToScVal(value as number | bigint, { type: "u64" });
    case "seller":
    case "token":
    case "bidder":
    case "user":
      return new Address(value as string).toScVal();
    case "title":
    case "description":
      return nativeToScVal(String(value), { type: "symbol" });
    case "reserve_price":
    case "starting_price":
    case "amount":
      return nativeToScVal(BigInt(value as string | number), { type: "i128" });
    case "duration_seconds":
    case "anti_snipe_window":
    case "anti_snipe_extension":
      return nativeToScVal(Number(value), { type: "u64" });
    default:
      throw new Error(`unknown arg: ${name}`);
  }
}

export class ContractCallError extends Error {
  code: number | null;
  constructor(message: string, code: number | null = null) {
    super(message);
    this.name = "ContractCallError";
    this.code = code;
  }
}

/**
 * Submit a write-call and return both the in-flight hash and a
 * `Promise<rpc.Api.GetSuccessfulTransactionResponse>` that resolves
 * once the transaction is in a terminal state.
 */
export async function submitAuctionCall(
  method: string,
  args: InvokeArg[],
  publicKey: string,
): Promise<{
  hash: string;
  wait: () => Promise<rpc.Api.GetSuccessfulTransactionResponse>;
}> {
  if (!config.auctionContractId) {
    throw new ContractCallError("Auction contract id not configured");
  }
  const scArgs = args.map((a) => toScVal(a.name, a.value));
  const op = contract().call(method, ...scArgs);

  const acc = await getRpc().getAccount(publicKey);
  const tx = new TransactionBuilder(acc, {
    fee: "100000",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(op as unknown as Parameters<typeof TransactionBuilder.prototype.addOperation>[0])
    .setTimeout(120)
    .build();

  const prepared = await getRpc().prepareTransaction(tx);
  const { signedTxXdr } = await getKitHandle().signTransaction(
    prepared.toXDR(),
    { networkPassphrase: config.networkPassphrase, address: publicKey },
  );
  const signed = TransactionBuilder.fromXDR(
    signedTxXdr,
    config.networkPassphrase,
  ) as Transaction;
  const sent = await getRpc().sendTransaction(signed);

  const hash = (sent as { hash?: string }).hash ?? "";
  const wait = () => awaitTransaction(hash);
  return { hash, wait };
}

async function awaitTransaction(
  hash: string,
  opts: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<rpc.Api.GetSuccessfulTransactionResponse> {
  const intervalMs = opts.intervalMs ?? 2000;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const start = Date.now();
  while (true) {
    const resp = await getRpc().getTransaction(hash);
    if (resp.status === "SUCCESS") {
      return resp as rpc.Api.GetSuccessfulTransactionResponse;
    }
    if (resp.status === "FAILED") {
      const failed = resp as rpc.Api.GetFailedTransactionResponse;
      // The SDK exposes the failure reason in different shapes
      // depending on the version; try a few known locations.
      const result: unknown =
        (failed as { result?: unknown }).result ??
        (failed as { resultXdr?: unknown }).resultXdr ??
        (failed as { resultMetaXdr?: unknown }).resultMetaXdr;
      throw new ContractCallError(
        `Transaction ${hash} failed: ${String(result)}`,
      );
    }
    if (Date.now() - start > timeoutMs) {
      throw new ContractCallError(`Transaction ${hash} timed out`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
