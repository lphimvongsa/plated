-- v5: account settings, notification delivery, invitation photo slots, archive state,
-- and supporting indexes/buckets.

alter table public.parties drop constraint if exists parties_status_check;
alter table public.parties
  add constraint parties_status_check
  check (status in ('planning', 'scheduled', 'completed', 'cancelled', 'archived'));

alter table public.parties
  add column if not exists invitation_photo_slots text[] not null default '{}';

alter table public.profiles
  add column if not exists notification_master boolean not null default false,
  add column if not exists notify_rsvps boolean not null default true,
  add column if not exists notify_collaborator_invites boolean not null default true,
  add column if not exists notify_collaborator_accepts boolean not null default true,
  add column if not exists retain_receipt_images boolean not null default true,
  add column if not exists profile_discoverable boolean not null default true;

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

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner" on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do update set public = true;

drop policy if exists "profile_media_public_read" on storage.objects;
create policy "profile_media_public_read" on storage.objects
  for select using (bucket_id = 'profile-media');

drop policy if exists "profile_media_owner_write" on storage.objects;
create policy "profile_media_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile_media_owner_update" on storage.objects;
create policy "profile_media_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile_media_owner_delete" on storage.objects;
create policy "profile_media_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- Seed invitation slot placement from existing photo order. New slots are independent
-- of photo count, so a host can place a single photo directly in the RSVP section.
update public.parties
set invitation_photo_slots = coalesce(nullif(invitation_photo_slots, '{}'),
  case cardinality(invitation_photo_urls)
    when 0 then '{}'::text[]
    when 1 then array['overview-left']::text[]
    when 2 then array['overview-left','overview-right']::text[]
    when 3 then array['overview-left','overview-right','menu-left']::text[]
    when 4 then array['overview-left','overview-right','menu-left','menu-right']::text[]
    else array['overview-left','overview-right','menu-left','menu-right','rsvp-bottom']::text[]
  end
)
where cardinality(invitation_photo_slots) = 0;


-- v5 invite payload includes explicit placement slots so each of the seven visual
-- slots is independent of how many photos were selected.
create or replace function public.build_invite_payload(
  p_party public.parties,
  p_guest public.guests,
  p_status text,
  p_kind text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_menu jsonb;
  v_allergy_options jsonb;
begin
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', mi.id,
      'course', mi.course,
      'title', coalesce(nullif(p_party.invitation_menu_overrides -> (mi.id::text) ->> 'title', ''), r.title),
      'description', case
        when (p_party.invitation_menu_overrides -> (mi.id::text)) ? 'description'
          then p_party.invitation_menu_overrides -> (mi.id::text) ->> 'description'
        else r.description
      end
    ) order by mi.sort_order
  ), '[]'::jsonb)
  into v_menu
  from public.menu_items mi
  join public.recipes r on r.id = mi.recipe_id
  where mi.party_id = p_party.id and mi.guest_visible = true;

  select coalesce(jsonb_agg(option_obj order by sort_label), '[]'::jsonb)
  into v_allergy_options
  from (
    select distinct
      jsonb_build_object(
        'kind', 'ingredient',
        'value', coalesce(nullif(i.canonical_key, ''), lower(i.name)),
        'label', i.name,
        'allergens', coalesce(to_jsonb(i.allergen_tags), '[]'::jsonb)
      ) as option_obj,
      lower(i.name) as sort_label
    from public.menu_items mi
    join public.ingredients i on i.recipe_id = mi.recipe_id
    where mi.party_id = p_party.id and mi.guest_visible = true

    union

    select distinct
      jsonb_build_object(
        'kind', 'allergen',
        'value', a.tag,
        'label', case a.tag
          when 'milk' then 'Milk / Dairy'
          when 'egg' then 'Egg'
          when 'fish' then 'Fish'
          when 'shellfish' then 'Crustacean Shellfish'
          when 'tree nuts' then 'Tree Nuts'
          when 'peanut' then 'Peanut'
          when 'wheat' then 'Wheat'
          when 'soy' then 'Soy'
          when 'sesame' then 'Sesame'
          when 'gluten' then 'Gluten'
          else initcap(a.tag)
        end,
        'allergens', jsonb_build_array(a.tag)
      ) as option_obj,
      '0-' || a.tag as sort_label
    from public.menu_items mi
    join public.ingredients i on i.recipe_id = mi.recipe_id
    cross join lateral unnest(i.allergen_tags) as a(tag)
    where mi.party_id = p_party.id and mi.guest_visible = true
  ) options;

  return jsonb_build_object(
    'status', p_status,
    'kind', p_kind,
    'party', jsonb_build_object(
      'id', p_party.id,
      'name', p_party.name,
      'description', p_party.description,
      'starts_at', p_party.starts_at,
      'ends_at', public.party_end_at(p_party),
      'location', p_party.location,
      'timezone', p_party.timezone,
      'theme', p_party.theme,
      'color_scheme', p_party.color_scheme,
      'cuisine', p_party.cuisine,
      'service_style', p_party.service_style,
      'dress_code', p_party.dress_code,
      'guest_contribution_notes', p_party.guest_contribution_notes,
      'hero_image', p_party.hero_image,
      'cover_position', p_party.cover_position,
      'cover_crop', p_party.cover_crop,
      'invitation_headline', p_party.invitation_headline,
      'invitation_message', p_party.invitation_message,
      'invitation_signoff', p_party.invitation_signoff,
      'invitation_rsvp_label', p_party.invitation_rsvp_label,
      'invitation_photo_urls', p_party.invitation_photo_urls,
      'invitation_photo_positions', p_party.invitation_photo_positions,
      'invitation_photo_crops', p_party.invitation_photo_crops,
      'invitation_photo_slots', p_party.invitation_photo_slots
    ),
    'guest', case
      when p_guest is null then jsonb_build_object(
        'id', '',
        'name', '',
        'email', null,
        'rsvp_status', 'no_response',
        'allergies', null,
        'dietary_preference', null,
        'plus_one_count', 0,
        'notes', null
      )
      else jsonb_build_object(
        'id', p_guest.id,
        'name', p_guest.name,
        'email', p_guest.email,
        'rsvp_status', p_guest.rsvp_status,
        'allergies', p_guest.allergies,
        'dietary_preference', p_guest.dietary_preference,
        'plus_one_count', p_guest.plus_one_count,
        'notes', p_guest.notes
      )
    end,
    'menu', v_menu,
    'allergy_options', v_allergy_options
  );
end;
$$;
;
