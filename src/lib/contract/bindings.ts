/**
 * Typed contract bindings — auction + reputation domain types and
 * the read-side wrappers around `readContract`.
 *
 * Mirrors `contracts/auction/src/lib.rs`.
 */

import { Address, nativeToScVal } from "@stellar/stellar-sdk";

import { readContract } from "./client";

export type Auction = {
  id: number;
  seller: string;
  token: string;
  title: string;
  description: string;
  reserve_price: string;
  starting_price: string;
  start_time: number;
  end_time: number;
  anti_snipe_window: number;
  anti_snipe_extension: number;
  highest_bidder?: string | null;
  highest_bid: string;
  bid_count: number;
  settled: boolean;
  won: boolean;
};

export type Reputation = {
  auctions_created: number;
  auctions_won_as_seller: number;
  bids_placed: number;
  auctions_won_as_bidder: number;
};

export const auctionContract = {
  async list(): Promise<number[]> {
    return readContract<number[]>("list_auctions");
  },
  async get(id: number): Promise<Auction | null> {
    const opt = await readContract<Auction | null>("get_auction", [
      nativeToScVal(id, { type: "u64" }),
    ]);
    return opt ?? null;
  },
  async reputation(user: string): Promise<Reputation> {
    return readContract<Reputation>("get_reputation", [
      new Address(user).toScVal(),
    ]);
  },
};
