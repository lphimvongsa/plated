-- Corrective invitation/media iteration: real crop metadata and editable invite-only menu copy.
alter table public.parties
  add column if not exists cover_crop jsonb,
  add column if not exists invitation_photo_crops jsonb not null default '[]'::jsonb,
  add column if not exists invitation_menu_overrides jsonb not null default '{}'::jsonb;

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

  update public.invites set last_opened_at = now() where id = v_invite.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', mi.id,
      'course', mi.course,
      'title', coalesce(nullif(v_party.invitation_menu_overrides -> (mi.id::text) ->> 'title', ''), r.title),
      'description', case
        when (v_party.invitation_menu_overrides -> (mi.id::text)) ? 'description'
          then v_party.invitation_menu_overrides -> (mi.id::text) ->> 'description'
        else r.description
      end
    ) order by mi.sort_order
  ), '[]'::jsonb)
  into v_menu
  from public.menu_items mi
  join public.recipes r on r.id = mi.recipe_id
  where mi.party_id = v_party.id and mi.guest_visible = true;

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
      'color_scheme', v_party.color_scheme,
      'cuisine', v_party.cuisine,
      'service_style', v_party.service_style,
      'dress_code', v_party.dress_code,
      'guest_contribution_notes', v_party.guest_contribution_notes,
      'hero_image', v_party.hero_image,
      'cover_position', v_party.cover_position,
      'cover_crop', v_party.cover_crop,
      'invitation_headline', v_party.invitation_headline,
      'invitation_message', v_party.invitation_message,
      'invitation_signoff', v_party.invitation_signoff,
      'invitation_rsvp_label', v_party.invitation_rsvp_label,
      'invitation_photo_urls', v_party.invitation_photo_urls,
      'invitation_photo_positions', v_party.invitation_photo_positions,
      'invitation_photo_crops', v_party.invitation_photo_crops
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
