/**
 * Mirrored TypeScript representation of the contract event schema
 * defined in `contracts/auction/src/events.rs`. The first XDR topic
 * of every published event is the type name (e.g. "AuctionCreated"),
 * so we use it as the discriminator and decode the data payload
 * from the event's value ScVal.
 *
 * If the Rust event schema changes, update this file in lockstep.
 */

export type AuctionEvent =
  | {
      type: "AuctionCreated";
      auction_id: number;
      seller: string;
      token: string;
      title: string;
      reserve_price: string;
      end_time: number;
    }
  | {
      type: "BidPlaced";
      auction_id: number;
      bidder: string;
      amount: string;
      highest_bid: string;
      end_time: number;
    }
  | {
      type: "BidRefunded";
      auction_id: number;
      bidder: string;
      amount: string;
    }
  | {
      type: "AuctionExtended";
      auction_id: number;
      new_end_time: number;
      triggering_bidder: string;
      triggering_amount: string;
    }
  | {
      type: "AuctionSettled";
      auction_id: number;
      winner?: string | null;
      final_bid: string;
      seller: string;
      won: boolean;
    };

/** Human-readable label for an event, used in the live event feed. */
export function eventLabel(e: AuctionEvent): string {
  const shorten = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
  switch (e.type) {
    case "AuctionCreated":
      return `Auction #${e.auction_id} "${e.title}" created by ${shorten(
        e.seller,
      )} — reserve ${e.reserve_price}`;
    case "BidPlaced":
      return `Auction #${e.auction_id}: ${shorten(e.bidder)} bid ${e.amount} (highest ${e.highest_bid})`;
    case "BidRefunded":
      return `Auction #${e.auction_id}: ${shorten(e.bidder)} refunded ${e.amount}`;
    case "AuctionExtended":
      return `Auction #${e.auction_id} extended — new end ${new Date(
        e.new_end_time * 1000,
      ).toLocaleTimeString()}`;
    case "AuctionSettled":
      return e.won
        ? `Auction #${e.auction_id} won by ${shorten(
            e.winner ?? "?",
          )} for ${e.final_bid}`
        : `Auction #${e.auction_id} ended without meeting reserve`;
  }
}
