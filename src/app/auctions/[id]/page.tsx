import { AuctionDetail } from "@/components/AuctionDetail";

export default async function AuctionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AuctionDetail id={Number(id)} />;
}
