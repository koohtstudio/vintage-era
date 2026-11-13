"use client";

import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const LIVE = process.env.NEXT_PUBLIC_APP_MODE === "live";

/** Cloudflare Turnstile. Stubbed (renders nothing) in mock mode. The script loads only when the form is near the viewport. */
export function Turnstile() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!LIVE || !SITE_KEY || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => (window as unknown as { turnstile?: { render: (el: HTMLElement, o: object) => void } }).turnstile?.render(el, { sitekey: SITE_KEY });
      document.head.appendChild(s);
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (!LIVE) return null;
  return <div ref={ref} style={{ minHeight: 65 }} />;
}
