-- plated. initial schema: parties, invites, RLS, invite RPCs, demo seed helper

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  avatar_url text,
  preferred_measurement text not null default 'US' check (preferred_measurement in ('US', 'Metric')),
  timezone text not null default 'America/New_York',
  cooking_skill_level text not null default 'Intermediate',
  specialties text[] not null default '{}',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  timezone text not null default 'America/New_York',
  theme text,
  cuisine text,
  service_style text,
  dress_code text,
  guest_contribution_notes text,
  hero_image text,
  planning_guest_count int not null default 8,
  status text not null default 'planning'
    check (status in ('planning', 'scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.party_members (
  party_id uuid not null references public.parties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'editor'
    check (role in ('owner', 'manager', 'editor', 'helper')),
  skill_level text,
  specialties text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (party_id, user_id)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  party_id uuid references public.parties (id) on delete set null,
  title text not null,
  description text,
  image_url text,
  source_url text,
  servings int not null default 4,
  prep_minutes int,
  cook_minutes int,
  course text,
  cuisine text,
  tags text[] not null default '{}',
  instructions text,
  equipment text[] not null default '{}',
  notes text,
  allergy_notes text,
  estimated_cost numeric(10, 2),
  status text not null default 'Ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  preparation_note text,
  category text,
  allergen_tags text[] not null default '{}',
  pantry_flag boolean not null default false,
  sort_order int not null default 0
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  course text,
  sort_order int not null default 0,
  serving_override int,
  guest_visible boolean not null default true,
  unique (party_id, recipe_id)
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  rsvp_status text not null default 'no_response'
    check (rsvp_status in ('attending', 'maybe', 'not_attending', 'no_response')),
  allergies text,
  dietary_preference text,
  plus_one_count int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  guest_id uuid not null unique references public.guests (id) on delete cascade,
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_opened_at timestamptz
);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  ingredient_name text not null,
  required_quantity text,
  unit text,
  category text,
  already_owned boolean not null default false,
  purchased boolean not null default false,
  estimated_cost numeric(10, 2),
  actual_cost numeric(10, 2),
  sort_order int not null default 0
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz,
  due_at timestamptz,
  duration_minutes int,
  status text not null default 'todo'
    check (status in ('todo', 'done', 'skipped')),
  difficulty text,
  required_specialty text,
  assigned_name text,
  locked boolean not null default false,
  dependency_ids uuid[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

create index parties_owner_id_idx on public.parties (owner_id);
create index party_members_user_id_idx on public.party_members (user_id);
create index guests_party_id_idx on public.guests (party_id);
create index invites_token_idx on public.invites (token);
create index menu_items_party_id_idx on public.menu_items (party_id);
create index grocery_items_party_id_idx on public.grocery_items (party_id);
create index tasks_party_id_idx on public.tasks (party_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger parties_updated_at before update on public.parties
  for each row execute function public.set_updated_at();
create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();
create trigger guests_updated_at before update on public.guests
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_party_member(p_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.party_members pm
    where pm.party_id = p_party_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.party_end_at(p public.parties)
returns timestamptz
language sql
immutable
as $$
  select coalesce(p.ends_at, p.starts_at + interval '3 hours');
$$;

create or replace function public.invite_status(p_invite public.invites, p_party public.parties)
returns text
language sql
stable
as $$
  select case
    when p_invite.revoked_at is not null then 'revoked'
    when now() > public.party_end_at(p_party) + interval '7 days' then 'soft_expired'
    else 'active'
  end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.menu_items enable row level security;
alter table public.guests enable row level security;
alter table public.invites enable row level security;
alter table public.grocery_items enable row level security;
alter table public.tasks enable row level security;
alter table public.user_pantry_items enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "parties_select_member" on public.parties
  for select to authenticated using (public.is_party_member(id));
create policy "parties_insert_own" on public.parties
  for insert to authenticated with check (owner_id = auth.uid());
create policy "parties_update_member" on public.parties
  for update to authenticated using (public.is_party_member(id)) with check (public.is_party_member(id));
create policy "parties_delete_owner" on public.parties
  for delete to authenticated using (owner_id = auth.uid());

create policy "party_members_select" on public.party_members
  for select to authenticated using (public.is_party_member(party_id) or user_id = auth.uid());
create policy "party_members_insert" on public.party_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.parties p
      where p.id = party_id and p.owner_id = auth.uid()
    )
  );
create policy "party_members_delete" on public.party_members
  for delete to authenticated using (
    exists (
      select 1 from public.parties p
      where p.id = party_id and p.owner_id = auth.uid()
    )
  );

create policy "recipes_select" on public.recipes
  for select to authenticated using (
    owner_id = auth.uid()
    or (party_id is not null and public.is_party_member(party_id))
  );
create policy "recipes_insert" on public.recipes
  for insert to authenticated with check (
    owner_id = auth.uid()
    and (party_id is null or public.is_party_member(party_id))
  );
create policy "recipes_update" on public.recipes
  for update to authenticated using (
    owner_id = auth.uid()
    or (party_id is not null and public.is_party_member(party_id))
  );
create policy "recipes_delete" on public.recipes
  for delete to authenticated using (owner_id = auth.uid());

create policy "ingredients_all" on public.ingredients
  for all to authenticated using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          r.owner_id = auth.uid()
          or (r.party_id is not null and public.is_party_member(r.party_id))
        )
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          r.owner_id = auth.uid()
          or (r.party_id is not null and public.is_party_member(r.party_id))
        )
    )
  );

create policy "menu_items_all" on public.menu_items
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

create policy "guests_all" on public.guests
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

create policy "invites_all" on public.invites
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

create policy "grocery_items_all" on public.grocery_items
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

create policy "tasks_all" on public.tasks
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

create policy "pantry_all" on public.user_pantry_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Public invite RPCs (anon + authenticated)
-- ---------------------------------------------------------------------------

create or replace function public.get_invite_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
  v_party public.parties;
  v_guest public.guests;
  v_status text;
  v_menu jsonb;
begin
  select * into v_invite from public.invites where token = p_token;
  if not found then
    return jsonb_build_object('status', 'revoked');
  end if;

  select * into v_party from public.parties where id = v_invite.party_id;
  if not found then
    return jsonb_build_object('status', 'revoked');
  end if;

  select * into v_guest from public.guests where id = v_invite.guest_id;
  v_status := public.invite_status(v_invite, v_party);

  if v_status = 'revoked' then
    return jsonb_build_object('status', 'revoked');
  end if;

  update public.invites
  set last_opened_at = now()
  where id = v_invite.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'course', mi.course,
      'title', r.title,
      'description', r.description
    ) order by mi.sort_order
  ), '[]'::jsonb)
  into v_menu
  from public.menu_items mi
  join public.recipes r on r.id = mi.recipe_id
  where mi.party_id = v_party.id
    and mi.guest_visible = true;

  return jsonb_build_object(
    'status', v_status,
    'party', jsonb_build_object(
      'id', v_party.id,
      'name', v_party.name,
      'description', v_party.description,
      'starts_at', v_party.starts_at,
      'ends_at', public.party_end_at(v_party),
      'location', v_party.location,
      'timezone', v_party.timezone,
      'theme', v_party.theme,
      'cuisine', v_party.cuisine,
      'service_style', v_party.service_style,
      'dress_code', v_party.dress_code,
      'guest_contribution_notes', v_party.guest_contribution_notes,
      'hero_image', v_party.hero_image
    ),
    'guest', jsonb_build_object(
      'id', v_guest.id,
      'name', v_guest.name,
      'email', v_guest.email,
      'rsvp_status', v_guest.rsvp_status,
      'allergies', v_guest.allergies,
      'dietary_preference', v_guest.dietary_preference,
      'plus_one_count', v_guest.plus_one_count,
      'notes', v_guest.notes
    ),
    'menu', v_menu
  );
end;
$$;

create or replace function public.rsvp_via_invite_token(
  p_token text,
  p_name text,
  p_email text,
  p_rsvp_status text,
  p_allergies text default null,
  p_dietary_preference text default null,
  p_plus_one_count int default 0,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites;
  v_party public.parties;
  v_status text;
begin
  if p_rsvp_status not in ('attending', 'maybe', 'not_attending') then
    raise exception 'invalid rsvp_status';
  end if;

  select * into v_invite from public.invites where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_party from public.parties where id = v_invite.party_id;
  v_status := public.invite_status(v_invite, v_party);

  if v_status <> 'active' then
    return jsonb_build_object('ok', false, 'error', v_status);
  end if;

  update public.guests
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    email = coalesce(nullif(trim(p_email), ''), email),
    rsvp_status = p_rsvp_status,
    allergies = p_allergies,
    dietary_preference = p_dietary_preference,
    plus_one_count = greatest(coalesce(p_plus_one_count, 0), 0),
    notes = p_notes,
    updated_at = now()
  where id = v_invite.guest_id;

  return public.get_invite_by_token(p_token) || jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.get_invite_by_token(text) to anon, authenticated;
grant execute on function public.rsvp_via_invite_token(text, text, text, text, text, text, int, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cleanup: hard-delete parties 30 days after end
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_expired_parties()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count int;
begin
  with doomed as (
    select id
    from public.parties p
    where now() > public.party_end_at(p) + interval '30 days'
  ),
  del as (
    delete from public.parties
    where id in (select id from doomed)
    returning id
  )
  select count(*)::int into deleted_count from del;

  return deleted_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Demo party seeder (called after onboarding for first-time users)
-- ---------------------------------------------------------------------------

create or replace function public.seed_demo_party_for_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party_id uuid;
  r_tart uuid;
  r_chicken uuid;
  r_greens uuid;
  r_cake uuid;
  v_guest_id uuid;
  v_starts timestamptz := timestamptz '2026-08-22 18:30:00-04';
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not allowed';
  end if;

  if exists (select 1 from public.party_members where user_id = p_user_id) then
    select party_id into v_party_id
    from public.party_members
    where user_id = p_user_id
    order by created_at
    limit 1;
    return v_party_id;
  end if;

  insert into public.parties (
    owner_id, name, description, starts_at, ends_at, location, timezone,
    theme, cuisine, service_style, dress_code, guest_contribution_notes,
    hero_image, planning_guest_count, status
  ) values (
    p_user_id,
    'The Last Light Supper',
    'A late-summer dinner in the garden, served family style as the sun goes down.',
    v_starts,
    v_starts + interval '3 hours',
    'Lukas'' backyard Â· Providence, RI',
    'America/New_York',
    'Late-summer garden party',
    'Mediterranean-inspired',
    'Family style',
    'Garden color',
    'A bottle you love â€” wine, sparkling water, or something surprising.',
    '/photos/party-01.webp',
    12,
    'scheduled'
  )
  returning id into v_party_id;

  insert into public.party_members (party_id, user_id, role)
  values (v_party_id, p_user_id, 'owner');

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Heirloom tomato tart', 'Welcome bite', 12, 25, 35, '/photos/party-04.webp', 'Gluten, dairy', 24.8, 'Ready', 'crÃ¨me fraÃ®che Â· basil Â· flaky pastry')
  returning id into r_tart;

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Charred lemon chicken', 'Main', 12, 30, 45, '/photos/party-01.webp', null, 48.2, 'Ready', 'oregano Â· garlic Â· pan juices')
  returning id into r_chicken;

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Herby greens & tahini', 'Side', 12, 20, 10, '/photos/party-04.webp', 'Sesame', 19.4, 'Review allergy', 'charred lemon Â· toasted seeds')
  returning id into r_greens;

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Citrus olive oil cake', 'Dessert', 12, 20, 50, '/photos/party-08.webp', 'Gluten, eggs', 17.5, 'Ready', 'berries Â· whipped cream')
  returning id into r_cake;

  insert into public.menu_items (party_id, recipe_id, course, sort_order, guest_visible) values
    (v_party_id, r_tart, 'Welcome bite', 1, true),
    (v_party_id, r_chicken, 'Main', 2, true),
    (v_party_id, r_greens, 'Side', 3, true),
    (v_party_id, r_cake, 'Dessert', 4, true);

  insert into public.grocery_items (party_id, ingredient_name, required_quantity, category, already_owned, estimated_cost, sort_order) values
    (v_party_id, 'Heirloom tomatoes', '8 medium', 'Produce', false, 18, 1),
    (v_party_id, 'Lemons', '9', 'Produce', false, 7.2, 2),
    (v_party_id, 'Flat-leaf parsley', '3 bunches', 'Produce', false, 8.1, 3),
    (v_party_id, 'Garlic', '2 heads', 'Produce', true, 2.4, 4),
    (v_party_id, 'Bone-in chicken thighs', '7 lb', 'Meat & seafood', false, 34.3, 5),
    (v_party_id, 'Butter', '1.5 lb', 'Dairy & eggs', false, 9.8, 6),
    (v_party_id, 'Eggs', '1 dozen', 'Dairy & eggs', true, 6.4, 7),
    (v_party_id, 'CrÃ¨me fraÃ®che', '16 oz', 'Dairy & eggs', false, 8.9, 8),
    (v_party_id, 'All-purpose flour', '5 cups', 'Pantry & bakery', true, 4.8, 9),
    (v_party_id, 'Tahini', '1 jar', 'Pantry & bakery', false, 7.5, 10),
    (v_party_id, 'Extra-virgin olive oil', '3 cups', 'Pantry & bakery', true, 18, 11);

  insert into public.tasks (party_id, title, description, start_at, difficulty, assigned_name, status, locked, sort_order) values
    (v_party_id, 'Make tart dough', 'Rest overnight in refrigerator', v_starts - interval '2 days' + interval '1 hour', 'Intermediate', 'Lukas', 'done', true, 1),
    (v_party_id, 'Marinate chicken', 'Lemon, garlic, oregano â€” 20 min active', v_starts - interval '1 day', 'Beginner', 'Maya', 'done', false, 2),
    (v_party_id, 'Bake olive oil cake', 'Must cool before citrus glaze', v_starts - interval '8 hours 30 minutes', 'Intermediate', 'Lukas', 'todo', true, 3),
    (v_party_id, 'Set table & chill wine', 'Outdoor table, flowers, candles', v_starts - interval '5 hours', 'Beginner', 'Ari', 'todo', false, 4),
    (v_party_id, 'Blind-bake tart shell', 'Oven 375Â°F Â· Dependency: chilled dough', v_starts - interval '3 hours 30 minutes', 'Intermediate', 'Maya', 'todo', false, 5),
    (v_party_id, 'Prep greens and tahini', 'Hold dressing separately', v_starts - interval '2 hours 20 minutes', 'Beginner', 'Ari', 'todo', false, 6),
    (v_party_id, 'Grill chicken', 'Two batches Â· rest 15 min', v_starts - interval '1 hour 20 minutes', 'Advanced', 'Lukas', 'todo', true, 7),
    (v_party_id, 'Finish tart & plate welcome bite', 'Keep main grill zone clear', v_starts - interval '25 minutes', 'Intermediate', 'Maya', 'todo', false, 8);

  insert into public.guests (party_id, name, email, rsvp_status, allergies, plus_one_count) values
    (v_party_id, 'Maya Johnson', 'maya@example.com', 'attending', 'None', 0)
  returning id into v_guest_id;
  insert into public.invites (party_id, guest_id, token)
  values (v_party_id, v_guest_id, 'demo-maya-' || substr(replace(v_party_id::text, '-', ''), 1, 12));

  insert into public.guests (party_id, name, email, rsvp_status, allergies, plus_one_count) values
    (v_party_id, 'Ari Shah', 'ari@example.com', 'attending', 'Sesame', 0)
  returning id into v_guest_id;
  insert into public.invites (party_id, guest_id) values (v_party_id, v_guest_id);

  insert into public.guests (party_id, name, email, rsvp_status, allergies, plus_one_count) values
    (v_party_id, 'Eli Brooks', 'eli@example.com', 'maybe', 'None', 1)
  returning id into v_guest_id;
  insert into public.invites (party_id, guest_id) values (v_party_id, v_guest_id);

  insert into public.guests (party_id, name, email, rsvp_status, allergies, plus_one_count) values
    (v_party_id, 'Nina Chen', 'nina@example.com', 'attending', 'Gluten', 0)
  returning id into v_guest_id;
  insert into public.invites (party_id, guest_id) values (v_party_id, v_guest_id);

  insert into public.guests (party_id, name, email, rsvp_status, allergies, plus_one_count) values
    (v_party_id, 'Sam Rivera', 'sam@example.com', 'no_response', null, 0)
  returning id into v_guest_id;
  insert into public.invites (party_id, guest_id) values (v_party_id, v_guest_id);

  insert into public.guests (party_id, name, email, rsvp_status, allergies, plus_one_count) values
    (v_party_id, 'Jordan Lee', 'jordan@example.com', 'not_attending', 'Shellfish', 0)
  returning id into v_guest_id;
  insert into public.invites (party_id, guest_id) values (v_party_id, v_guest_id);

  return v_party_id;
end;
$$;

grant execute on function public.seed_demo_party_for_user(uuid) to authenticated;
grant execute on function public.cleanup_expired_parties() to authenticated;

