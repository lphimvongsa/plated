create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique, subscription jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true, rsvp boolean not null default true, collaborator_invite boolean not null default true, collaborator_accept boolean not null default true, updated_at timestamptz not null default now()
);
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, title text not null, body text, url text, created_at timestamptz not null default now(), read_at timestamptz
);
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_notifications enable row level security;
create policy "own push subscriptions" on public.push_subscriptions for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own notification prefs" on public.notification_preferences for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own notifications read" on public.user_notifications for select using (user_id=auth.uid());
create policy "notifications insert server actions" on public.user_notifications for insert with check (true);
alter publication supabase_realtime add table public.user_notifications;

create or replace function public.queue_rsvp_notification(p_party_id uuid, p_guest_name text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.user_notifications(user_id,kind,title,body,url)
  select distinct x.user_id,'rsvp','New RSVP',coalesce(nullif(trim(p_guest_name),''),'A guest') || ' responded to your dinner.', '/app/parties/'||p_party_id||'/guests'
  from (
    select owner_id as user_id from public.parties where id=p_party_id
    union select user_id from public.party_members where party_id=p_party_id and role in ('owner','co_owner')
  ) x;
end $$;

create or replace function public.queue_collaborator_invite_notification(p_email text, p_party_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_name text; begin
  select name into v_name from public.parties where id=p_party_id;
  insert into public.user_notifications(user_id,kind,title,body,url)
  select id,'collabInvite','Collaborator invitation','You were invited to collaborate on '||coalesce(v_name,'a dinner')||'.','/app/inbox'
  from public.profiles where lower(email)=lower(p_email);
end $$;

create or replace function public.queue_collaborator_accept_notification(p_party_id uuid, p_invited_by uuid, p_name text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.user_notifications(user_id,kind,title,body,url)
  select distinct x.user_id,'collabAccept','Collaborator accepted',coalesce(nullif(trim(p_name),''),'Your collaborator')||' accepted the invitation.','/app/parties/'||p_party_id||'/settings'
  from (select owner_id user_id from public.parties where id=p_party_id union select p_invited_by) x where x.user_id is not null;
end $$;

grant execute on function public.queue_rsvp_notification(uuid,text) to anon,authenticated;
grant execute on function public.queue_collaborator_invite_notification(text,uuid) to authenticated;
grant execute on function public.queue_collaborator_accept_notification(uuid,uuid,text) to authenticated;
