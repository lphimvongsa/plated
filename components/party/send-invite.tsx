"use client";

import { Modal } from "@/components/modal";
import { markInviteLinkCopied, sendGuestInvite, sendGuestInvites, type InviteChannel } from "@/lib/actions/send-invite";
import { Check, Copy, Link2, Mail, MessageSquare, Send } from "lucide-react";
import { useState, useTransition } from "react";

export type OutboundStatus = {
  email: boolean;
  sms: boolean;
};

export type SendableGuest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  invite: { id: string; token: string; revoked_at: string | null } | null;
  lastSentAt: string | null;
  lastSentChannel: string | null;
};

function inviteHref(token: string) {
  return `${window.location.origin}/invite/${token}`;
}

function lastSentLabel(at: string | null, channel: string | null) {
  if (!at) return null;
  const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(at));
  const via = channel === "email" ? "Emailed" : channel === "sms" ? "Texted" : "Copied";
  return `${via} ${when}`;
}

export function SendInviteButton({
  partyId,
  guest,
  outbound,
}: {
  partyId: string;
  guest: SendableGuest;
  outbound: OutboundStatus;
}) {
  const [open, setOpen] = useState(false);
  const sent = lastSentLabel(guest.lastSentAt, guest.lastSentChannel);

  return (
    <>
      <button
        type="button"
        className="btn-secondary !h-9 !min-h-9 !w-full !px-2 text-[10px]"
        title={sent ?? "Send invite"}
        onClick={() => setOpen(true)}
      >
        <Send size={13} /> Send
      </button>
      <SendInviteDialog partyId={partyId} guest={guest} outbound={outbound} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function SendAllInvitesButton({
  partyId,
  guests,
  outbound,
}: {
  partyId: string;
  guests: SendableGuest[];
  outbound: OutboundStatus;
}) {
  const [open, setOpen] = useState(false);
  if (!guests.length) return null;
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Send size={15} /> Send invitations
      </button>
      <SendAllDialog partyId={partyId} guests={guests} outbound={outbound} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ChannelCard({
  selected,
  icon: Icon,
  title,
  body,
  onClick,
}: {
  selected: boolean;
  icon: typeof Mail;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-4 text-left transition hover:-translate-y-0.5 ${
        selected ? "border-ink bg-ink text-paper" : "border-ink/15 bg-white/40 hover:border-tomato"
      }`}
    >
      <Icon size={18} className={selected ? "text-orange" : "text-tomato"} />
      <p className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${selected ? "text-paper/55" : "text-ink/45"}`}>
        {title}
      </p>
      <p className={`mt-1 text-sm leading-snug ${selected ? "text-paper/80" : "text-ink/70"}`}>{body}</p>
    </button>
  );
}

function SendInviteDialog({
  partyId,
  guest,
  outbound,
  open,
  onClose,
}: {
  partyId: string;
  guest: SendableGuest;
  outbound: OutboundStatus;
  open: boolean;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<"email" | "sms" | "link">("email");
  const [email, setEmail] = useState(guest.email ?? "");
  const [phone, setPhone] = useState(guest.phone ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const token = guest.invite?.token;

  function copyLink() {
    if (!token) return;
    const url = inviteHref(token);
    startTransition(async () => {
      await navigator.clipboard.writeText(url);
      if (guest.invite) await markInviteLinkCopied(guest.invite.id, partyId);
      setCopied(true);
      setStatus("Invite link copied.");
      setError(null);
      window.setTimeout(() => setCopied(false), 1800);
    });
  }

  function send(next: InviteChannel) {
    if (!token) return;
    const recipient = next === "email" ? email : phone;
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const result = await sendGuestInvite({
        partyId,
        guestId: guest.id,
        channel: next,
        recipient,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus(next === "email" ? `Invitation emailed to ${email.trim()}.` : `Invitation texted to ${phone.trim()}.`);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Send to ${guest.name}`} panelClassName="md:max-w-xl">
      <p className="font-handwritten text-lg text-tomato">Choose how this invitation leaves the table.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ChannelCard
          selected={channel === "email"}
          icon={Mail}
          title="Email"
          body="Sends the invite plus a Google Calendar button and .ics file."
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
          body="Texts a short note with the RSVP link and calendar on the page."
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
          body="Copy a private invite URL you can paste anywhere."
          onClick={() => {
            setChannel("link");
            setStatus(null);
            setError(null);
            copyLink();
          }}
        />
      </div>

      {channel === "email" ? (
        <div className="mt-6 space-y-3">
          <label>
            <span className="mb-1.5 block text-xs font-semibold">Email address</span>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="guest@email.com" />
          </label>
          {!outbound.email ? (
            <p className="text-xs leading-relaxed text-ink/50">
              Email is not configured yet. Add <code>GMAIL_USER</code> and <code>GMAIL_APP_PASSWORD</code> to <code>.env.local</code>.
            </p>
          ) : null}
          <button type="button" className="btn-primary w-full" disabled={pending || !email.trim() || !outbound.email} onClick={() => send("email")}>
            <Mail size={15} /> {pending ? "Sending…" : "Send email"}
          </button>
        </div>
      ) : null}

      {channel === "sms" ? (
        <div className="mt-6 space-y-3">
          <label>
            <span className="mb-1.5 block text-xs font-semibold">Phone number</span>
            <input className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
          </label>
          {!outbound.sms ? (
            <p className="text-xs leading-relaxed text-ink/50">
              Texting is not configured yet. Add the Account SID (starts with AC) and Auth Token from the Twilio Console, plus <code>TWILIO_FROM_NUMBER</code>.
            </p>
          ) : null}
          <button type="button" className="btn-primary w-full" disabled={pending || !phone.trim() || !outbound.sms} onClick={() => send("sms")}>
            <MessageSquare size={15} /> {pending ? "Sending…" : "Send text"}
          </button>
        </div>
      ) : null}

      {channel === "link" ? (
        <div className="mt-6 space-y-3">
          <div className="flex gap-2">
            <input className="field" readOnly value={token ? `/invite/${token}` : "No invite yet"} />
            <button type="button" className="btn-secondary shrink-0" disabled={!token || pending} onClick={copyLink}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ) : null}

      {status ? <p className="mt-4 border border-olive/25 bg-olive/10 px-3 py-2 text-xs font-semibold text-olive">{status}</p> : null}
      {error ? <p className="mt-4 border border-tomato/25 bg-tomato/10 px-3 py-2 text-xs font-semibold text-tomato">{error}</p> : null}
    </Modal>
  );
}

function SendAllDialog({
  partyId,
  guests,
  outbound,
  open,
  onClose,
}: {
  partyId: string;
  guests: SendableGuest[];
  outbound: OutboundStatus;
  open: boolean;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<InviteChannel>("email");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = guests.filter((guest) => (channel === "email" ? guest.email : guest.phone));
  const missing = guests.length - ready.length;
  const configured = channel === "email" ? outbound.email : outbound.sms;

  return (
    <Modal open={open} onClose={onClose} title="Send invitations" panelClassName="md:max-w-xl">
      <p className="font-handwritten text-lg text-tomato">Email or text everyone who already has a contact.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ChannelCard
          selected={channel === "email"}
          icon={Mail}
          title="Email"
          body={`${guests.filter((guest) => guest.email).length} guests have an email.`}
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
          body={`${guests.filter((guest) => guest.phone).length} guests have a phone number.`}
          onClick={() => {
            setChannel("sms");
            setStatus(null);
            setError(null);
          }}
        />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink/50">
        {ready.length} will send now{missing ? `, and ${missing} will be skipped until you add a ${channel === "email" ? "email" : "phone number"}` : ""}.
        Each email includes an Add to Google Calendar button.
      </p>
      {!configured ? (
        <p className="mt-3 text-xs leading-relaxed text-ink/50">
          {channel === "email"
            ? "Email is not configured yet. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local."
            : "Texting is not configured yet. Add TWILIO_ACCOUNT_SID (starts with AC), TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER from the Twilio Console."}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-primary mt-5 w-full"
        disabled={pending || !ready.length || !configured}
        onClick={() => {
          setError(null);
          setStatus(null);
          startTransition(async () => {
            const result = await sendGuestInvites({
              partyId,
              channel,
              guestIds: ready.map((guest) => guest.id),
            });
            if (result.failed.length && !result.sent) {
              setError(result.failed[0]?.error ?? "Could not send invitations.");
              return;
            }
            const failNote = result.failed.length ? ` ${result.failed.length} failed.` : "";
            setStatus(`Sent ${result.sent} invitation${result.sent === 1 ? "" : "s"}.${failNote}`);
            if (result.failed.length) setError(result.failed.map((row) => `${row.name}: ${row.error}`).join(" "));
          });
        }}
      >
        <Send size={15} /> {pending ? "Sending…" : channel === "email" ? "Email invitations" : "Text invitations"}
      </button>
      {status ? <p className="mt-4 border border-olive/25 bg-olive/10 px-3 py-2 text-xs font-semibold text-olive">{status}</p> : null}
      {error ? <p className="mt-4 border border-tomato/25 bg-tomato/10 px-3 py-2 text-xs font-semibold text-tomato">{error}</p> : null}
    </Modal>
  );
}
