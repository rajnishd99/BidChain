import Link from "next/link";

import { type Auction } from "@/lib/contract";

import { Countdown } from "./Countdown";

const shorten = (pk: string) =>
  pk.length > 12 ? `${pk.slice(0, 6)}…${pk.slice(-4)}` : pk;

export function AuctionCard({ auction }: { auction: Auction }) {
  return (
    <Link href={`/auctions/${auction.id}`} className="auction-card">
      <div className="auction-card-header">
        <h3>{auction.title}</h3>
        <Countdown endTime={auction.end_time} />
      </div>
      <p className="auction-card-desc">{auction.description || "—"}</p>
      <div className="auction-card-stats">
        <div>
          <span>Highest bid</span>
          <strong>{auction.highest_bid || "—"}</strong>
        </div>
        <div>
          <span>Reserve</span>
          <strong>{auction.reserve_price}</strong>
        </div>
        <div>
          <span>Bids</span>
          <strong>{auction.bid_count}</strong>
        </div>
        <div>
          <span>Seller</span>
          <strong>{shorten(auction.seller)}</strong>
        </div>
      </div>
      {auction.settled && (
        <div className={`auction-card-status ${auction.won ? "won" : "lost"}`}>
          {auction.won ? "Sold" : "Reserve not met"}
        </div>
      )}
    </Link>
  );
}
