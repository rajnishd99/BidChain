//! # Contract events
//!
//! Centralised event definitions for the auction contract. Every
//! meaningful state transition emits a structured event so the
//! front-end can stream live updates via Soroban RPC `getEvents`.
//!
//! The `#[contractevent]` macro publishes each struct as a contract
//! event whose first topic is the type name, matching the TypeScript
//! discriminated union in `src/lib/events/types.ts`.

#![allow(clippy::too_many_arguments)]

use soroban_sdk::{contractevent, Address, Symbol};

#[contractevent]
#[derive(Clone, Debug)]
pub struct AuctionCreated {
    pub auction_id: u64,
    pub seller: Address,
    pub token: Address,
    pub title: Symbol,
    pub reserve_price: i128,
    pub end_time: u64,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct BidPlaced {
    pub auction_id: u64,
    pub bidder: Address,
    pub amount: i128,
    pub highest_bid: i128,
    pub end_time: u64,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct BidRefunded {
    pub auction_id: u64,
    pub bidder: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct AuctionExtended {
    pub auction_id: u64,
    pub new_end_time: u64,
    pub triggering_bidder: Address,
    pub triggering_amount: i128,
}

#[contractevent]
#[derive(Clone, Debug)]
pub struct AuctionSettled {
    pub auction_id: u64,
    pub winner: Option<Address>,
    pub final_bid: i128,
    pub seller: Address,
    pub won: bool,
}
