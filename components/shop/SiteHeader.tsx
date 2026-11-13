import Image from "next/image";
import Link from "next/link";
import { BagButton } from "./BagButton";

export function SiteHeader() {
  return (
    <header className="nav">
      <div className="wrap navin">
        <Link href="/" aria-label="Era Vintage home">
          <Image src="/brand/era-vintage-logo.png" alt="Era Vintage" width={451} height={220} priority style={{ height: "auto" }} />
        </Link>
        <nav className="navlinks" aria-label="Main">
          <Link href="/shop">Shop</Link>
          <Link href="/shop?type=jackets">Jackets</Link>
          <Link href="/shop?type=jerseys">Jerseys</Link>
          <Link href="/stores">Stores</Link>
          <Link href="/#collective">The collective</Link>
        </nav>
        <BagButton />
      </div>
    </header>
  );
}
