import { Profile } from "@/components/Profile";

export default function ProfilePage() {
  return (
    <section className="section" style={{ marginTop: 0 }}>
      <h2>Your profile</h2>
      <p className="section-sub">
        Reputation is updated on-chain by the contract whenever you
        create, win, or bid on an auction.
      </p>
      <Profile />
    </section>
  );
}
