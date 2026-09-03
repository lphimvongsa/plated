-- Group-link invitations only. New RSVPs submitted through a party share token
-- no longer create per-guest invite tokens. Existing legacy private invite
-- tokens continue to resolve so old links fail gracefully instead of breaking.

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
    raise exception 'invalid rsvp_status';
  end if;

  -- Keep legacy personal links readable/updateable, but never create new ones.
  select * into v_invite from public.invites where token = p_token;
  if found then
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

  -- Reusing the same name on the same group link updates that RSVP instead of
  -- creating another guest row. This keeps the single-link flow usable without
  -- exposing a private URL after submission.
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
