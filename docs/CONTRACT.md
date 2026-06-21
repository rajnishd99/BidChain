# Smart Contract Reference

This document covers the on-chain surface of the BidChain auction
contract. The high-level project overview lives in
[`../README.md`](../README.md).

Source: `contracts/auction/src/lib.rs`

## Storage

| Key | Type | Purpose |
| --- | --- | --- |
| `NextAuctionId` | `u64` | Monotonic counter for new auction ids. |
| `Auction(id)` | `Auction` | Per-auction state. |
| `AllAuctions` | `Vec<u64>` | List of all ids, in creation order, for easy listing. |
| `Reputation(Address)` | `Reputation` | Per-user counters. |

## Functions

| Function | Auth | Returns | Purpose |
| --- | --- | --- | --- |
| `__constructor()` | – | – | Initialise the counter. |
| `create_auction(seller, token, title, desc, reserve, start, duration, anti_snipe_window, anti_snipe_extension)` | seller | `Result<u64, ContractError>` | Create a new auction; returns the new id. |
| `bid(auction_id, bidder, amount)` | bidder | `Result<(), ContractError>` | Place a bid; refunds the previous leader; extends on anti-snipe. |
| `settle(auction_id)` | – | `Result<(), ContractError>` | After end, pay seller (or refund bidder if reserve not met). |
| `get_auction(auction_id)` | – | `Option<Auction>` | View an auction. |
| `list_auctions()` | – | `Vec<u64>` | View all auction ids. |
| `get_reputation(user)` | – | `Reputation` | View reputation counters. |

## Errors

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

## Events

All events use the modern `#[contractevent]` macro so the topics are
machine-readable and easy to index. The TS schema is mirrored in
`src/lib/events/types.ts`.

- `AuctionCreated { auction_id, seller, token, title, reserve_price, end_time }`
- `BidPlaced { auction_id, bidder, amount, highest_bid, end_time }`
- `BidRefunded { auction_id, bidder, amount }`
- `AuctionExtended { auction_id, new_end_time, triggering_bidder, triggering_amount }`
- `AuctionSettled { auction_id, winner, final_bid, seller, won }`
