
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Mungon TWELVE_DATA_API_KEY" },
      { status: 503 }
    );
  }

  try {
    const url = new URL("https://api.twelvedata.com/price");
    url.searchParams.set("symbol", "XAU/USD");
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || data.status === "error" || !data.price) {
      return NextResponse.json(
        { error: data.message || "Nuk u mor cmimi" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      symbol: "XAU/USD",
      price: data.price,
      status: "Cmimi u mor me sukses",
    });
  } catch {
    return NextResponse.json(
      { error: "Gabim gjate lidhjes me burimin e te dhenave" },
      { status: 502 }
    );
  }
}
