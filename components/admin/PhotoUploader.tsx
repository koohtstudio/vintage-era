"use client";

import { useEffect, useRef, useState } from "react";
import { shrinkImage } from "@/lib/images/resize.client";

/** Camera or library, several photos, shrunk in the browser, then handed to the form as real files. */
export function PhotoUploader({ error }: { error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f));
    setUrls(u);
    if (input.current) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      input.current.files = dt.files;
    }
    return () => u.forEach(URL.revokeObjectURL);
  }, [files]);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    const shrunk = await Promise.all([...list].map((f) => shrinkImage(f)));
    setFiles((cur) => [...cur, ...shrunk].slice(0, 8));
    setBusy(false);
  }

  return (
    <div className="lab">
      Photos (first one is the cover)
      <div className="dropzone">
        <label className="btn btn-lime" style={{ minHeight: 48, cursor: "pointer" }}>
          Take a photo
          <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
        </label>
        <label className="btn btn-white" style={{ minHeight: 48, cursor: "pointer" }}>
          Choose photos
          <input type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
        </label>
        {busy && <span>Shrinking…</span>}
      </div>
      <input ref={input} type="file" name="photos" multiple hidden tabIndex={-1} />
      {urls.length > 0 && (
        <div className="thumbs2">
          {urls.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <div className="t" key={u}><img src={u} alt={`New photo ${i + 1}`} width={80} height={100} style={{ objectFit: "cover", width: "100%", height: "100%" }} /><button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles((c) => c.filter((_, j) => j !== i))}>✕</button></div>
          ))}
        </div>
      )}
      {error && <span role="alert" style={{ color: "var(--color-hot)", textTransform: "none", letterSpacing: 0 }}>{error}</span>}
    </div>
  );
}
