import type { Metadata } from "next";
import Link from "next/link";

import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { TxToasts } from "@/components/system/TxToasts";
import { WalletButton } from "@/components/WalletButton";
import { config } from "@/lib/config";

import "../styles/globals.css";

export const metadata: Metadata = {
  title: "BidChain — on-chain auctions on Stellar",
  description:
    "A decentralized, real-time auction marketplace powered by Soroban smart contracts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <div className="app-shell">
            <header className="app-header">
              <Link href="/" className="brand">
                <div className="brand-mark">B</div>
                <h1>BidChain</h1>
              </Link>
              <nav>
                <Link href="/auctions">Auctions</Link>
                <Link href="/create">Create</Link>
                <Link href="/profile">Profile</Link>
              </nav>
              <div className="app-header-right">
                <span className="app-network">{config.network}</span>
                <WalletButton />
              </div>
            </header>
            <main>{children}</main>
            <TxToasts />
            <footer className="app-footer">
              BidChain · built on Stellar · contracts in <code>/contracts</code>
            </footer>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
