import { NextResponse } from "next/server";

import { auctionContract } from "@/lib/contract";

export const revalidate = 0;

export async function GET() {
  try {
    const ids = await auctionContract.list();
    const all = await Promise.all(ids.map((id) => auctionContract.get(id)));
    return NextResponse.json(
      all.filter(Boolean).sort((a, b) => (b!.id ?? 0) - (a!.id ?? 0)),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
