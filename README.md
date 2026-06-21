# BidChain

BidChain is a decentralized, real-time auction marketplace powered by
**Soroban smart contracts** on the Stellar network. Sellers create
auctions for any Stellar Asset Contract (XLM or any issued asset).
Bidders place bids on-chain. When the auction ends, the highest bidder
wins and the seller is paid automatically by the contract — no
off-chain settlement step.

---

## Live Demo

[Live demo link — Vercel/Netlify/etc.](https://bidchain.example.com)

## Contract Deployment

- **Network:** testnet
- **Contract Address:** `CDWOHA6LLJE53RYNOJBWQ4GV7FLHF56JL2C35CB55SG7ANYGISV7FPUO`
- **WASM Hash:** `aad38720ba804358c62f281a1951e0177bc5d5ea344b69f8b03ce2b02d8c978f`
- **Sample Transaction Hash:** [`6f3e662a5f03642ca850d6db905a73f3f54bdc69cd7276a45ee50a13d5b052e6`](https://stellar.expert/explorer/testnet/tx/6f3e662a5f03642ca850d6db905a73f3f54bdc69cd7276a45ee50a13d5b052e6) (contract deploy on testnet)

A deploy record (with the latest wasm hash) is also written to
`deployments/<network>.json` on every `make deploy` run.

---

## Features

- **Create auctions** with starting price, reserve price, duration, and anti-snipe settings.
- **Live bidding** — bids are submitted as Soroban contract calls, signed with [Stellar Wallets Kit](https://github.com/creit-tech/stellar-wallets-kit) (Freighter, Albedo, xBull, Lobstr, Hot wallet, …).
- **Real-time updates** — the front-end subscribes to contract events via Soroban RPC `getEvents` polling and renders new bids as they appear.
- **Automatic settlement** — after the timer ends, anyone can call `settle()` to pay the seller (or refund the highest bidder if the reserve was not met).
- **Bid refunds** — when a new bid arrives, the previous leader is refunded automatically in the same transaction.
- **Anti-sniping** — bids placed within `anti_snipe_window` of the end time extend the auction.
- **On-chain reputation** — `auctions_created`, `bids_placed`, and `won` counters tracked per user.
- **Transaction status tracking** — every submitted transaction moves through `idle → pending → success | failed`, surfaced as toasts and a history list with a link to the Stellar explorer.
- **Native balance display + network-mismatch detection** in the wallet button.
- **Error boundary** around wallet and contract components.
- **Mobile-responsive UI** verified at 375 / 480 / 768 / 1024 / 1200 px breakpoints.

---

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript (strict)
- **Wallet:** [@creit.tech/stellar-wallets-kit](https://github.com/creit-tech/stellar-wallets-kit) 2.x
- **Chain SDK:** [@stellar/stellar-sdk](https://github.com/Stellar/stellar-js) 16.x
- **Contracts:** Rust + [soroban-sdk](https://github.com/Stellar/soroban-sdk) 25.x
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`, `contracts.yml`)
- **Package manager:** pnpm

See `Requirements.md` for the full specification this project follows.

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Rust** stable with the `wasm32v1-none` target
  ```bash
  rustup target add wasm32v1-none
  ```
- **Stellar CLI** ≥ 23
  ```bash
  cargo install --locked stellar-cli --features opt
  ```
  or grab a release from <https://github.com/stellar/stellar-cli/releases>

### Install

```bash
git clone <repo-url>
cd bidchain
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values. The minimum required
keys (consumed by the Next.js front-end) are:

```
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ID=
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
```

`STELLAR_SOURCE`, `STELLAR_RPC_URL`, and `STELLAR_NETWORK_PASSPHRASE`
are read by the deploy / bind scripts (server-side only).

### Build & deploy the contract

```bash
make identity      # create & fund a 'deployer' identity on testnet
./scripts/build.sh # or `make build`
./scripts/deploy.sh testnet   # or `make deploy`
./scripts/init.sh   testnet   # no-op for the auction contract
```

`make deploy` writes the contract id to `deployments/testnet.json`
and `abi/auction.abi.json`. Copy the contract id into
`NEXT_PUBLIC_CONTRACT_ID` in `.env`.

### Run the front-end

```bash
make frontend-dev  # pnpm dev → http://localhost:3000
```

### Run tests

```bash
make test         # cargo test (Soroban contract tests)
```

---

## Project Structure

```
bidchain/
├── app/                        # (N/A: Next.js lives in src/app)
├── src/                        # Next.js app
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
├── scripts/
│   ├── build.sh                # build all contracts to optimised WASM
│   ├── deploy.sh               # deploy to testnet/mainnet
│   ├── init.sh                 # post-deploy init (no-op for auction)
│   ├── deploy.ts               # TS deploy (used by `make deploy`)
│   └── bind.ts                 # regenerate TS bindings
├── .github/workflows/
│   ├── ci.yml                  # frontend lint/type-check/build
│   └── contracts.yml           # contract build/test/wasm
├── abi/                        # JSON ABI (created on deploy)
├── deployments/                # <network>.json (created on deploy)
├── Cargo.toml                  # Soroban workspace
├── package.json                # Next.js + scripts deps
└── Makefile                    # convenience targets
```

---

## Smart Contract API

Defined in `contracts/auction/src/lib.rs`.

### Storage

- `NextAuctionId: u64` — monotonic counter
- `Auction(id) -> Auction` — per-auction state
- `AllAuctions: Vec<u64>` — list of all ids (for easy listing)
- `Reputation(Address) -> Reputation` — per-user counters

### Functions

| Function | Auth | Returns | Purpose |
| --- | --- | --- | --- |
| `__constructor()` | – | – | Initialise the counter. |
| `create_auction(seller, token, title, desc, reserve, start, duration, anti_snipe_window, anti_snipe_extension)` | seller | `Result<u64, ContractError>` | Create a new auction; returns the new id. |
| `bid(auction_id, bidder, amount)` | bidder | `Result<(), ContractError>` | Place a bid; refunds the previous leader; extends on anti-snipe. |
| `settle(auction_id)` | – | `Result<(), ContractError>` | After end, pay seller (or refund bidder if reserve not met). |
| `get_auction(auction_id)` | – | `Option<Auction>` | View an auction. |
| `list_auctions()` | – | `Vec<u64>` | View all auction ids. |
| `get_reputation(user)` | – | `Reputation` | View reputation counters. |

### Errors

Every entry point that handles user input returns
`Result<T, ContractError>` (see `contracts/auction/src/errors.rs`).
The front-end mirrors these codes in
`src/lib/contract/errors.ts` and translates them to human-readable
messages. Codes are stable; never renumber an existing variant.

| Code | Variant |
| --- | --- |
| 1 | `InvalidDuration` |
| 2 | `InvalidPrice` |
| 3 | `AuctionNotFound` |
| 4 | `AuctionAlreadySettled` |
| 5 | `AuctionNotStarted` |
| 6 | `AuctionEnded` |
| 7 | `InvalidBidAmount` |
| 8 | `BidNotHighEnough` |
| 9 | `FirstBidBelowStartingPrice` |
| 10 | `SellerCannotBid` |
| 11 | `AuctionNotYetEnded` |

### Events

All events use the modern `#[contractevent]` macro so the topics are
machine-readable and easy to index. The TS schema is mirrored in
`src/lib/events/types.ts`.

- `AuctionCreated { auction_id, seller, token, title, reserve_price, end_time }`
- `BidPlaced { auction_id, bidder, amount, highest_bid, end_time }`
- `BidRefunded { auction_id, bidder, amount }`
- `AuctionExtended { auction_id, new_end_time, triggering_bidder, triggering_amount }`
- `AuctionSettled { auction_id, winner, final_bid, seller, won }`

---

## Screenshots

### Mobile Responsive UI

_Paste a 375 / 480 px mobile screenshot here._

### Test Output (3+ passing tests)

```
test test::test_invalid_create_auction_params ... ok
test test::test_settle_before_end_rejected ... ok
test test::test_seller_cannot_bid_on_own_auction ... ok
test test::test_bid_below_starting_price_rejected ... ok
test test::test_anti_snipe_extension ... ok
test test::test_bid_must_increase ... ok
test test::test_settle_below_reserve_refunds_bidder ... ok
test test::test_reputation_updates ... ok
test test::test_list_auctions ... ok
test test::test_create_and_bid_flow ... ok
test test::test_settle_meets_reserve_pays_seller ... ok
test result: ok. 11 passed; 0 failed
```

---

## Demo Video

_[1–2 minute demo video link]_

---

## License

MIT.
