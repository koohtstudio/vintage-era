import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section" style={{ textAlign: "center" }}>
      <div className="wrap">
        <h1 className="display" style={{ fontSize: 64, margin: 0 }}>Gone.</h1>
        <p style={{ margin: "12px 0 24px" }}>That piece sold, or it never existed. Every piece is one of one.</p>
        <Link className="btn btn-lime" href="/shop">Back to the shop</Link>
      </div>
    </main>
  );
}
