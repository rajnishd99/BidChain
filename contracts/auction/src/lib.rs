#![no_std]

//! # BidChain Auction Contract
//!
//! A Soroban smart contract for a decentralized, real-time auction
//! marketplace. Sellers create auctions for any Stellar Asset Contract
//! (XLM or any issued asset). Bidders place bids in the auction's
//! settlement token. When the auction ends, anyone can settle it:
//!   - if the highest bid >= reserve price, the seller is paid the
//!     highest bid;
//!   - if the highest bid is below reserve, the highest bidder is
//!     refunded in full (auction fails);
//!   - if there are no bids, nothing is transferred.
//!
//! The contract emits events (see `events.rs`) for every state
//! change so the front-end can stream live updates. All entry points
//! return `Result<_, ContractError>` (see `errors.rs`); no `panic!`
//! is used in user-input code paths.

mod errors;
mod events;

use soroban_sdk::{
    contract, contractimpl, contracttype,
    token::TokenClient,
    Address, Env, Symbol, Vec,
};

use crate::errors::ContractError;
use crate::events::{
    AuctionCreated, AuctionExtended, AuctionSettled, BidPlaced, BidRefunded,
};

// -------------------- data --------------------

#[contracttype]
#[derive(Clone, Debug)]
pub struct Auction {
    /// Unique auction id, monotonically increasing.
    pub id: u64,
    /// Seller (creator) address.
    pub seller: Address,
    /// Stellar Asset Contract (SAC) address used for bidding and settlement.
    pub token: Address,
    /// Human-readable title.
    pub title: Symbol,
    /// Optional description (short text).
    pub description: Symbol,
    /// Reserve (minimum acceptable) bid in token units.
    pub reserve_price: i128,
    /// Starting price used as a soft hint; bids must be > highest_bid.
    pub starting_price: i128,
    /// Auction start time (ledger timestamp, seconds).
    pub start_time: u64,
    /// Auction end time (ledger timestamp, seconds).
    pub end_time: u64,
    /// When a bid lands within this many seconds of `end_time`, extend
    /// the auction by `anti_snipe_extension` seconds.
    pub anti_snipe_window: u64,
    /// Extension duration when anti-snipe triggers.
    pub anti_snipe_extension: u64,
    /// Current highest bidder, or `None` if no bids yet.
    pub highest_bidder: Option<Address>,
    /// Current highest bid.
    pub highest_bid: i128,
    /// Number of bids placed.
    pub bid_count: u32,
    /// Whether the auction has been settled.
    pub settled: bool,
    /// Whether the auction ended successfully (winner paid).
    pub won: bool,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Next auction id (monotonic counter).
    NextAuctionId,
    /// Auction storage, keyed by id.
    Auction(u64),
    /// All auction ids, in creation order (for easy listing).
    AllAuctions,
    /// Per-user reputation.
    Reputation(Address),
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Reputation {
    pub auctions_created: u32,
    pub auctions_won_as_seller: u32,
    pub bids_placed: u32,
    pub auctions_won_as_bidder: u32,
}

#[contract]
pub struct AuctionContract;

#[contractimpl]
impl AuctionContract {
    // -------------------- constructor --------------------

    /// Initialize the contract. Sets the next auction id to 1.
    pub fn __constructor(env: Env) {
        env.storage().instance().set(&DataKey::NextAuctionId, &1u64);
        env.storage()
            .instance()
            .set(&DataKey::AllAuctions, &Vec::<u64>::new(&env));
    }

    // -------------------- create --------------------

    /// Create a new auction.
    ///
    /// * `seller`            — auction creator (must authorize).
    /// * `token`             — SAC address used for bidding & settlement.
    /// * `title`             — short title.
    /// * `description`       — short description.
    /// * `reserve_price`     — minimum acceptable winning bid.
    /// * `starting_price`    — soft floor for the first bid; subsequent
    ///                         bids must be strictly greater than the
    ///                         current highest bid.
    /// * `duration_seconds`  — auction length from `start_time`.
    /// * `anti_snipe_window` — seconds before `end_time` that trigger
    ///                         anti-snipe extension (e.g. 60).
    /// * `anti_snipe_extension` — seconds to extend on a late bid
    ///                            (e.g. 120).
    #[allow(clippy::too_many_arguments)]
    pub fn create_auction(
        env: Env,
        seller: Address,
        token: Address,
        title: Symbol,
        description: Symbol,
        reserve_price: i128,
        starting_price: i128,
        duration_seconds: u64,
        anti_snipe_window: u64,
        anti_snipe_extension: u64,
    ) -> Result<u64, ContractError> {
        seller.require_auth();

        if duration_seconds == 0 {
            return Err(ContractError::InvalidDuration);
        }
        if reserve_price < 0 || starting_price < 0 {
            return Err(ContractError::InvalidPrice);
        }

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextAuctionId)
            .unwrap_or(1u64);
        let now = env.ledger().timestamp();
        let end = now.saturating_add(duration_seconds);

        let auction = Auction {
            id,
            seller: seller.clone(),
            token: token.clone(),
            title: title.clone(),
            description,
            reserve_price,
            starting_price,
            start_time: now,
            end_time: end,
            anti_snipe_window,
            anti_snipe_extension,
            highest_bidder: None,
            highest_bid: 0,
            bid_count: 0,
            settled: false,
            won: false,
        };

        env.storage()
            .instance()
            .set(&DataKey::Auction(id), &auction);

        // Maintain a global list of ids for easy listing.
        let mut all: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AllAuctions)
            .unwrap_or(Vec::new(&env));
        all.push_back(id);
        env.storage()
            .instance()
            .set(&DataKey::AllAuctions, &all);

        env.storage()
            .instance()
            .set(&DataKey::NextAuctionId, &id.saturating_add(1));

        // Update reputation.
        Self::bump_reputation(env.clone(), seller.clone(), true, false, true, false);

        AuctionCreated {
            auction_id: id,
            seller,
            token,
            title,
            reserve_price,
            end_time: end,
        }
        .publish(&env);

        Ok(id)
    }

    // -------------------- bid --------------------

    /// Place a bid on an auction. Transfers the bid amount from the
    /// bidder to the contract. If there is a previous highest bidder,
    /// they are refunded automatically.
    pub fn bid(
        env: Env,
        auction_id: u64,
        bidder: Address,
        amount: i128,
    ) -> Result<(), ContractError> {
        bidder.require_auth();

        let mut auction: Auction = env
            .storage()
            .instance()
            .get(&DataKey::Auction(auction_id))
            .ok_or(ContractError::AuctionNotFound)?;

        let now = env.ledger().timestamp();
        if auction.settled {
            return Err(ContractError::AuctionAlreadySettled);
        }
        if now < auction.start_time {
            return Err(ContractError::AuctionNotStarted);
        }
        if now >= auction.end_time {
            return Err(ContractError::AuctionEnded);
        }
        if amount <= 0 {
            return Err(ContractError::InvalidBidAmount);
        }
        if amount <= auction.highest_bid {
            return Err(ContractError::BidNotHighEnough);
        }
        if auction.highest_bid == 0 && amount < auction.starting_price {
            return Err(ContractError::FirstBidBelowStartingPrice);
        }
        if bidder == auction.seller {
            return Err(ContractError::SellerCannotBid);
        }

        // Pull funds from bidder to the contract.
        let token = TokenClient::new(&env, &auction.token);
        token.transfer(&bidder, &env.current_contract_address(), &amount);

        // Refund previous highest bidder (if any).
        if let Some(prev) = auction.highest_bidder.clone() {
            token.transfer(
                &env.current_contract_address(),
                &prev,
                &auction.highest_bid,
            );

            BidRefunded {
                auction_id,
                bidder: prev,
                amount: auction.highest_bid,
            }
            .publish(&env);
        }

        // Anti-snipe: extend if bid lands within window.
        let time_left = auction.end_time.saturating_sub(now);
        if time_left <= auction.anti_snipe_window && auction.anti_snipe_extension > 0 {
            auction.end_time = auction.end_time.saturating_add(auction.anti_snipe_extension);

            AuctionExtended {
                auction_id,
                new_end_time: auction.end_time,
                triggering_bidder: bidder.clone(),
                triggering_amount: amount,
            }
            .publish(&env);
        }

        auction.highest_bidder = Some(bidder.clone());
        auction.highest_bid = amount;
        auction.bid_count = auction.bid_count.saturating_add(1);

        env.storage()
            .instance()
            .set(&DataKey::Auction(auction_id), &auction);

        // Update reputation.
        Self::bump_reputation(env.clone(), bidder.clone(), false, false, true, false);

        BidPlaced {
            auction_id,
            bidder,
            amount,
            highest_bid: auction.highest_bid,
            end_time: auction.end_time,
        }
        .publish(&env);

        Ok(())
    }

    // -------------------- settle --------------------

    /// Settle an auction after it has ended. Anyone can call this.
    ///
    /// * If the highest bid >= reserve price, the seller is paid and
    ///   the auction is marked as `won`.
    /// * If the highest bid < reserve price (or there are no bids),
    ///   the highest bidder (if any) is refunded in full and the
    ///   auction is marked as not won.
    pub fn settle(env: Env, auction_id: u64) -> Result<(), ContractError> {
        let mut auction: Auction = env
            .storage()
            .instance()
            .get(&DataKey::Auction(auction_id))
            .ok_or(ContractError::AuctionNotFound)?;

        if auction.settled {
            return Err(ContractError::AuctionAlreadySettled);
        }
        let now = env.ledger().timestamp();
        if now < auction.end_time {
            return Err(ContractError::AuctionNotYetEnded);
        }

        let token = TokenClient::new(&env, &auction.token);

        let meets_reserve =
            auction.highest_bid >= auction.reserve_price && auction.highest_bid > 0;

        if meets_reserve {
            // Pay the seller.
            token.transfer(
                &env.current_contract_address(),
                &auction.seller,
                &auction.highest_bid,
            );
            auction.won = true;

            // Update reputation for winning bidder and seller.
            if let Some(winner) = auction.highest_bidder.clone() {
                Self::bump_reputation(
                    env.clone(),
                    winner.clone(),
                    false,
                    true,
                    false,
                    true,
                );
                Self::bump_reputation(
                    env.clone(),
                    auction.seller.clone(),
                    false,
                    true,
                    false,
                    false,
                );
            }
        } else if let Some(winner) = auction.highest_bidder.clone() {
            // Refund highest bidder (if any) when reserve is not met.
            token.transfer(
                &env.current_contract_address(),
                &winner,
                &auction.highest_bid,
            );
        }

        AuctionSettled {
            auction_id,
            winner: auction.highest_bidder.clone(),
            final_bid: auction.highest_bid,
            seller: auction.seller.clone(),
            won: auction.won,
        }
        .publish(&env);

        auction.settled = true;
        env.storage()
            .instance()
            .set(&DataKey::Auction(auction_id), &auction);

        Ok(())
    }

    // -------------------- read-only views --------------------

    pub fn get_auction(env: Env, auction_id: u64) -> Option<Auction> {
        env.storage().instance().get(&DataKey::Auction(auction_id))
    }

    pub fn list_auctions(env: Env) -> Vec<u64> {
        env.storage()
            .instance()
            .get(&DataKey::AllAuctions)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_reputation(env: Env, user: Address) -> Reputation {
        env.storage()
            .instance()
            .get(&DataKey::Reputation(user))
            .unwrap_or(Reputation {
                auctions_created: 0,
                auctions_won_as_seller: 0,
                bids_placed: 0,
                auctions_won_as_bidder: 0,
            })
    }

    // -------------------- internal --------------------

    fn bump_reputation(
        env: Env,
        user: Address,
        created: bool,
        seller_won: bool,
        bid: bool,
        bidder_won: bool,
    ) {
        let mut r: Reputation = env
            .storage()
            .instance()
            .get(&DataKey::Reputation(user.clone()))
            .unwrap_or(Reputation {
                auctions_created: 0,
                auctions_won_as_seller: 0,
                bids_placed: 0,
                auctions_won_as_bidder: 0,
            });
        if created {
            r.auctions_created = r.auctions_created.saturating_add(1);
        }
        if seller_won {
            r.auctions_won_as_seller = r.auctions_won_as_seller.saturating_add(1);
        }
        if bid {
            r.bids_placed = r.bids_placed.saturating_add(1);
        }
        if bidder_won {
            r.auctions_won_as_bidder = r.auctions_won_as_bidder.saturating_add(1);
        }
        env.storage()
            .instance()
            .set(&DataKey::Reputation(user), &r);
    }
}

// Re-export the event types at the crate root so downstream
// bindings (and external indexers) can `use auction::events::*`
// without knowing the internal module path.
//
// (No code-level re-export is needed; the `crate::events` module
// is public and callers can import from it directly.)

mod test;
