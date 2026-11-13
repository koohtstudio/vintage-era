"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBag } from "./BagProvider";

const icon = (d: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Phone app feel: fixed pill bar (Home, Shop, Bag with count, Stores). Hidden on desktop by CSS. */
export function TabBar() {
  const path = usePathname();
  const { count, setOpen } = useBag();
  const cur = (href: string) => (href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined;
  return (
    <nav className="tabbar" aria-label="Quick menu">
      <Link className="tab" href="/" aria-current={cur("/")}>
        {icon("M4 11l8-7 8 7v9H4z")}Home
      </Link>
      <Link className="tab" href="/shop" aria-current={cur("/shop")}>
        {icon("M8 3l-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4c-1 2-2.5 3-4 3S9 5 8 3z")}Shop
      </Link>
      <button className="tab main" onClick={() => setOpen(true)} aria-label={`Open bag, ${count} pieces`}>
        {icon("M6 7h12l1 13H5L6 7zM9 7a3 3 0 0 1 6 0")}Bag {count}
      </button>
      <Link className="tab" href="/stores" aria-current={cur("/stores")}>
        {icon("M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0")}Stores
      </Link>
    </nav>
  );
}
