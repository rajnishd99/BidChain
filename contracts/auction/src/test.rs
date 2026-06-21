#![cfg(test)]

use super::*;
use crate::errors::ContractError;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, Symbol,
};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> token::Client<'a> {
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = sac.address();
    token::Client::new(env, &addr)
}

/// The `#[contractimpl]`-generated client provides `try_<fn>(...)`
/// alongside the panicking `<fn>(...)`. Because our entry points
/// return `Result<T, ContractError>`, the `try_` variant returns
/// `Result<Result<T, ConversionError>, Result<ContractError, InvokeError>>`.
/// This helper unwraps the contract error from the outer Err branch.
fn contract_err<T, E>(
    r: Result<Result<T, E>, Result<ContractError, soroban_sdk::InvokeError>>,
) -> ContractError {
    r.err().expect("expected contract call to fail").unwrap()
}

#[test]
fn test_create_and_bid_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let seller = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let admin = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();

    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&alice, &1_000_000_000);
    sac.mint(&bob, &1_000_000_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);

    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "RareCollectible"),
            &Symbol::new(&env, "Genesis"),
            &100i128,
            &50i128,
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();
    assert_eq!(auction_id, 1);

    client.try_bid(&auction_id, &alice, &100i128).unwrap().unwrap();
    let a1 = client.get_auction(&auction_id).unwrap();
    assert_eq!(a1.highest_bid, 100);
    assert_eq!(a1.bid_count, 1);
    assert_eq!(a1.highest_bidder, Some(alice.clone()));

    client.try_bid(&auction_id, &bob, &120i128).unwrap().unwrap();
    let a2 = client.get_auction(&auction_id).unwrap();
    assert_eq!(a2.highest_bid, 120);
    assert_eq!(a2.bid_count, 2);
    assert_eq!(a2.highest_bidder, Some(bob.clone()));

    assert_eq!(token.balance(&alice), 1_000_000_000);
    assert_eq!(token.balance(&bob), 1_000_000_000 - 120);
    assert_eq!(token.balance(&contract_id), 120);
}

#[test]
fn test_bid_must_increase() {
    let env = Env::default();
    env.mock_all_auths();

    let seller = Address::generate(&env);
    let alice = Address::generate(&env);
    let admin = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&alice, &1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &10i128,
            &5i128,
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();

    client.try_bid(&auction_id, &alice, &10i128).unwrap().unwrap();
    let err = contract_err(client.try_bid(&auction_id, &alice, &10i128));
    assert_eq!(err, ContractError::BidNotHighEnough);
}

#[test]
fn test_bid_below_starting_price_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let seller = Address::generate(&env);
    let alice = Address::generate(&env);
    let admin = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&alice, &1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &10i128,
            &50i128, // starting price 50
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();

    // First bid of 40 is below starting price (50).
    let err = contract_err(client.try_bid(&auction_id, &alice, &40i128));
    assert_eq!(err, ContractError::FirstBidBelowStartingPrice);
}

#[test]
fn test_seller_cannot_bid_on_own_auction() {
    let env = Env::default();
    env.mock_all_auths();
    let seller = Address::generate(&env);
    let admin = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&seller, &1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &10i128,
            &5i128,
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();

    let err = contract_err(client.try_bid(&auction_id, &seller, &100i128));
    assert_eq!(err, ContractError::SellerCannotBid);
}

#[test]
fn test_invalid_create_auction_params() {
    let env = Env::default();
    env.mock_all_auths();
    let seller = Address::generate(&env);
    let admin = Address::generate(&env);

    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);

    let err = contract_err(client.try_create_auction(
        &seller,
        &token_addr,
        &Symbol::new(&env, "Item"),
        &Symbol::new(&env, "Desc"),
        &10i128,
        &5i128,
        &0u64, // zero duration
        &30u64,
        &60u64,
    ));
    assert_eq!(err, ContractError::InvalidDuration);

    let err = contract_err(client.try_create_auction(
        &seller,
        &token_addr,
        &Symbol::new(&env, "Item"),
        &Symbol::new(&env, "Desc"),
        &-1i128, // negative price
        &5i128,
        &60u64,
        &30u64,
        &60u64,
    ));
    assert_eq!(err, ContractError::InvalidPrice);
}

#[test]
fn test_settle_meets_reserve_pays_seller() {
    let env = Env::default();
    env.mock_all_auths();

    let seller = Address::generate(&env);
    let alice = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&alice, &1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &50i128,
            &10i128,
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();

    client.try_bid(&auction_id, &alice, &100i128).unwrap().unwrap();
    env.ledger().set_timestamp(env.ledger().timestamp() + 61);

    let seller_balance_before = token.balance(&seller);
    client.try_settle(&auction_id).unwrap().unwrap();

    let a = client.get_auction(&auction_id).unwrap();
    assert!(a.settled);
    assert!(a.won);
    assert_eq!(token.balance(&seller), seller_balance_before + 100);
    assert_eq!(token.balance(&alice), 1_000 - 100);
}

#[test]
fn test_settle_before_end_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let seller = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &10i128,
            &5i128,
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();

    let err = contract_err(client.try_settle(&auction_id));
    assert_eq!(err, ContractError::AuctionNotYetEnded);
}

#[test]
fn test_settle_below_reserve_refunds_bidder() {
    let env = Env::default();
    env.mock_all_auths();

    let seller = Address::generate(&env);
    let alice = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&alice, &1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);
    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &500i128,
            &10i128,
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();

    client.try_bid(&auction_id, &alice, &100i128).unwrap().unwrap();
    env.ledger().set_timestamp(env.ledger().timestamp() + 61);
    client.try_settle(&auction_id).unwrap().unwrap();

    let a = client.get_auction(&auction_id).unwrap();
    assert!(a.settled);
    assert!(!a.won);
    assert_eq!(token.balance(&alice), 1_000);
}

#[test]
fn test_anti_snipe_extension() {
    let env = Env::default();
    env.mock_all_auths();

    let seller = Address::generate(&env);
    let alice = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&alice, &1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);

    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &10i128,
            &5i128,
            &60u64,
            &30u64,
            &120u64,
        )
        .unwrap()
        .unwrap();

    env.ledger().set_timestamp(env.ledger().timestamp() + 45);
    let pre = client.get_auction(&auction_id).unwrap().end_time;
    client.try_bid(&auction_id, &alice, &20i128).unwrap().unwrap();
    let post = client.get_auction(&auction_id).unwrap().end_time;
    assert!(post > pre, "end_time should have been extended");
}

#[test]
fn test_list_auctions() {
    let env = Env::default();
    env.mock_all_auths();

    let seller = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);

    for _ in 0..3 {
        client
            .try_create_auction(
                &seller,
                &token_addr,
                &Symbol::new(&env, "Item"),
                &Symbol::new(&env, "Desc"),
                &10i128,
                &5i128,
                &60u64,
                &30u64,
                &60u64,
            )
            .unwrap()
            .unwrap();
    }

    let ids = client.list_auctions();
    assert_eq!(ids.len(), 3);
}

#[test]
fn test_reputation_updates() {
    let env = Env::default();
    env.mock_all_auths();

    let seller = Address::generate(&env);
    let alice = Address::generate(&env);
    let admin = Address::generate(&env);
    let token = create_token_contract(&env, &admin);
    let token_addr = token.address.clone();
    let sac = token::StellarAssetClient::new(&env, &token_addr);
    sac.mint(&alice, &1_000);

    let contract_id = env.register(AuctionContract, ());
    let client = AuctionContractClient::new(&env, &contract_id);

    let auction_id = client
        .try_create_auction(
            &seller,
            &token_addr,
            &Symbol::new(&env, "Item"),
            &Symbol::new(&env, "Desc"),
            &10i128,
            &5i128,
            &60u64,
            &30u64,
            &60u64,
        )
        .unwrap()
        .unwrap();

    client.try_bid(&auction_id, &alice, &50i128).unwrap().unwrap();
    env.ledger().set_timestamp(env.ledger().timestamp() + 61);
    client.try_settle(&auction_id).unwrap().unwrap();

    let seller_rep = client.get_reputation(&seller);
    assert_eq!(seller_rep.auctions_created, 1);
    assert_eq!(seller_rep.auctions_won_as_seller, 1);

    let alice_rep = client.get_reputation(&alice);
    assert_eq!(alice_rep.bids_placed, 1);
    assert_eq!(alice_rep.auctions_won_as_bidder, 1);
}
