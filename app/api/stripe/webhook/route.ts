import { NextResponse } from "next/server";
import { isMock } from "@/lib/mode";
import { handleStripeWebhook } from "@/lib/payments/webhook";

export const dynamic = "force-dynamic";

/** Stripe calls this. The raw body is needed to verify the signature, so we never parse JSON first. */
export async function POST(req: Request) {
  if (isMock) return NextResponse.json({ error: "webhook disabled in mock mode" }, { status: 404 });
  const raw = await req.text();
  const res = await handleStripeWebhook(raw, req.headers.get("stripe-signature"));
  return new NextResponse(res.body, { status: res.status });
}
