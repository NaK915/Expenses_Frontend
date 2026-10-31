"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createGroup } from "@/lib/api";
import { CURRENCIES } from "@/lib/currency";
import { ErrorNotice } from "./shell";
import { useAuth } from "./auth-provider";

export function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { user } = useAuth();
  const [currency, setCurrency] = useState(user?.preferred_currency ?? "INR");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const group = await createGroup(name.trim(), description.trim(), currency);
      router.push(`/groups/${encodeURIComponent(group.id)}`);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create this group.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="create-group-title">
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <span className="tiny-kicker">A NEW SHARED SPACE</span>
        <h2 id="create-group-title">Start a group</h2>
        <p className="dialog-intro">Give your people a place to keep the plans and the numbers together.</p>
        {error && <ErrorNotice message={error} />}
        <form className="stacked-form" onSubmit={submit}>
          <label>Group name<input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Lake weekend" /></label>
          <label>Group currency<select required value={currency} onChange={(event) => setCurrency(event.target.value)}>{CURRENCIES.map((option) => <option key={option.code} value={option.code}>{option.code} · {option.name}</option>)}</select><small className="field-hint">Fixed for everyone in this group.</small></label>
          <label>Description <span className="optional-label">OPTIONAL</span><textarea rows={3} maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A note for everyone in the group" /></label>
          <button className="button button-primary" disabled={busy}>{busy ? "Creating…" : "Create group"}</button>
        </form>
      </section>
    </div>
  );
}