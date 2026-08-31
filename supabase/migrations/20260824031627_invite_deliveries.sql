-- Track outbound invitation delivery (email / SMS) and last-send metadata.
alter table public.invites
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_sent_channel text
    check (last_sent_channel is null or last_sent_channel in ('email', 'sms', 'link'));

create table if not exists public.invite_deliveries (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  invite_id uuid not null references public.invites (id) on delete cascade,
  guest_id uuid not null references public.guests (id) on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  status text not null check (status in ('sent', 'failed')),
  provider text,
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists invite_deliveries_invite_id_idx
  on public.invite_deliveries (invite_id, created_at desc);
create index if not exists invite_deliveries_party_id_idx
  on public.invite_deliveries (party_id, created_at desc);
create index if not exists invite_deliveries_guest_id_idx
  on public.invite_deliveries (guest_id);

alter table public.invite_deliveries enable row level security;

create policy "invite_deliveries_all" on public.invite_deliveries
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));
