import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unsubscribe } from "@/actions/subscribe";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const done = (await searchParams).done === "1";

  async function confirm() {
    "use server";
    await unsubscribe(token);
    redirect(`/unsubscribe/${token}?done=1`);
  }

  return (
    <main className="section" style={{ paddingTop: 70 }}>
      <div className="wrap" style={{ maxWidth: 560 }}>
        {done ? (
          <>
            <h1 className="display" style={{ fontSize: 48, margin: 0 }}>You&apos;re unsubscribed.</h1>
            <p style={{ lineHeight: 1.6 }}>We won&apos;t send you any more drop alerts. You can sign up again any time.</p>
            <Link className="btn btn-ink" href="/">Back to the shop</Link>
          </>
        ) : (
          <form action={confirm}>
            <h1 className="display" style={{ fontSize: 48, margin: 0 }}>Unsubscribe from drop alerts?</h1>
            <p style={{ lineHeight: 1.6 }}>One tap and we stop messaging you.</p>
            <button className="btn btn-ink" type="submit">Unsubscribe me</button>
          </form>
        )}
      </div>
    </main>
  );
}
