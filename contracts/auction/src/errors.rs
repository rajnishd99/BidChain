//! # Contract errors
//!
//! Stable, project-wide error enum. Every state-changing entry point
//! returns `Result<T, ContractError>` so the front-end can map error
//! codes to human-readable messages and we never need to rely on
//! panic-message string matching.
//!
//! ## Error code conventions
//!
//! Error codes are stable across contract versions. Adding new
//! variants is allowed; renaming or changing the discriminant of an
//! existing variant is a breaking change. The discriminant is what
//! the front-end sees, so it is the source of truth for FE mappings
//! (see `src/lib/contract/errors.ts`).

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum ContractError {
    /// `create_auction`: `duration_seconds` was 0.
    InvalidDuration = 1,
    /// `create_auction`: `reserve_price` or `starting_price` was negative.
    InvalidPrice = 2,
    /// `bid` / `settle`: the auction id does not exist.
    AuctionNotFound = 3,
    /// `bid` / `settle`: the auction has already been settled.
    AuctionAlreadySettled = 4,
    /// `bid`: the auction has not started yet (`now < start_time`).
    AuctionNotStarted = 5,
    /// `bid` / `settle`: the auction window has ended.
    AuctionEnded = 6,
    /// `bid`: `amount <= 0`.
    InvalidBidAmount = 7,
    /// `bid`: `amount <= current highest_bid`.
    BidNotHighEnough = 8,
    /// `bid`: the first bid must be `>= starting_price`.
    FirstBidBelowStartingPrice = 9,
    /// `bid`: the seller attempted to bid on their own auction.
    SellerCannotBid = 10,
    /// `settle`: the auction has not yet ended (`now < end_time`).
    AuctionNotYetEnded = 11,
}
