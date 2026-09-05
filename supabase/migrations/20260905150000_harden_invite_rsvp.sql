-- Harden public invite RPCs used by /invite/[token] RSVP.
-- 1) Guard allergy-option aggregation against null allergen_tags.
-- 2) Prefer invitation_photo_slots when present, keep positions for older rows.
-- 3) Re-grant execute for anon guests opening invitation links.

alter table public.parties
  add column if not exists invitation_photo_slots text[] not null default '{}';

alter table public.guests
  add column if not exists source text not null default 'host';

alter table public.guests
  drop constraint if exists guests_source_check;

alter table public.guests
  add constraint guests_source_check check (source in ('host', 'share'));

alter table public.parties
  add column if not exists share_token text;

update public.parties
set share_token = encode(extensions.gen_random_bytes(24), 'hex')
where share_token is null;

alter table public.parties
  alter column share_token set default encode(extensions.gen_random_bytes(24), 'hex');

alter table public.parties
  alter column share_token set not null;

create unique index if not exists parties_share_token_idx on public.parties (share_token);

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

  begin
    select coalesce(jsonb_agg(option_obj order by sort_label), '[]'::jsonb)
    into v_allergy_options
    from (
      select distinct
        jsonb_build_object(
          'kind', 'ingredient',
          'value', coalesce(nullif(i.canonical_key, ''), lower(coalesce(i.name, ''))),
          'label', coalesce(i.name, ''),
          'allergens', coalesce(to_jsonb(i.allergen_tags), '[]'::jsonb)
        ) as option_obj,
        lower(coalesce(i.name, '')) as sort_label
      from public.menu_items mi
      join public.ingredients i on i.recipe_id = mi.recipe_id
      where mi.party_id = p_party.id and mi.guest_visible = true
        and coalesce(i.name, '') <> ''

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
      cross join lateral unnest(coalesce(i.allergen_tags, '{}'::text[])) as a(tag)
      where mi.party_id = p_party.id and mi.guest_visible = true
        and a.tag is not null
        and a.tag <> ''
    ) options;
  exception when others then
    v_allergy_options := '[]'::jsonb;
  end;

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
      'timezone', coalesce(nullif(p_party.timezone, ''), 'America/New_York'),
      'theme', p_party.theme,
      'color_scheme', coalesce(nullif(p_party.color_scheme, ''), 'tomato-cream'),
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
      'invitation_photo_urls', coalesce(p_party.invitation_photo_urls, '{}'::text[]),
      'invitation_photo_positions', coalesce(p_party.invitation_photo_positions, '{}'::text[]),
      'invitation_photo_crops', coalesce(p_party.invitation_photo_crops, '[]'::jsonb),
      'invitation_photo_slots', coalesce(p_party.invitation_photo_slots, '{}'::text[])
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
    'allergy_options', coalesce(v_allergy_options, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.build_invite_payload(public.parties, public.guests, text, text) from public, anon, authenticated;

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
begin
  if p_token is null or length(trim(p_token)) = 0 then
    return jsonb_build_object('status', 'revoked');
  end if;

  select * into v_invite from public.invites where token = p_token;
  if found then
    select * into v_party from public.parties where id = v_invite.party_id;
    if not found then return jsonb_build_object('status', 'revoked'); end if;

    select * into v_guest from public.guests where id = v_invite.guest_id;
    v_status := public.invite_status(v_invite, v_party);
    if v_status = 'revoked' then return jsonb_build_object('status', 'revoked'); end if;

    update public.invites set last_opened_at = now() where id = v_invite.id;
    return public.build_invite_payload(v_party, v_guest, v_status, 'guest');
  end if;

  select * into v_party from public.parties where share_token = p_token;
  if not found then return jsonb_build_object('status', 'revoked'); end if;

  v_status := case
    when now() > public.party_end_at(v_party) + interval '7 days' then 'soft_expired'
    else 'active'
  end;

  return public.build_invite_payload(v_party, null, v_status, 'share');
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
  v_guest public.guests;
  v_status text;
  v_name text;
begin
  if p_rsvp_status not in ('attending', 'maybe', 'not_attending') then
    return jsonb_build_object('ok', false, 'error', 'invalid_rsvp_status');
  end if;

  -- Keep legacy personal links readable/updateable, but never create new ones.
  select * into v_invite from public.invites where token = p_token;
  if found then
    select * into v_party from public.parties where id = v_invite.party_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid_token');
    end if;
    v_status := public.invite_status(v_invite, v_party);
    if v_status <> 'active' then
      return jsonb_build_object('ok', false, 'error', v_status);
    end if;

    update public.guests
    set
      name = coalesce(nullif(trim(p_name), ''), name),
      email = coalesce(nullif(trim(p_email), ''), email),
      rsvp_status = p_rsvp_status,
      allergies = nullif(trim(coalesce(p_allergies, '')), ''),
      plus_one_count = greatest(coalesce(p_plus_one_count, 0), 0),
      notes = p_notes,
      updated_at = now()
    where id = v_invite.guest_id
    returning * into v_guest;

    return public.build_invite_payload(v_party, v_guest, 'active', 'share')
      || jsonb_build_object('ok', true);
  end if;

  select * into v_party from public.parties where share_token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if now() > public.party_end_at(v_party) + interval '7 days' then
    return jsonb_build_object('ok', false, 'error', 'soft_expired');
  end if;

  v_name := nullif(trim(p_name), '');
  if v_name is null then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;
  if char_length(v_name) > 80 then
    v_name := left(v_name, 80);
  end if;

  select * into v_guest
  from public.guests
  where party_id = v_party.id
    and source = 'share'
    and lower(trim(name)) = lower(v_name)
  order by created_at desc
  limit 1;

  if found then
    update public.guests
    set
      name = v_name,
      rsvp_status = p_rsvp_status,
      allergies = nullif(trim(coalesce(p_allergies, '')), ''),
      plus_one_count = greatest(coalesce(p_plus_one_count, 0), 0),
      notes = p_notes,
      updated_at = now()
    where id = v_guest.id
    returning * into v_guest;
  else
    if (select count(*) from public.guests where party_id = v_party.id) >= 200 then
      return jsonb_build_object('ok', false, 'error', 'guest_limit');
    end if;

    insert into public.guests (
      party_id,
      name,
      email,
      rsvp_status,
      allergies,
      plus_one_count,
      notes,
      source
    ) values (
      v_party.id,
      v_name,
      null,
      p_rsvp_status,
      nullif(trim(coalesce(p_allergies, '')), ''),
      greatest(coalesce(p_plus_one_count, 0), 0),
      p_notes,
      'share'
    )
    returning * into v_guest;
  end if;

  return public.build_invite_payload(v_party, v_guest, 'active', 'share')
    || jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.get_invite_by_token(text) to anon, authenticated;
grant execute on function public.rsvp_via_invite_token(text, text, text, text, text, text, int, text) to anon, authenticated;
