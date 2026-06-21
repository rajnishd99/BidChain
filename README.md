# BidChain

BidChain is a mini end-to-end Stellar + Soroban dApp: a sealed-bid
auction marketplace backed by a deployed Soroban smart contract on
Stellar Testnet, with live bid streaming driven by periodic on-chain
reads, transaction lifecycle feedback, and a clean Next.js 16 /
React 19 frontend.

## Submission Checklist (fill before submitting)

- Live demo link: https://bid-chain.vercel.app/
- Demo video link: https://drive.google.com/file/d/1iF0Lv9PZarlLz7wRZ4jUydp0fF5ULIrX/view?usp=sharing
- Test output screenshot (3+ passing tests): ✅ (see `cargo test` output below)
- Public GitHub repo link: `https://github.com/rajnishd99/BidChain`
- 3+ meaningful commits for Level 3: ✅

## Submission Overview

This project demonstrates:

- **Soroban smart contract** for `create_auction` / `bid` / `settle` / `get_auction` / `list_auctions` / `get_reputation`
- Contract deployment on **Stellar Testnet** via the official `stellar` CLI
- Contract reads and writes from a typed Next.js frontend
- **Live bid updates**: per-auction highest-bid and time-remaining recomputed every 5 s from the contract
- **Multi-wallet integration** with `StellarWalletsKit` (Freighter, Albedo, xBull, Lobstr, Hot Wallet, …)
- **Visible transaction lifecycle** feedback in the bid / create flows
- Wallet error handling for missing wallet, rejected signature, and unfunded accounts
- **Automatic refunds** of the previous leader on every new bid
- **Seller payout** on successful `settle`, **bidder refund** on a failed auction
- **Anti-snipe extension** when a bid lands close to the end time
- **On-chain reputation** counters (`auctions_created`, `bids_placed`, `auctions_won_as_seller`, `auctions_won_as_bidder`)
- Loading states and progress indicators during reads / writes
- TypeScript strict mode and a CI workflow (`typecheck` + `build` on the web app, `test` + WASM build on the contract)

## Key Features

- Anyone can create an auction with a reserve price, starting price, duration, and anti-snipe settings
- Anyone can bid — funds are held by the contract, not the seller
- Bids must be strictly greater than the current highest bid; the first bid must be ≥ the starting price
- The previous leader is automatically refunded in the same transaction as a new bid
- When the timer ends, anyone can call `settle()` — the seller is paid if the reserve was met, otherwise the highest bidder is refunded
- Bidding near the end of an auction extends the end time (`anti_snipe_window` / `anti_snipe_extension`)
- Live status bar per auction and a 5-second auto-refresh on the home feed
- Read-only browsing of auctions works even without a connected wallet
- Wallet errors are surfaced inline; no silent failures

## Screenshots

<table width="100%">
  <tr>
    <td align="center" width="50%">
      <strong>🏠 Home Feed</strong><br/><br/>
      <em><img width="2032" height="1161" alt="image" src="https://github.com/user-attachments/assets/5c74bea5-4e1d-40c3-bc44-553ba1716b7e" />
</em>
    </td>
    <td align="center" width="50%">
      <strong>🔌 Wallet Kit</strong><br/><br/>
      <em><img width="2032" height="1161" alt="Screenshot 2026-06-21 at 11 55 04 AM" src="https://github.com/user-attachments/assets/d0ea48ba-c0aa-4648-9ca9-9f6f2811f035" />
</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>💸 Bid Panel</strong><br/><br/>
      <em><img width="2032" height="1161" alt="image" src="https://github.com/user-attachments/assets/0fe0567f-604f-489b-a45f-0f85086f27ff" />
</em>
    </td>
    <td align="center" width="50%">
      <strong>✅ CI Results</strong><br/><br/>
      <em><img width="2032" height="1161" alt="image" src="https://github.com/user-attachments/assets/b5c94dcb-995f-4c16-9493-192d2888133e" />
</em>
    </td>
  </tr>
</table>

## Mobile responsive screenshot

<div align="center">
<em><img width="453" height="936" alt="image" src="https://github.com/user-attachments/assets/1f65b190-e463-49da-a768-3aefb5d6c010" />
</em>
</div>

## Deployed Contract

- **Network:** `Stellar Testnet`
- **Contract id:** `CDWOHA6LLJE53RYNOJBWQ4GV7FLHF56JL2C35CB55SG7ANYGISV7FPUO`
- **WASM hash:** `aad38720ba804358c62f281a1951e0177bc5d5ea344b69f8b03ce2b02d8c978f`
- **Deployed at:** `2026-06-21T03:46:34Z`
- **Stellar Lab:** <https://lab.stellar.org/r/testnet/contract/CDWOHA6LLJE53RYNOJBWQ4GV7FLHF56JL2C35CB55SG7ANYGISV7FPUO>
- **Soroban RPC:** `https://soroban-testnet.stellar.org`

Full deployment record (contract id, WASM hash, timestamps) lives in
[`deployments/testnet.json`](deployments/testnet.json) and is refreshed by
`make deploy`.

## Live Demo

`[TBD — deployed URL]`

## Setup

Run all commands from the **repo root** unless stated otherwise.

### Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0` (Next 16 requirement)
- **npm** ≥ 10 (the project ships a `package-lock.json`; CI uses `npm ci`)
- **Rust** stable with the `wasm32v1-none` target
  ```bash
  rustup target add wasm32v1-none
  ```
- **Stellar CLI** ≥ 23 (only required for `make deploy` / `make abi` / `make optimize`)
  ```bash
  cargo install --locked stellar-cli
  ```

### 1. Install

```bash
git clone https://github.com/rajnishd99/BidChain
cd bidchain
npm install
```

### 2. Environment

Copy `.env.example` to `.env`. The minimum keys consumed by the
front-end at build time are:

```env
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=CDWOHA6LLJE53RYNOJBWQ4GV7FLHF56JL2C35CB55SG7ANYGISV7FPUO
```

Server-side keys (`STELLAR_SOURCE`, `STELLAR_RPC_URL`,
`STELLAR_NETWORK_PASSPHRASE`) are read by the deploy / bind scripts
and must **not** be exposed to the browser.

### 3. Build & deploy the contract (optional, for redeploys)

```bash
make identity        # create & fund a 'deployer' identity on testnet
make build           # build the WASM
make deploy          # deploy to testnet, write deployments/testnet.json
```

`make deploy` writes the contract id to `deployments/testnet.json`
and `abi/auction.abi.json`. Copy the contract id into
`NEXT_PUBLIC_CONTRACT_ID` in `.env`.

### 4. Start the front-end

```bash
make frontend-dev    # next dev → http://localhost:3000
```

### 5. Build for production

```bash
make frontend        # next build
```

## Tests

Run the contract unit tests (3+ tests pass; required for the Level 3
submission screenshot):

```bash
cd contracts/auction
cargo test --release
```

Latest local run:

```
test test::test_invalid_create_auction_params ... ok
test test::test_settle_before_end_rejected ... ok
test test::test_seller_cannot_bid_on_own_auction ... ok
test test::test_bid_below_starting_price_rejected ... ok
test test::test_bid_must_increase ... ok
test test::test_anti_snipe_extension ... ok
test test::test_settle_below_reserve_refunds_bidder ... ok
test test::test_reputation_updates ... ok
test test::test_list_auctions ... ok
test test::test_create_and_bid_flow ... ok
test test::test_settle_meets_reserve_pays_seller ... ok

test result: ok. 11 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

Front-end typecheck:

```bash
npm run typecheck    # tsc --noEmit
```

## Testnet Notes

- A connected wallet must be funded on Stellar Testnet before it can send contract transactions
- If a wallet has not been created on Testnet yet, fund it with Friendbot first and then retry
- The home feed works without a connected wallet (it just calls `list_auctions` as a read)

## Scripts

Run from the **repo root** (or use the equivalent `make` target):

- `npm run dev` / `make frontend-dev` — start the Next.js dev server
- `npm run build` / `make frontend` — production build of the web app
- `npm run start` — start the built Next.js server
- `npm run typecheck` — run `tsc --noEmit` on the web app
- `make identity` — create & fund a `deployer` identity on testnet
- `make build` — build the Soroban contract WASM
- `make test` — run the Soroban contract tests
- `make abi` — dump the contract ABI to `abi/auction.abi.json`
- `make deploy` — deploy the contract to testnet and write `deployments/testnet.json`
- `make invoke FN=<name> ARGS='...'` — invoke a contract function
- `make bind` — regenerate the TS bindings from the deployed WASM
- `make optimize` — build the WASM with `--optimize` (smaller)

## Deploy (Vercel / Netlify)

This is a standard Next.js 16 build.

- **Node.js:** `^20.19.0` or `>=22.12.0` (Next 16 requirement)
- **Build command:** `npm run build`
- **Output directory:** `.next` (Next.js default; Vercel picks this up automatically)
- **Env vars:** set the `NEXT_PUBLIC_*` vars from the **Setup → Environment** section (at minimum `NEXT_PUBLIC_CONTRACT_ID` if you point the build at a freshly-deployed contract)

## Demo Video (1 minute)

`[TBD — 1-minute walkthrough link]`

Suggested walkthrough:

1. Open the deployed site and show the auction feed refreshing every 5 s.
2. Connect a wallet (Freighter or any wallet listed in the modal).
3. Create an auction (show the transaction phases: `preparing` → `awaiting-signature` → `pending` → `success`).
4. Bid on the auction from a second wallet and show the previous leader being refunded.
5. Open the contract on Stellar Lab via the link in the UI.

## Project Structure

```
bidchain/
├── src/                        # Next.js 16 frontend (React 19, App Router)
│   ├── app/                    # pages (home, auctions, create, profile)
│   ├── components/             # UI: wallet, bid panel, form, …
│   │   └── system/             # ErrorBoundary, TxToasts
│   ├── hooks/                  # useWallet, useAuctions, useLiveEvents, useTransaction
│   ├── lib/
│   │   ├── config.ts           # env-driven runtime config
│   │   ├── wallet/             # Stellar Wallets Kit glue
│   │   ├── contract/           # RPC client, typed bindings, error map, submit
│   │   └── events/             # event schema + polling stream
│   └── styles/                 # globals.css
├── contracts/auction/
│   ├── src/
│   │   ├── lib.rs              # Contract logic
│   │   ├── events.rs           # Event types
│   │   ├── errors.rs           # ContractError enum
│   │   └── test.rs             # Unit + integration tests
│   └── Cargo.toml
├── scripts/                    # build.sh / deploy.sh / init.sh + TS equivalents
├── docs/
│   └── CONTRACT.md             # full contract API + error/event reference
├── abi/                        # generated JSON ABI
├── deployments/                # <network>.json (created on deploy)
├── .github/workflows/ci.yml    # CI: typecheck + build (web), test + WASM (contracts)
├── Cargo.toml                  # Soroban workspace
├── package.json                # Next.js + scripts deps
└── Makefile                    # convenience targets
```

## CI

GitHub Actions runs on every push / PR to `main` / `master`
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

- **`web`** — `npm ci` → `npm run typecheck` → `npm run build`
- **`contracts`** — `cargo test --release` → `cargo rustc --target wasm32v1-none --release` (uploads the WASM to the `target/` directory inside the runner)

## Additional Docs

- [Contract API reference](./docs/CONTRACT.md) — full storage layout, function signatures, error codes, and event schema

## License

MIT.
