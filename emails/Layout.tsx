import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const ink = "#0B0B0B";
const lime = "#7CE34F";

export function Layout({ preview, children, unsubscribeUrl }: { preview: string; children: ReactNode; unsubscribeUrl?: string }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, background: "#F4F4F1", fontFamily: "Helvetica, Arial, sans-serif", color: ink }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px" }}>
          <Section style={{ background: lime, border: `2px solid ${ink}`, borderRadius: 16, padding: "14px 18px" }}>
            <Img src={`${site}/brand/era-vintage-logo.png`} alt="Era Vintage" height="44" />
          </Section>
          <Section style={{ background: "#fff", border: `2px solid ${ink}`, borderRadius: 16, padding: 24, marginTop: 12 }}>{children}</Section>
          <Text style={{ fontSize: 12, color: "#555", textAlign: "center", marginTop: 16, lineHeight: "18px" }}>
            Era Vintage · Barrie · Newmarket · Toronto
            {unsubscribeUrl ? (
              <>
                <br />
                You're getting this because you asked for drop alerts.{" "}
                <Link href={unsubscribeUrl} style={{ color: ink }}>
                  Unsubscribe
                </Link>
              </>
            ) : null}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const h1 = { fontSize: 30, margin: "0 0 12px", fontWeight: 800 as const, letterSpacing: "-0.5px" };
export const p = { fontSize: 15, lineHeight: "24px", margin: "0 0 12px" };
export const button = {
  display: "inline-block",
  background: lime,
  color: ink,
  border: `2px solid ${ink}`,
  borderRadius: 999,
  padding: "12px 22px",
  fontWeight: 700 as const,
  textDecoration: "none",
  fontSize: 14,
  textTransform: "uppercase" as const,
};
export const rule = <Hr style={{ borderColor: "#E4E4E0", margin: "16px 0" }} />;
