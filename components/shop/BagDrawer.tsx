"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { displayPrice, displayTotal } from "@/lib/money";
import { HoldCountdown } from "./HoldCountdown";
import { useBag } from "./BagProvider";

export function BagDrawer() {
  const { lines, open, setOpen, now, remove, count, holdMinutes } = useBag();
  const subtotal = lines.reduce((s, l) => s + l.priceCents, 0);
  const anyPlaceholder = lines.some((l) => l.pricePlaceholder);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim" />
        <Dialog.Content className="drawer" aria-describedby="bag-desc">
          <div className="dh">
            <Dialog.Title className="display" style={{ fontSize: 32 }}>
              Your bag
            </Dialog.Title>
            <Dialog.Close className="x" aria-label="Close bag">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Dialog.Close>
          </div>
          <Dialog.Description id="bag-desc" className="sr-only">
            Pieces held for you while you check out.
          </Dialog.Description>

          <div className="db">
            {lines.length === 0 ? (
              <div className="done">
                <p className="display" style={{ fontSize: 34, margin: 0 }}>
                  Bag's empty
                </p>
                <p style={{ margin: 0, color: "var(--color-mute)" }}>Go find your era.</p>
                <Link className="btn btn-lime" href="/shop" onClick={() => setOpen(false)}>
                  Shop now
                </Link>
              </div>
            ) : (
              <>
                <p className="mono" style={{ fontSize: 12, margin: 0, color: "var(--color-mute)" }}>
                  Every piece is one of one. We hold each for {holdMinutes} minutes, then it goes back on the rack.
                </p>
                {lines.map((l) => (
                  <div className="line" key={l.pieceId}>
                    <div className="th">
                      {l.cover ? <Image src={l.cover.url} alt="" fill sizes="64px" placeholder={l.cover.blur ? "blur" : "empty"} blurDataURL={l.cover.blur ?? undefined} style={{ objectFit: "cover" }} /> : null}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <b>
                        <Link href={`/piece/${l.slug}`} onClick={() => setOpen(false)} style={{ textDecoration: "none" }}>
                          {l.title}
                        </Link>
                      </b>
                      <small>
                        Size {l.size} · {displayPrice(l.priceCents, l.pricePlaceholder)}
                      </small>
                      <br />
                      <HoldCountdown expiresAt={l.expiresAt} now={now} />
                    </div>
                    <button className="rm" onClick={() => void remove(l.pieceId)} aria-label={`Remove ${l.title}`}>
                      ✕
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {lines.length > 0 && (
            <div className="dfo">
              <div className="sum">
                <span>{count} piece{count === 1 ? "" : "s"}</span>
                <b>{displayTotal(subtotal, anyPlaceholder)}</b>
              </div>
              <Link className="btn btn-lime" href="/checkout" onClick={() => setOpen(false)}>
                Checkout
              </Link>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
