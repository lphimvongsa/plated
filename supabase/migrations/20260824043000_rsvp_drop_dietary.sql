-- RSVP no longer collects dietary preference. Leave existing values intact.
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
    allergies = nullif(trim(coalesce(p_allergies, '')), ''),
    plus_one_count = greatest(coalesce(p_plus_one_count, 0), 0),
    notes = p_notes,
    updated_at = now()
  where id = v_invite.guest_id;

  return public.get_invite_by_token(p_token) || jsonb_build_object('ok', true);
end;
$$;
