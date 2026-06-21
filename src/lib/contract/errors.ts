/**
 * Mirror of the `ContractError` enum from
 * `contracts/auction/src/errors.rs`. The numeric codes must stay in
 * sync with the contract — they are what the FE uses to render a
 * human-readable message and decide whether the error is
 * recoverable.
 *
 * To add a new error: bump the discriminant in the Rust enum, then
 * add a matching entry here. Never renumber an existing entry.
 */

export const ContractErrorCode = {
  InvalidDuration: 1,
  InvalidPrice: 2,
  AuctionNotFound: 3,
  AuctionAlreadySettled: 4,
  AuctionNotStarted: 5,
  AuctionEnded: 6,
  InvalidBidAmount: 7,
  BidNotHighEnough: 8,
  FirstBidBelowStartingPrice: 9,
  SellerCannotBid: 10,
  AuctionNotYetEnded: 11,
} as const;

export type ContractErrorCode = (typeof ContractErrorCode)[keyof typeof ContractErrorCode];

const messages: Record<number, string> = {
  [ContractErrorCode.InvalidDuration]:
    "Auction duration must be greater than zero.",
  [ContractErrorCode.InvalidPrice]:
    "Prices must be non-negative.",
  [ContractErrorCode.AuctionNotFound]:
    "This auction does not exist (it may have been removed).",
  [ContractErrorCode.AuctionAlreadySettled]:
    "This auction has already been settled.",
  [ContractErrorCode.AuctionNotStarted]:
    "This auction hasn't started yet — try again in a moment.",
  [ContractErrorCode.AuctionEnded]:
    "This auction has already ended.",
  [ContractErrorCode.InvalidBidAmount]:
    "Bid amount must be greater than zero.",
  [ContractErrorCode.BidNotHighEnough]:
    "Your bid must be higher than the current highest bid.",
  [ContractErrorCode.FirstBidBelowStartingPrice]:
    "Your first bid must meet the seller's starting price.",
  [ContractErrorCode.SellerCannotBid]:
    "The seller cannot bid on their own auction.",
  [ContractErrorCode.AuctionNotYetEnded]:
    "This auction hasn't ended yet — try settling it after the timer runs out.",
};

export function describeContractError(code: number | undefined | null): string {
  if (code == null) return "Unknown contract error.";
  return messages[code] ?? `Contract error #${code} (no description).`;
}
