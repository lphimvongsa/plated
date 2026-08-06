"use client";

import { deleteParty, updatePartySettings } from "@/lib/actions/parties";
import { Archive, Copy, Save, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

type SettingsParty = {
  id: string;
  name: string;
  location: string | null;
  theme: string | null;
  cuisine: string | null;
  service_style: string | null;
  dress_code: string | null;
  guest_contribution_notes: string | null;
  date: string;
  time: string;
};

export function PartySettingsForm({ party }: { party: SettingsParty }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">Party settings</p>
        <h2 className="mt-2 font-editorial text-5xl font-semibold">Details, access, and defaults.</h2>
        <p className="mt-4 max-w-2xl text-sm text-ink/55">
          Changes to date, time, or guest count can trigger a fresh recipe scale, cost estimate, timeline, and assignment
          pass.
        </p>
      </section>
      {message ? (
        <div className="rounded-2xl border border-olive/25 bg-olive/8 p-4 text-sm font-semibold text-olive">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-tomato/25 bg-tomato/5 p-4 text-sm font-semibold text-tomato">{error}</div>
      ) : null}
      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            setMessage(null);
            setError(null);
            startTransition(async () => {
              const result = await updatePartySettings(party.id, formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setMessage("Changes saved.");
            });
          }}
        >
          <article className="card p-6">
            <p className="eyebrow">Event details</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold">Party name</span>
                <input className="field" name="name" defaultValue={party.name} required />
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold">Date</span>
                <input className="field" name="date" type="date" defaultValue={party.date} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold">Start time</span>
                <input className="field" name="time" type="time" defaultValue={party.time} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold">Location</span>
                <input className="field" name="location" defaultValue={party.location ?? ""} />
              </label>
            </div>
          </article>
          <article className="card p-6">
            <p className="eyebrow">Theme and invite</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-semibold">Theme</span>
                <input className="field" name="theme" defaultValue={party.theme ?? ""} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold">Cuisine</span>
                <input className="field" name="cuisine" defaultValue={party.cuisine ?? ""} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold">Service style</span>
                <input className="field" name="service_style" defaultValue={party.service_style ?? ""} />
              </label>
              <label>
                <span className="mb-2 block text-xs font-semibold">Dress code</span>
                <input className="field" name="dress_code" defaultValue={party.dress_code ?? ""} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-semibold">Guests can bring</span>
                <input
                  className="field"
                  name="guest_contribution_notes"
                  defaultValue={party.guest_contribution_notes ?? ""}
                />
              </label>
            </div>
          </article>
          <button type="submit" className="btn-primary" disabled={pending}>
            <Save size={16} /> {pending ? "Saving…" : "Save changes"}
          </button>
        </form>
        <aside className="space-y-4">
          <article className="card p-5">
            <p className="eyebrow">Party actions</p>
            <div className="mt-5 space-y-2">
              <button type="button" className="btn-secondary w-full justify-start" disabled>
                <Copy size={16} /> Duplicate party
              </button>
              <button type="button" className="btn-secondary w-full justify-start" disabled>
                <Archive size={16} /> Archive party
              </button>
            </div>
          </article>
          <article className="rounded-[1.75rem] border border-tomato/25 bg-tomato/5 p-5">
            <p className="font-editorial text-2xl font-semibold text-tomato">Danger zone</p>
            <p className="mt-2 text-xs leading-relaxed text-ink/50">
              Deleting a party will remove guests, assignments, receipts, and party-specific recipe edits.
            </p>
            <button
              type="button"
              disabled={deleting}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-tomato"
              onClick={() => {
                if (!window.confirm("Delete this party permanently?")) return;
                startDelete(async () => {
                  const result = await deleteParty(party.id);
                  if (result?.error) setError(result.error);
                });
              }}
            >
              <Trash2 size={15} /> {deleting ? "Deleting…" : "Delete party"}
            </button>
          </article>
        </aside>
      </section>
    </div>
  );
}
