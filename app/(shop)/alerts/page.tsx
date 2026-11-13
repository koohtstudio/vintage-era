import type { Metadata } from "next";
import { AlertSignup } from "@/components/shop/AlertSignup";

export const metadata: Metadata = { title: "Drop alerts", description: "Get a text or email when new pieces drop." };

export default function AlertsPage() {
  return (
    <main className="section" style={{ paddingTop: 50 }}>
      <div className="wrap">
        <div className="alert">
          <div>
            <h1 className="display" style={{ fontSize: "clamp(40px, 7vw, 58px)", margin: 0, lineHeight: 0.95 }}>Never miss a drop.</h1>
            <p style={{ margin: "12px 0 0", lineHeight: 1.6 }}>We only message you when new pieces land. Every message has an unsubscribe link.</p>
          </div>
          <AlertSignup source="alerts-page" />
        </div>
      </div>
    </main>
  );
}
