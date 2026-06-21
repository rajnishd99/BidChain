/**
 * App-wide network + contract configuration. Reads from
 * `process.env.NEXT_PUBLIC_*` with sensible defaults. The spec
 * requires the following env vars (per §10):
 *
 *   NEXT_PUBLIC_STELLAR_NETWORK
 *   NEXT_PUBLIC_RPC_URL
 *   NEXT_PUBLIC_CONTRACT_ID
 *   NEXT_PUBLIC_HORIZON_URL
 *
 * `NEXT_PUBLIC_CONTRACT_ID` is an alias for the project-specific
 * `NEXT_PUBLIC_AUCTION_CONTRACT_ID`.
 */

export type Network = "testnet" | "futurenet" | "mainnet" | string;

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "testnet") as Network;

const RPC_BY_NETWORK: Record<string, string> = {
  testnet: "https://soroban-testnet.stellar.org",
  futurenet: "https://soroban-futurenet.stellar.org",
  public: "https://soroban-mainnet.stellar.org",
  mainnet: "https://soroban-mainnet.stellar.org",
};

const PASSPHRASE_BY_NETWORK: Record<string, string> = {
  testnet: "Test SDF Network ; September 2015",
  futurenet: "Test SDF Future Network ; October 2022",
  public: "Public Global Stellar Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
};

export const config = {
  network: NETWORK,
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ??
    process.env.NEXT_PUBLIC_STELLAR_RPC_URL ??
    RPC_BY_NETWORK[NETWORK] ??
    "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ??
    PASSPHRASE_BY_NETWORK[NETWORK] ??
    "Test SDF Network ; September 2015",
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ??
    (NETWORK === "public" || NETWORK === "mainnet"
      ? "https://horizon.stellar.org"
      : NETWORK === "futurenet"
        ? "https://horizon-futurenet.stellar.org"
        : "https://horizon-testnet.stellar.org"),
  // The contract id is filled in by `make deploy`. Either env var
  // is honoured so existing setups keep working.
  auctionContractId:
    process.env.NEXT_PUBLIC_CONTRACT_ID ??
    process.env.NEXT_PUBLIC_AUCTION_CONTRACT_ID ??
    "",
  defaultTokenAddress:
    process.env.NEXT_PUBLIC_DEFAULT_TOKEN_ADDRESS ?? "",
} as const;

export const isConfigured = (): boolean =>
  Boolean(config.auctionContractId && config.rpcUrl);
