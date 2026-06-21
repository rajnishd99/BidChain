import { NextResponse } from "next/server";

import { auctionContract } from "@/lib/contract";

export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auction = await auctionContract.get(Number(id));
    if (!auction) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(auction);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
