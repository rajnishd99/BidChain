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
    return scValToNative(sim.result.retval) as T;
  }
  return undefined as unknown as T;
}
