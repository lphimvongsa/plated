-- Collaborator invitations, co-owner role, and helper read-only access.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

alter table public.party_members drop constraint if exists party_members_role_check;
alter table public.party_members
  add constraint party_members_role_check
  check (role in ('owner', 'co_owner', 'manager', 'editor', 'helper'));

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_edit_party(p_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.parties p
      where p.id = p_party_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.party_members pm
      where pm.party_id = p_party_id
        and pm.user_id = auth.uid()
        and pm.role in ('owner', 'co_owner', 'manager', 'editor')
    );
$$;

create or replace function public.can_manage_party(p_party_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.parties p
      where p.id = p_party_id and p.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.party_members pm
      where pm.party_id = p_party_id
        and pm.user_id = auth.uid()
        and pm.role in ('owner', 'co_owner')
    );
$$;

create or replace function public.can_write_recipe(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.recipes r
    where r.id = p_recipe_id
      and (
        r.owner_id = auth.uid()
        or (r.party_id is not null and public.can_edit_party(r.party_id))
      )
  );
$$;

grant execute on function public.can_edit_party(uuid) to authenticated;
grant execute on function public.can_manage_party(uuid) to authenticated;
grant execute on function public.can_write_recipe(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Timeline lane for accepted collaborators
-- ---------------------------------------------------------------------------

create or replace function public.ensure_party_helper_for_user(p_party_id uuid, p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_base text;
  v_name text;
  v_n int := 2;
begin
  select id into v_id
  from public.party_helpers
  where party_id = p_party_id and user_id = p_user_id;
  if found then
    return v_id;
  end if;

  select coalesce(
    nullif(trim(p.name), ''),
    nullif(split_part(coalesce(p.email, ''), '@', 1), ''),
    'Helper'
  )
  into v_base
  from public.profiles p
  where p.id = p_user_id;

  v_base := coalesce(v_base, 'Helper');

  update public.party_helpers
  set user_id = p_user_id
  where party_id = p_party_id
    and user_id is null
    and lower(name) = lower(v_base)
  returning id into v_id;
  if found then
    return v_id;
  end if;

  v_name := v_base;
  while exists (
    select 1
    from public.party_helpers
    where party_id = p_party_id and lower(name) = lower(v_name)
  ) loop
    v_name := v_base || ' (' || v_n || ')';
    v_n := v_n + 1;
  end loop;

  insert into public.party_helpers (party_id, user_id, name, color, sort_order)
  values (
    p_party_id,
    p_user_id,
    v_name,
    public.next_helper_color(p_party_id),
    coalesce((select max(sort_order) + 1 from public.party_helpers where party_id = p_party_id), 0)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Collaborator invites
-- ---------------------------------------------------------------------------

create table public.party_collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  email text not null,
  role text not null check (role in ('co_owner', 'helper')),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz
);

create index party_collaborator_invites_party_id_idx
  on public.party_collaborator_invites (party_id);
create index party_collaborator_invites_token_idx
  on public.party_collaborator_invites (token);
create index party_collaborator_invites_email_idx
  on public.party_collaborator_invites (lower(email));
create unique index party_collaborator_invites_pending_email_idx
  on public.party_collaborator_invites (party_id, lower(email))
  where accepted_at is null and revoked_at is null;

alter table public.party_collaborator_invites enable row level security;

create policy "party_collaborator_invites_select" on public.party_collaborator_invites
  for select to authenticated
  using (
    public.is_party_member(party_id)
    or lower(email) = lower((select pr.email from public.profiles pr where pr.id = auth.uid()))
  );

create policy "party_collaborator_invites_insert" on public.party_collaborator_invites
  for insert to authenticated
  with check (public.can_manage_party(party_id) and invited_by = auth.uid());

create policy "party_collaborator_invites_update" on public.party_collaborator_invites
  for update to authenticated
  using (public.can_manage_party(party_id))
  with check (public.can_manage_party(party_id));

create policy "party_collaborator_invites_delete" on public.party_collaborator_invites
  for delete to authenticated
  using (public.can_manage_party(party_id));

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select lower(coalesce(
    (select u.email from auth.users u where u.id = auth.uid()),
    (select p.email from public.profiles p where p.id = auth.uid())
  ));
$$;

grant execute on function public.current_user_email() to authenticated;

create or replace function public.get_collaborator_invite_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.party_collaborator_invites;
  v_party public.parties;
  v_inviter_name text;
  v_status text;
begin
  select * into v_invite from public.party_collaborator_invites where token = p_token;
  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  if v_invite.revoked_at is not null then
    v_status := 'revoked';
  elsif v_invite.accepted_at is not null then
    v_status := 'accepted';
  else
    v_status := 'pending';
  end if;

  select * into v_party from public.parties where id = v_invite.party_id;
  if not found then
    return jsonb_build_object('status', 'revoked');
  end if;

  select coalesce(nullif(trim(p.name), ''), split_part(coalesce(p.email, ''), '@', 1), 'A host')
  into v_inviter_name
  from public.profiles p
  where p.id = v_invite.invited_by;

  return jsonb_build_object(
    'status', v_status,
    'email', v_invite.email,
    'role', v_invite.role,
    'party', jsonb_build_object(
      'id', v_party.id,
      'name', v_party.name,
      'starts_at', v_party.starts_at,
      'timezone', v_party.timezone,
      'location', v_party.location,
      'hero_image', v_party.hero_image
    ),
    'inviter_name', coalesce(v_inviter_name, 'A host')
  );
end;
$$;

create or replace function public.accept_collaborator_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.party_collaborator_invites;
  v_email text;
  v_member_role text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'unauthenticated', 'error', 'Sign in to accept this invite.');
  end if;

  select * into v_invite from public.party_collaborator_invites where token = p_token for update;
  if not found then
    return jsonb_build_object('ok', false, 'status', 'missing', 'error', 'This invite is no longer available.');
  end if;

  if v_invite.revoked_at is not null then
    return jsonb_build_object('ok', false, 'status', 'revoked', 'error', 'This invite was cancelled.');
  end if;

  v_email := public.current_user_email();
  if v_email is null or v_email <> lower(v_invite.email) then
    return jsonb_build_object(
      'ok', false,
      'status', 'email_mismatch',
      'error', 'Sign in with ' || v_invite.email || ' to accept this invite.'
    );
  end if;

  select role into v_member_role
  from public.party_members
  where party_id = v_invite.party_id and user_id = auth.uid();

  if v_member_role is null then
    insert into public.party_members (party_id, user_id, role)
    values (v_invite.party_id, auth.uid(), v_invite.role);
  elsif v_member_role = 'helper' and v_invite.role = 'co_owner' then
    update public.party_members
    set role = 'co_owner'
    where party_id = v_invite.party_id and user_id = auth.uid();
  end if;

  perform public.ensure_party_helper_for_user(v_invite.party_id, auth.uid());

  if v_invite.accepted_at is null then
    update public.party_collaborator_invites
    set accepted_at = now(), accepted_user_id = auth.uid()
    where id = v_invite.id;
  end if;

  return jsonb_build_object('ok', true, 'status', 'accepted', 'party_id', v_invite.party_id);
end;
$$;

grant execute on function public.get_collaborator_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_collaborator_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Protect the original owner membership row
-- ---------------------------------------------------------------------------

create or replace function public.trg_party_members_protect_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    raise exception 'The party owner cannot be removed.';
  end if;
  if tg_op = 'UPDATE' and old.role = 'owner' and new.role is distinct from old.role then
    raise exception 'The party owner role cannot be changed.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists party_members_protect_owner on public.party_members;
create trigger party_members_protect_owner
  before update or delete on public.party_members
  for each row execute function public.trg_party_members_protect_owner();

-- ---------------------------------------------------------------------------
-- Party + membership RLS
-- ---------------------------------------------------------------------------

create policy "parties_select_pending_collaborator" on public.parties
  for select to authenticated
  using (
    exists (
      select 1
      from public.party_collaborator_invites i
      where i.party_id = id
        and i.accepted_at is null
        and i.revoked_at is null
        and lower(i.email) = public.current_user_email()
    )
  );
drop policy if exists "parties_update_member" on public.parties;
create policy "parties_update_member" on public.parties
  for update to authenticated
  using (owner_id = auth.uid() or public.can_edit_party(id))
  with check (owner_id = auth.uid() or public.can_edit_party(id));

drop policy if exists "parties_delete_owner" on public.parties;
create policy "parties_delete_owner" on public.parties
  for delete to authenticated
  using (owner_id = auth.uid() or public.can_manage_party(id));

drop policy if exists "party_members_insert" on public.party_members;
create policy "party_members_insert" on public.party_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.can_manage_party(party_id)
  );

drop policy if exists "party_members_update" on public.party_members;
create policy "party_members_update" on public.party_members
  for update to authenticated
  using (public.can_manage_party(party_id))
  with check (public.can_manage_party(party_id));

drop policy if exists "party_members_delete" on public.party_members;
create policy "party_members_delete" on public.party_members
  for delete to authenticated
  using (
    (user_id = auth.uid() and role <> 'owner')
    or public.can_manage_party(party_id)
  );

-- ---------------------------------------------------------------------------
-- Party-scoped writes: members can read, editors can change
-- ---------------------------------------------------------------------------

drop policy if exists "party_helpers_all" on public.party_helpers;
create policy "party_helpers_select" on public.party_helpers
  for select to authenticated using (public.is_party_member(party_id));
create policy "party_helpers_write" on public.party_helpers
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "menu_items_all" on public.menu_items;
create policy "menu_items_select" on public.menu_items
  for select to authenticated using (public.is_party_member(party_id));
create policy "menu_items_write" on public.menu_items
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "guests_all" on public.guests;
create policy "guests_select" on public.guests
  for select to authenticated using (public.is_party_member(party_id));
create policy "guests_write" on public.guests
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "invites_all" on public.invites;
create policy "invites_select" on public.invites
  for select to authenticated using (public.is_party_member(party_id));
create policy "invites_write" on public.invites
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "grocery_items_all" on public.grocery_items;
create policy "grocery_items_select" on public.grocery_items
  for select to authenticated using (public.is_party_member(party_id));
create policy "grocery_items_write" on public.grocery_items
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "tasks_all" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated using (public.is_party_member(party_id));
create policy "tasks_write" on public.tasks
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "invite_deliveries_all" on public.invite_deliveries;
create policy "invite_deliveries_select" on public.invite_deliveries
  for select to authenticated using (public.is_party_member(party_id));
create policy "invite_deliveries_write" on public.invite_deliveries
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "receipts_party_members" on public.receipts;
create policy "receipts_select" on public.receipts
  for select to authenticated using (public.is_party_member(party_id));
create policy "receipts_write" on public.receipts
  for all to authenticated
  using (public.can_edit_party(party_id))
  with check (public.can_edit_party(party_id));

drop policy if exists "receipt_items_party_members" on public.receipt_items;
create policy "receipt_items_select" on public.receipt_items
  for select to authenticated
  using (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and public.is_party_member(r.party_id)
  ));
create policy "receipt_items_write" on public.receipt_items
  for all to authenticated
  using (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and public.can_edit_party(r.party_id)
  ))
  with check (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and public.can_edit_party(r.party_id)
  ));

-- ---------------------------------------------------------------------------
-- Recipes / ingredients / steps: cookbook owners keep write; helpers cannot
-- mutate party recipes.
-- ---------------------------------------------------------------------------

drop policy if exists "recipes_insert" on public.recipes;
create policy "recipes_insert" on public.recipes
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (party_id is null or public.can_edit_party(party_id))
  );

drop policy if exists "recipes_update" on public.recipes;
create policy "recipes_update" on public.recipes
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (party_id is not null and public.can_edit_party(party_id))
  )
  with check (
    owner_id = auth.uid()
    or (party_id is not null and public.can_edit_party(party_id))
  );

drop policy if exists "ingredients_all" on public.ingredients;
create policy "ingredients_select" on public.ingredients
  for select to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          r.owner_id = auth.uid()
          or (r.party_id is not null and public.is_party_member(r.party_id))
        )
    )
  );
create policy "ingredients_write" on public.ingredients
  for all to authenticated
  using (public.can_write_recipe(recipe_id))
  with check (public.can_write_recipe(recipe_id));

drop policy if exists "recipe_steps_all" on public.recipe_steps;
create policy "recipe_steps_select" on public.recipe_steps
  for select to authenticated
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (
          r.owner_id = auth.uid()
          or (r.party_id is not null and public.is_party_member(r.party_id))
        )
    )
  );
create policy "recipe_steps_write" on public.recipe_steps
  for all to authenticated
  using (public.can_write_recipe(recipe_id))
  with check (public.can_write_recipe(recipe_id));

-- ---------------------------------------------------------------------------
-- Storage + refresh claims
-- ---------------------------------------------------------------------------

drop policy if exists "party_media_member_insert" on storage.objects;
create policy "party_media_member_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'party-media'
    and public.can_edit_party(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "party_media_member_update" on storage.objects;
create policy "party_media_member_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'party-media'
    and public.can_edit_party(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'party-media'
    and public.can_edit_party(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "party_media_member_delete" on storage.objects;
create policy "party_media_member_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'party-media'
    and public.can_edit_party(((storage.foldername(name))[1])::uuid)
  );

create or replace function public.claim_party_refresh(p_party_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid := gen_random_uuid();
begin
  if not public.can_edit_party(p_party_id) then
    raise exception 'not allowed';
  end if;

  if p_kind = 'shopping' then
    update public.parties
    set shopping_refresh_token = v_token, shopping_refresh_started_at = now()
    where id = p_party_id
      and (shopping_refresh_token is null or shopping_refresh_started_at < now() - interval '10 minutes');
  elsif p_kind = 'timeline' then
    update public.parties
    set timeline_refresh_token = v_token, timeline_refresh_started_at = now()
    where id = p_party_id
      and (timeline_refresh_token is null or timeline_refresh_started_at < now() - interval '10 minutes');
  else
    raise exception 'invalid refresh kind';
  end if;

  if not found then return null; end if;
  return v_token;
end;
$$;

create or replace function public.finish_party_refresh(
  p_party_id uuid,
  p_kind text,
  p_token uuid,
  p_success boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_edit_party(p_party_id) then
    raise exception 'not allowed';
  end if;

  if p_kind = 'shopping' then
    update public.parties
    set shopping_refresh_token = null,
        shopping_refresh_started_at = null,
        shopping_dirty = case when p_success then false else shopping_dirty end
    where id = p_party_id and shopping_refresh_token = p_token;
  elsif p_kind = 'timeline' then
    update public.parties
    set timeline_refresh_token = null,
        timeline_refresh_started_at = null,
        timeline_dirty = case when p_success then false else timeline_dirty end
    where id = p_party_id and timeline_refresh_token = p_token;
  else
    raise exception 'invalid refresh kind';
  end if;

  return found;
end;
$$;
