"use client";

import { useState } from "react";

/** Map facade: no Google request (and no layout shift) until the visitor asks for it. */
export function MapEmbed({ query, name }: { query: string; name: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="mapframe">
      {on ? (
        <iframe title={`Map of Era Vintage ${name}`} width="100%" height="100%" loading="lazy" referrerPolicy="no-referrer" style={{ border: 0 }} src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} />
      ) : (
        <button className="btn btn-lime" onClick={() => setOn(true)}>Show map</button>
      )}
    </div>
  );
}
