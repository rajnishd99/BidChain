/**
 * Well-known Stellar Asset Contract (SAC) addresses for the
 * native XLM asset on each Stellar network. BidChain settles all
 * auctions in native XLM — the form picks this address up
 * automatically so users don't have to paste a contract id.
 *
 * Source: https://developers.stellar.org/docs/tokens/stellar-asset-contract
 */

const NATIVE_XLM_SAC: Record<string, string> = {
  testnet: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  futurenet: "CDMLFM6TDZFJ6Q3YJFSPMGJ6IA3LITGEQRXIV3FWMKUBB3FSV5DOMHM3",
  public: "CAS3J7GYLGXMFWHJTMCSJBHIK6W6ZIUY3WPBFHXSQ6H5D7KLS4GICR6F",
  mainnet: "CAS3J7GYLGXMFWHJTMCSJBHIK6W6ZIUY3WPBFHXSQ6H5D7KLS4GICR6F",
};

export function nativeXlmSac(network: string): string {
  const addr = NATIVE_XLM_SAC[network];
  if (!addr) {
    throw new Error(
      `No native XLM SAC address registered for network "${network}". ` +
        `Known networks: ${Object.keys(NATIVE_XLM_SAC).join(", ")}.`,
    );
  }
  return addr;
}
