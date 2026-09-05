-- Route in-app notification RPCs into public.notifications (V5 inbox table)
-- instead of the legacy user_notifications table, and expose them on Realtime.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  party_id uuid references public.parties(id) on delete cascade,
  type text not null check (type in ('rsvp','collaborator_invite','collaborator_accept')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_owner_select" on public.notifications;
create policy "notifications_owner_select" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.notifications to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

-- Drop every overload of queue_rsvp_notification without hard-coding
-- (uuid, text), which raises 42883 when that signature is absent.
do $$
declare
  r record;
begin
  for r in
    select pg_catalog.format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_catalog.pg_get_function_identity_arguments(p.oid)
    ) as sig
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'queue_rsvp_notification'
  loop
    execute 'drop function if exists ' || r.sig;
  end loop;
end $$;

create or replace function public.queue_rsvp_notification(
  p_party_id uuid,
  p_guest_name text,
  p_rsvp_status text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest text := coalesce(nullif(trim(p_guest_name), ''), 'A guest');
  v_status text := case lower(coalesce(p_rsvp_status, ''))
    when 'attending' then 'Attending'
    when 'maybe' then 'Maybe'
    when 'not_attending' then 'Can’t make it'
    else null
  end;
  v_party_name text;
begin
  select name into v_party_name from public.parties where id = p_party_id;

  insert into public.notifications(user_id, party_id, type, title, body, href)
  select distinct
    x.user_id,
    p_party_id,
    'rsvp',
    v_guest || ' RSVP’d',
    case
      when v_status is not null and v_party_name is not null then v_status || ' · ' || v_party_name
      when v_status is not null then v_status
      when v_party_name is not null then v_guest || ' responded to ' || v_party_name || '.'
      else v_guest || ' responded to your dinner.'
    end,
    '/app/parties/' || p_party_id::text || '/guests'
  from (
    select owner_id as user_id from public.parties where id = p_party_id
    union
    select user_id from public.party_members
    where party_id = p_party_id and role in ('owner', 'co_owner')
  ) x
  where x.user_id is not null;
end;
$$;

create or replace function public.queue_collaborator_invite_notification(p_email text, p_party_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from public.parties where id = p_party_id;

  insert into public.notifications(user_id, party_id, type, title, body, href)
  select
    id,
    p_party_id,
    'collaborator_invite',
    'Collaborator invitation',
    'You were invited to collaborate on ' || coalesce(v_name, 'a dinner') || '.',
    '/app/inbox'
  from public.profiles
  where lower(email) = lower(p_email);
end;
$$;

create or replace function public.queue_collaborator_accept_notification(
  p_party_id uuid,
  p_invited_by uuid,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(nullif(trim(p_name), ''), 'Your collaborator');
  v_party_name text;
begin
  select name into v_party_name from public.parties where id = p_party_id;

  insert into public.notifications(user_id, party_id, type, title, body, href)
  select distinct
    x.user_id,
    p_party_id,
    'collaborator_accept',
    'Collaborator accepted',
    v_name || ' joined ' || coalesce(v_party_name, 'your dinner') || '.',
    '/app/parties/' || p_party_id::text || '/settings'
  from (
    select owner_id as user_id from public.parties where id = p_party_id
    union
    select p_invited_by
  ) x
  where x.user_id is not null;
end;
$$;

-- Only the 3-arg signature exists (3rd param has a DEFAULT).
-- Do NOT grant on queue_rsvp_notification(uuid, text) — that OID does not exist.
grant execute on function public.queue_rsvp_notification(uuid, text, text) to anon, authenticated;
grant execute on function public.queue_collaborator_invite_notification(text, uuid) to authenticated;
grant execute on function public.queue_collaborator_accept_notification(uuid, uuid, text) to authenticated;
