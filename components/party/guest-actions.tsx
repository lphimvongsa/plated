"use client";

import { Modal } from "@/components/modal";
import { ChannelCard, type OutboundStatus } from "@/components/party/send-invite";
import { addGuest, deleteGuest } from "@/lib/actions/parties";
import { markInviteLinkCopied, sendGuestInvite } from "@/lib/actions/send-invite";
import { Check, Copy, Link2, Mail, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

export function GuestActions({
  guestId,
  guestName,
  partyId,
}: {
  guestId: string;
  guestName: string;
  partyId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-icon h-9 w-9 shrink-0"
      aria-label={`Remove ${guestName}`}
      onClick={() =>
        startTransition(async () => {
          await deleteGuest(guestId, partyId);
        })
      }
    >
      <Trash2 size={14} />
    </button>
  );
}

export function AddGuestForm({
  partyId,
  outbound,
}: {
  partyId: string;
  outbound: OutboundStatus;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "link">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setChannel("email");
    setEmail("");
    setPhone("");
    setStatus(null);
    setError(null);
    setCopied(false);
  }

  function close() {
    reset();
    setOpen(false);
  }

  function add(then: "email" | "sms" | "link") {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const created = await addGuest(partyId, {
        name: trimmed,
        email: then === "email" ? email.trim() : undefined,
        phone: then === "sms" ? phone.trim() : undefined,
      });
      if (created.error || !created.guestId || !created.token) {
        setError(created.error ?? "Could not add guest.");
        return;
      }

      if (then === "link") {
        const url = `${window.location.origin}/invite/${created.token}`;
        try {
          await navigator.clipboard.writeText(url);
          if (created.inviteId) await markInviteLinkCopied(created.inviteId, partyId);
          setCopied(true);
          setStatus("Guest added. Invite link copied.");
          window.setTimeout(() => close(), 900);
        } catch {
          setError(`Guest added, but the link could not be copied. ${url}`);
        }
        return;
      }

      const result = await sendGuestInvite({
        partyId,
        guestId: created.guestId,
        channel: then,
        recipient: then === "email" ? email : phone,
      });
      if (result.error) {
        setError(`Guest added, but the invite did not send. ${result.error}`);
        return;
      }
      setStatus(then === "email" ? `Guest added and emailed.` : `Guest added and texted.`);
      window.setTimeout(() => close(), 900);
    });
  }

  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add guest
      </button>
      <Modal open={open} onClose={close} title="Add guest" panelClassName="md:max-w-xl">
        <p className="font-handwritten text-lg text-tomato">Name them, then send the same way you would from the list.</p>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-xs font-semibold">Name</span>
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Guest name" autoFocus />
        </label>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ChannelCard
            selected={channel === "email"}
            icon={Mail}
            title="Email"
            body="Save their address and send the invitation now."
            onClick={() => {
              setChannel("email");
              setStatus(null);
              setError(null);
            }}
          />
          <ChannelCard
            selected={channel === "sms"}
            icon={MessageSquare}
            title="Phone"
            body="Save their number and text the RSVP link."
            onClick={() => {
              setChannel("sms");
              setStatus(null);
              setError(null);
            }}
          />
          <ChannelCard
            selected={channel === "link"}
            icon={Link2}
            title="Copy link"
            body="Add them and copy a private invite URL."
            onClick={() => {
              setChannel("link");
              setStatus(null);
              setError(null);
            }}
          />
        </div>

        {channel === "email" ? (
          <div className="mt-6 space-y-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold">Email address</span>
              <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="guest@email.com" />
            </label>
            {!outbound.email ? (
              <p className="text-xs leading-relaxed text-ink/50">
                Email is not configured yet. Add <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code> to <code>.env.local</code>.
              </p>
            ) : null}
            <button
              type="button"
              className="btn-primary w-full"
              disabled={pending || !name.trim() || !email.trim() || !outbound.email}
              onClick={() => add("email")}
            >
              <Mail size={15} /> {pending ? "Adding…" : "Add and email"}
            </button>
          </div>
        ) : null}

        {channel === "sms" ? (
          <div className="mt-6 space-y-3">
            <label>
              <span className="mb-1.5 block text-xs font-semibold">Phone number</span>
              <input className="field" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(555) 123-4567" />
            </label>
            {!outbound.sms ? (
              <p className="text-xs leading-relaxed text-ink/50">
                Texting is not configured yet. Add the Account SID (starts with AC) and Auth Token from the Twilio Console, plus{" "}
                <code>TWILIO_FROM_NUMBER</code>.
              </p>
            ) : null}
            <button
              type="button"
              className="btn-primary w-full"
              disabled={pending || !name.trim() || !phone.trim() || !outbound.sms}
              onClick={() => add("sms")}
            >
              <MessageSquare size={15} /> {pending ? "Adding…" : "Add and text"}
            </button>
          </div>
        ) : null}

        {channel === "link" ? (
          <div className="mt-6">
            <button type="button" className="btn-primary w-full" disabled={pending || !name.trim()} onClick={() => add("link")}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {pending ? "Adding…" : copied ? "Copied" : "Add and copy link"}
            </button>
          </div>
        ) : null}

        {status ? <p className="mt-4 border border-olive/25 bg-olive/10 px-3 py-2 text-xs font-semibold text-olive">{status}</p> : null}
        {error ? <p className="mt-4 border border-tomato/25 bg-tomato/10 px-3 py-2 text-xs font-semibold text-tomato">{error}</p> : null}
      </Modal>
    </>
  );
}
