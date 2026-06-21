#!/usr/bin/env tsx
/**
 * BidChain contract deploy script.
 *
 * Builds the Soroban contract, deploys it to the configured Stellar
 * network, and writes the resulting contract id + ABI to disk for the
 * Next.js front-end to consume.
 *
 * Required env (or .env in repo root):
 *   STELLAR_NETWORK           - "testnet" | "mainnet" | "futurenet" (default: testnet)
 *   STELLAR_RPC_URL           - Soroban RPC URL (default: testnet)
 *   STELLAR_NETWORK_PASSPHRASE - Network passphrase (default: testnet)
 *   STELLAR_SOURCE            - Source identity / secret key (default: deployer)
 *
 * After deploy, writes:
 *   deployments/<network>.json   - { network, contractId, wasmHash, deployedAt }
 *   abi/auction.abi.json         - JSON ABI of the contract
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const ROOT = process.cwd();
const CONTRACTS_DIR = join(ROOT, "contracts");
const WASM_PATH = join(ROOT, "target", "wasm32v1-none", "release", "auction.wasm");
const ABI_DIR = join(ROOT, "abi");
const ABI_PATH = join(ABI_DIR, "auction.abi.json");
const DEPLOY_DIR = join(ROOT, "deployments");

const NETWORK = process.env.STELLAR_NETWORK ?? "testnet";
const RPC_URL =
  process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
const SOURCE = process.env.STELLAR_SOURCE ?? "deployer";

function run(cmd: string, opts: { cwd?: string } = {}): void {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, {
    cwd: opts.cwd ?? ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

function runCapture(cmd: string, opts: { cwd?: string } = {}): string {
  return execSync(cmd, {
    cwd: opts.cwd ?? ROOT,
    stdio: ["ignore", "pipe", "inherit"],
    env: process.env,
  })
    .toString()
    .trim();
}

function sha256OfFile(p: string): string {
  const buf = readFileSync(p);
  return createHash("sha256").update(buf).digest("hex");
}

function ensureDir(p: string) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function main() {
  console.log("=== BidChain deploy ===");
  console.log(`network:   ${NETWORK}`);
  console.log(`rpc:       ${RPC_URL}`);
  console.log(`source:    ${SOURCE}`);
  console.log(`wasm path: ${WASM_PATH}`);

  // 1. Build the WASM.
  run("stellar contract build", { cwd: CONTRACTS_DIR });
  if (!existsSync(WASM_PATH)) {
    throw new Error(`WASM not found at ${WASM_PATH} after build`);
  }

  // 2. Compute the local wasm hash (sha256 of the file).
  const wasmHash = sha256OfFile(WASM_PATH);
  console.log(`wasm hash: ${wasmHash}`);

  // 3. Deploy. `--alias auction` lets us invoke it by name next time.
  const contractId = runCapture(
    `stellar contract deploy ` +
      `--wasm ${WASM_PATH} ` +
      `--source ${SOURCE} ` +
      `--network ${NETWORK} ` +
      `--rpc-url ${RPC_URL} ` +
      `--network-passphrase "${NETWORK_PASSPHRASE}" ` +
      `--alias auction`,
  );
  console.log(`contract id: ${contractId}`);

  // 4. Inspect the contract and write the JSON ABI.
  ensureDir(ABI_DIR);
  run(`stellar contract info interface --wasm ${WASM_PATH} --output json > ${ABI_PATH}`);
  const abi = JSON.parse(readFileSync(ABI_PATH, "utf8"));

  // 5. Write the deployment record.
  ensureDir(DEPLOY_DIR);
  const record = {
    network: NETWORK,
    rpcUrl: RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    contractId,
    wasmHash,
    deployedAt: new Date().toISOString(),
    abiPath: ABI_PATH,
  };
  const recordPath = join(DEPLOY_DIR, `${NETWORK}.json`);
  writeFileSync(recordPath, JSON.stringify(record, null, 2));
  console.log(`\n✅ Deployed. Contract id: ${contractId}`);
  console.log(`   Wrote ${recordPath}`);
  console.log(`   Wrote ${ABI_PATH}`);
  console.log(`\nNext steps:`);
  console.log(`  echo 'NEXT_PUBLIC_AUCTION_CONTRACT_ID=${contractId}' >> .env`);
  console.log(`  pnpm dev   # start the Next.js app`);
}

try {
  main();
} catch (e) {
  console.error("Deploy failed:", e);
  process.exit(1);
}
