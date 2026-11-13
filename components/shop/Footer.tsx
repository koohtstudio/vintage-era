import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", gap: 30, flexWrap: "wrap", alignItems: "center" }}>
        <Image src="/brand/era-vintage-logo.png" alt="Era Vintage" width={150} height={73} style={{ background: "#fff", borderRadius: 14, padding: 8, height: "auto" }} />
        <div className="mono" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <Link href="/shop">Shop</Link>
          <Link href="/stores">Stores</Link>
          <a href="https://www.instagram.com/eravintagebarrie/" rel="noopener noreferrer">@eravintagebarrie</a>
          <a href="https://www.instagram.com/eravintageucm/" rel="noopener noreferrer">@eravintageucm</a>
          <a href="https://www.instagram.com/eravintageto/" rel="noopener noreferrer">@eravintageto</a>
        </div>
        <div className="mono" style={{ fontSize: 12, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>© {new Date().getFullYear()} Era Vintage</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
