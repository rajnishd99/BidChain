/**
 * Server-side RPC singleton and read-only contract helpers.
 * Browser entry points use `submit.ts` instead.
 */

import {
  Address,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import { config } from "@/lib/config";

let _rpc: rpc.Server | null = null;
export const getRpc = (): rpc.Server => {
  if (!_rpc) _rpc = new rpc.Server(config.rpcUrl, { allowHttp: false });
  return _rpc;
};

export const contract = (id: string = config.auctionContractId): Contract =>
  new Contract(id);

/**
 * Simulate a contract call and return the decoded value. Uses a
 * fixed testnet placeholder source — simulations don't need a
 * funded account.
 */
export async function readContract<T = unknown>(
  method: string,
  args: xdr.ScVal[] = [],
  contractId: string = config.auctionContractId,
): Promise<T> {
  if (!contractId) throw new Error("Auction contract id not configured");
  const source = new Address(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  );
  const acc = await getRpc().getAccount(source.toString());
  const op = contract(contractId).call(method, ...args);
  const tx = new TransactionBuilder(acc, {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();
  const sim = await getRpc().simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(
      `simulation error: ${(sim as { error?: string }).error ?? "unknown"}`,
    );
  }
  if ("result" in sim && sim.result) {
    // `scValToNative` returns a `bigint` for i128 / i256 / u64 / etc.
    // The bindings declare those fields as `string`, so coerce
    // BigInts to decimal strings here. Without this, downstream
    // code (e.g. BidPanel's useState default) can mix BigInts and
    // numbers and throw a "Cannot mix BigInt and other types" error.
    return bigintsToStrings(scValToNative(sim.result.retval)) as T;
  }
  return undefined as unknown as T;
}

/**
 * Walk a decoded Soroban value and convert every `bigint` to a
 * decimal string. This is a lossy round-trip for negative numbers
 * (the leading "-" is preserved) but matches what the rest of the
 * app expects for i128 / i256 / u64 fields. Object keys and array
 * elements are walked recursively; non-BigInt values are left
 * untouched.
 */
function bigintsToStrings(v: unknown): unknown {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(bigintsToStrings);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = bigintsToStrings(val);
    }
    return out;
  }
  return v;
}
