#!/usr/bin/env tsx
/**
 * Regenerate the TypeScript bindings for the deployed auction contract.
 *
 * Reads the latest deployment record from `deployments/<network>.json`
 * and runs `stellar contract bindings json` against the live contract id.
 * The output is written to `src/lib/auction-bindings.json` so the
 * front-end can import the typed spec.
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const ROOT = process.cwd();
const NETWORK = process.env.STELLAR_NETWORK ?? "testnet";
const RPC_URL =
  process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ??
  "Test SDF Network ; September 2015";

const recordPath = join(ROOT, "deployments", `${NETWORK}.json`);
if (!existsSync(recordPath)) {
  console.error(
    `No deployment record for ${NETWORK}. Run "make deploy" first.`,
  );
  process.exit(1);
}
const record = JSON.parse(readFileSync(recordPath, "utf8")) as {
  contractId: string;
  wasmHash: string;
};

const outDir = join(ROOT, "src", "lib");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const outPath = join(outDir, "auction-bindings.json");
console.log(`$ stellar contract bindings json --id ${record.contractId}`);
execSync(
  `stellar contract bindings json ` +
    `--rpc-url ${RPC_URL} ` +
    `--network-passphrase "${NETWORK_PASSPHRASE}" ` +
    `--id ${record.contractId} > ${outPath}`,
  { stdio: "inherit", shell: "/bin/zsh" },
);

console.log(`\n✅ Wrote bindings to ${outPath}`);
