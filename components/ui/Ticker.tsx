export function Ticker({ messages }: { messages: string[] }) {
  const list = messages.length ? messages : ["Every piece is one of one"];
  return (
    <div className="ticker" role="region" aria-label="Store news">
      <div className="track">
        {[0, 1, 2, 3].flatMap((rep) => list.map((m, i) => <span key={`${rep}-${i}`} aria-hidden={rep > 0 ? "true" : undefined}>{m}</span>))}
      </div>
    </div>
  );
}
