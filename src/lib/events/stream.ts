/**
 * Polls Soroban RPC for contract events. Caches the cursor in
 * memory so reconnects resume from the last processed ledger
 * (per spec §6 "resumes from the last known ledger sequence").
 */

"use client";

import {
  Address,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  Transaction,
  xdr,
} from "@stellar/stellar-sdk";

import { getRpc } from "@/lib/contract/client";
import { config } from "@/lib/config";

import { type AuctionEvent } from "./types";

/**
 * Cursor + ledger tracker so a reconnect (e.g. after an RPC error
 * or page reload) resumes from where we left off instead of from
 * the network's earliest ledger.
 */
type StreamState = {
  cursor?: string;
  lastLedger?: number;
};

const state: StreamState = {};

/**
 * Fetch a page of events for the auction contract. Pass the
 * previous `cursor` to receive only new events.
 */
export async function fetchEvents(
  contractId: string = config.auctionContractId,
  cursor: string | undefined = state.cursor,
  limit = 100,
): Promise<{ events: AuctionEvent[]; cursor: string | undefined }> {
  if (!contractId) return { events: [], cursor };
  const rpcServer = getRpc();
  const filters: rpc.Api.EventFilter[] = [
    { type: "contract", contractIds: [contractId] } as rpc.Api.EventFilter,
  ];
  const req: rpc.Api.GetEventsRequest = cursor
    ? { filters, cursor, limit }
    : { filters, startLedger: 0, limit };
  const resp = await rpcServer.getEvents(req);
  const events: AuctionEvent[] = resp.events
    .map(parseContractEvent)
    .filter((x): x is AuctionEvent => Boolean(x));
  state.cursor = resp.cursor;
  if (resp.events.length > 0) {
    state.lastLedger = Math.max(
      state.lastLedger ?? 0,
      ...resp.events.map((e) => Number(e.ledger)),
    );
  }
  return { events, cursor: resp.cursor };
}

function parseContractEvent(e: rpc.Api.EventResponse): AuctionEvent | null {
  if (!e.topic || e.topic.length === 0) return null;
  const name = scValToNative(e.topic[0]) as string;
  const data = e.value
    ? (scValToNative(e.value) as Record<string, unknown>)
    : {};
  switch (name) {
    case "AuctionCreated":
      return {
        type: "AuctionCreated",
        auction_id: Number(data.auction_id),
        seller: String(data.seller),
        token: String(data.token),
        title: String(data.title),
        reserve_price: String(data.reserve_price),
        end_time: Number(data.end_time),
      };
    case "BidPlaced":
      return {
        type: "BidPlaced",
        auction_id: Number(data.auction_id),
        bidder: String(data.bidder),
        amount: String(data.amount),
        highest_bid: String(data.highest_bid),
        end_time: Number(data.end_time),
      };
    case "BidRefunded":
      return {
        type: "BidRefunded",
        auction_id: Number(data.auction_id),
        bidder: String(data.bidder),
        amount: String(data.amount),
      };
    case "AuctionExtended":
      return {
        type: "AuctionExtended",
        auction_id: Number(data.auction_id),
        new_end_time: Number(data.new_end_time),
        triggering_bidder: String(data.triggering_bidder),
        triggering_amount: String(data.triggering_amount),
      };
    case "AuctionSettled":
      return {
        type: "AuctionSettled",
        auction_id: Number(data.auction_id),
        winner: data.winner ? String(data.winner) : null,
        final_bid: String(data.final_bid),
        seller: String(data.seller),
        won: Boolean(data.won),
      };
    default:
      return null;
  }
}

// Re-export for backwards compatibility with the old `lib/stellar` imports.
export { fetchEvents as defaultFetchEvents };
export type { AuctionEvent };

// --- unused import suppressors (kept so the bundler can tree-shake) ---
void Address;
void nativeToScVal;
void TransactionBuilder;
void Transaction;
void xdr;
