import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function Page() {
  return (
    <main className="section" style={{ paddingTop: 50 }}>
      <div className="wrap" style={{ maxWidth: 720 }}>
        <h1 className="h2">Terms</h1>
        <p className="mono" style={{ background: "var(--color-pink)", border: "2px solid var(--color-ink)", borderRadius: 14, padding: 14 }}>
          [Placeholder. Replace with a reviewed policy before going live. See TODO-LIVE.md.]
        </p>
      </div>
    </main>
  );
}
