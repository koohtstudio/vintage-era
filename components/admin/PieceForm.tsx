"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { PieceFormState } from "@/actions/admin/pieces";
import { MEASUREMENT_FIELDS, type MeasurementKind } from "@/lib/catalog/measurements";
import { CONDITIONS, ERAS, SIZE_CHOICES } from "@/lib/catalog/options";
import { PhotoUploader } from "./PhotoUploader";

export interface FormPiece {
  title: string; categoryId: string; storeId: string; sellerId: string; size: string; era: string; condition: string;
  conditionNotes: string; authenticityNotes: string; description: string; priceDollars: string; priceTbd: boolean;
  measurements: Record<string, unknown>;
}
interface Opt { id: string; name: string }
const blank = (storeId: string, categoryId: string): FormPiece => ({ title: "", categoryId, storeId, sellerId: "", size: "", era: "90s", condition: "great", conditionNotes: "", authenticityNotes: "", description: "", priceDollars: "", priceTbd: false, measurements: {} });

export function PieceForm({
  action, categories, stores, sellers, lockedStoreId, initial, mode,
}: {
  action: (prev: PieceFormState, form: FormData) => Promise<PieceFormState>;
  categories: (Opt & { kind: MeasurementKind })[]; stores: Opt[]; sellers: Opt[];
  lockedStoreId: string | null; initial?: FormPiece; mode: "create" | "edit";
}) {
  const [state, act, pending] = useActionState(action, { ok: false, message: "" });
  const [key, setKey] = useState(0);
  const start = initial ?? blank(lockedStoreId ?? stores[0]?.id ?? "", categories[0]?.id ?? "");
  const [cat, setCat] = useState(start.categoryId);
  const [size, setSize] = useState(start.size);
  const [era, setEra] = useState(start.era);
  const [cond, setCond] = useState(start.condition);
  const [tbd, setTbd] = useState(start.priceTbd);
  const kind = categories.find((c) => c.id === cat)?.kind ?? "tops";
  const err = (k: string) => state.errors?.[k];

  if (state.ok && mode === "create") {
    return (
      <div className="panel"><div className="pbody" role="status" style={{ textAlign: "center", padding: 30 }}>
        <p className="display" style={{ fontSize: 40, margin: 0 }}>{state.published ? "Live on the site." : "Saved as a draft."}</p>
        <p>{state.title}</p>
        <div style={{ display: "grid", gap: 10 }}>
          <button className="btn btn-lime" onClick={() => setKey((k) => k + 1)}>List another</button>
          {state.published && <Link className="btn btn-white" href={`/piece/${state.slug}`} target="_blank">See it on the shop</Link>}
          <Link className="btn btn-white" href="/admin/pieces">Back to pieces</Link>
        </div>
      </div></div>
    );
  }

  const Chips = ({ name, value, set, options }: { name: string; value: string; set: (v: string) => void; options: readonly { v: string; label: string }[] }) => (
    <div className="chips" role="group">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => <button type="button" key={o.v} className="ad-chip" aria-pressed={value === o.v} onClick={() => set(o.v)}>{o.label}</button>)}
    </div>
  );
  const E = ({ k }: { k: string }) => (err(k) ? <span role="alert" style={{ color: "var(--color-hot)", textTransform: "none", letterSpacing: 0 }}>{err(k)}</span> : null);

  return (
    <form key={key} action={act} className="panel aform" noValidate>
      <div className="pbody">
        {state.message && !state.ok && <p role="alert" style={{ margin: 0, color: "var(--color-hot)", fontWeight: 700 }}>{state.message}</p>}
        {state.ok && mode === "edit" && <p role="status" style={{ margin: 0, fontWeight: 700 }}>{state.message}</p>}
        <PhotoUploader error={err("photos")} />
        <label>Title<input type="text" name="title" defaultValue={start.title} placeholder="e.g. 90s Raptors Starter jacket" autoComplete="off" /><E k="title" /></label>

        <div className="lab">Type
          <input type="hidden" name="categoryId" value={cat} />
          <div className="chips">{categories.map((c) => <button type="button" key={c.id} className="ad-chip" aria-pressed={cat === c.id} onClick={() => { setCat(c.id); setSize(""); }}>{c.name}</button>)}</div><E k="categoryId" />
        </div>
        <div className="lab">Size<Chips name="size" value={size} set={setSize} options={(SIZE_CHOICES[kind] ?? ["One size"]).map((s) => ({ v: s, label: s }))} /><E k="size" /></div>
        <div className="lab">Era<Chips name="era" value={era} set={setEra} options={ERAS.map((e) => ({ v: e, label: e }))} /></div>
        <div className="lab">Condition<Chips name="condition" value={cond} set={setCond} options={CONDITIONS.map((c) => ({ v: c.value, label: c.label }))} /></div>

        <div className="lab">Measurements, laid flat
          <div className="f2">
            {MEASUREMENT_FIELDS[kind].map((f) => f.type === "boolean" ? (
              <label key={f.key} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }}><input type="checkbox" name={`m_${f.key}`} defaultChecked={!!start.measurements[f.key]} style={{ width: 22, height: 22 }} />{f.label}</label>
            ) : (
              <label key={f.key}>{f.label}{f.type === "number" && f.unit ? ` (${f.unit})` : ""}<input type={f.type === "number" ? "number" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} step="any" name={`m_${f.key}`} defaultValue={String(start.measurements[f.key] ?? "")} /></label>
            ))}
          </div>
        </div>

        <div className="f2">
          <label>Price ($)<input type="number" inputMode="decimal" step="0.01" min="0" name="price" defaultValue={start.priceDollars} disabled={tbd} placeholder="145" /><E k="price" /></label>
          <label style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, alignSelf: "end" }}><input type="checkbox" name="priceTbd" checked={tbd} onChange={(e) => setTbd(e.target.checked)} style={{ width: 22, height: 22 }} />Price TBD</label>
        </div>
        {tbd && <input type="hidden" name="price" value="" />}

        <div className="f2">
          <label>Store
            {lockedStoreId ? (<><input type="hidden" name="storeId" value={lockedStoreId} /><select disabled value={lockedStoreId}>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></>) : (
              <select name="storeId" defaultValue={start.storeId}>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>)}
          </label>
          <label>Seller<select name="sellerId" defaultValue={start.sellerId}><option value="">Unassigned</option>{sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        </div>

        <label>Flaws / condition notes<textarea name="conditionNotes" defaultValue={start.conditionNotes} placeholder="Anything a buyer should know" /></label>
        <label>Authenticity notes<textarea name="authenticityNotes" defaultValue={start.authenticityNotes} placeholder="Tags, stitching, hardware, year clues" /></label>
        <label>Description (optional)<textarea name="description" defaultValue={start.description} /></label>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", position: "sticky", bottom: 8 }}>
          <button className="btn btn-white" name="intent" value="draft" disabled={pending}>Save draft</button>
          <button className="btn btn-lime" name="intent" value="publish" disabled={pending}>{pending ? "Saving…" : mode === "edit" ? "Save" : "Put it on the site"}</button>
        </div>
      </div>
    </form>
  );
}
