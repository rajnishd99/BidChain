import Link from "next/link";

import { AuctionCard } from "@/components/AuctionCard";
import { EventFeed } from "@/components/EventFeed";
import { LiveAuctions } from "@/components/LiveAuctions";
import { LiveEvents } from "@/components/LiveEvents";
import { config, isConfigured } from "@/lib/config";

export default function Home() {
  const ready = isConfigured();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h2>Real-time on-chain auctions on Stellar.</h2>
          <p>
            BidChain is a decentralized auction marketplace where every bid
            is recorded on-chain. Create an auction for any Stellar Asset
            Contract (XLM or any issued asset), and watch bids stream in
            live as they happen.
          </p>
          <div className="hero-cta">
            <Link href="/create" className="btn btn-primary">
              Create an auction
            </Link>
            <Link href="/auctions" className="btn">
              Browse auctions
            </Link>
          </div>
        </div>
        <div className="hero-flow">
          <h3>How it works</h3>
          <ol>
            <li>Seller deploys an auction with reserve &amp; duration.</li>
            <li>Bidders place bids on-chain; previous leader is refunded.</li>
            <li>New bids appear here in real time.</li>
            <li>Auction ends → contract pays the seller automatically.</li>
          </ol>
        </div>
      </section>

      <section className="section">
        <h2>Live event stream</h2>
        <p className="section-sub">
          Subscribed to contract events from{" "}
          <code>{ready ? config.auctionContractId : "(not deployed)"}</code>.
        </p>
        <LiveEvents />
      </section>

      <section className="section">
        <h2>Featured auctions</h2>
        <p className="section-sub">
          Newest first. Click an auction to bid.
        </p>
        <LiveAuctions />
      </section>
    </>
  );
}
