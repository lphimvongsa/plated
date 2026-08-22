alter table public.parties
  add column if not exists shopping_refresh_token uuid,
  add column if not exists shopping_refresh_started_at timestamptz,
  add column if not exists timeline_refresh_token uuid,
  add column if not exists timeline_refresh_started_at timestamptz;

create or replace function public.claim_party_refresh(p_party_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token uuid := gen_random_uuid();
begin
  if not public.is_party_member(p_party_id) then
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
  if not public.is_party_member(p_party_id) then
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

grant execute on function public.claim_party_refresh(uuid, text) to authenticated;
grant execute on function public.finish_party_refresh(uuid, text, uuid, boolean) to authenticated;
