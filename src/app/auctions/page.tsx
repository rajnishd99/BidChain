import { LiveAuctions } from "@/components/LiveAuctions";

export default function AuctionsPage() {
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <h2>All auctions</h2>
      <p className="section-sub">Newest first.</p>
      <LiveAuctions />
    </section>
  );
}
