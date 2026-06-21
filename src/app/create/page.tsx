import { CreateAuctionForm } from "@/components/CreateAuctionForm";
import { config } from "@/lib/config";

export default function CreatePage() {
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <h2>Create an auction</h2>
      <p className="section-sub">
        Deploy a new auction on-chain. The seller (your connected
        wallet) will be paid automatically when settlement succeeds.
      </p>
      {!config.auctionContractId && (
        <div className="banner warning">
          No contract deployed yet. Run <code>make deploy</code> first,
          then set <code>NEXT_PUBLIC_AUCTION_CONTRACT_ID</code> in{" "}
          <code>.env</code>.
        </div>
      )}
      <CreateAuctionForm />
    </section>
  );
}
