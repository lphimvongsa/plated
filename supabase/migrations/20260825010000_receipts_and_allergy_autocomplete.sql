-- Receipt capture/matching and structured allergy autocomplete for invitations.

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  store_name text,
  purchased_at date,
  subtotal numeric(10,2),
  tax numeric(10,2),
  total numeric(10,2),
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  grocery_item_id uuid references public.grocery_items(id) on delete set null,
  raw_name text not null,
  normalized_name text,
  quantity numeric,
  line_total numeric(10,2) not null default 0,
  match_confidence numeric(5,4),
  purchased boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists receipts_party_id_created_idx on public.receipts(party_id, created_at desc);
create index if not exists receipt_items_receipt_id_idx on public.receipt_items(receipt_id);
create index if not exists receipt_items_grocery_item_id_idx on public.receipt_items(grocery_item_id);

alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

drop policy if exists "receipts_party_members" on public.receipts;
create policy "receipts_party_members" on public.receipts
  for all to authenticated
  using (public.is_party_member(party_id))
  with check (public.is_party_member(party_id));

drop policy if exists "receipt_items_party_members" on public.receipt_items;
create policy "receipt_items_party_members" on public.receipt_items
  for all to authenticated
  using (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and public.is_party_member(r.party_id)
  ))
  with check (exists (
    select 1 from public.receipts r
    where r.id = receipt_id and public.is_party_member(r.party_id)
  ));

-- Backfill common ingredient -> allergen relationships so existing imported recipes
-- benefit from the same canonical matching as new AI imports.
update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['soy']::text[]))
where lower(name) ~ '(tofu|tempeh|miso|edamame|soy sauce|tamari)' and not ('soy' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['sesame']::text[]))
where lower(name) ~ '(sesame|tahini)' and not ('sesame' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['milk']::text[]))
where lower(name) ~ '(milk|butter|cream|cheese|yogurt|whey|casein|ghee|parmesan|mozzarella|cheddar)' and not ('milk' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['egg']::text[]))
where lower(name) ~ '(^|[^a-z])(egg|eggs|mayonnaise|mayo)([^a-z]|$)' and not ('egg' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['peanut']::text[]))
where lower(name) ~ '(peanut|groundnut)' and not ('peanut' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['tree nuts']::text[]))
where lower(name) ~ '(almond|cashew|walnut|pecan|pistachio|hazelnut|macadamia|brazil nut|pine nut)' and not ('tree nuts' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['shellfish']::text[]))
where lower(name) ~ '(shrimp|prawn|crab|lobster|crayfish|crawfish)' and not ('shellfish' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['fish']::text[]))
where lower(name) ~ '(salmon|tuna|cod|anchov|sardine|fish sauce|trout|halibut)' and not ('fish' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['wheat']::text[]))
where lower(name) ~ '(wheat|flour|bread|pasta|couscous|seitan|soy sauce)' and not ('wheat' = any(coalesce(allergen_tags, '{}'::text[])));

update public.ingredients
set allergen_tags = array(select distinct unnest(coalesce(allergen_tags, '{}'::text[]) || array['gluten']::text[]))
where lower(name) ~ '(wheat|flour|bread|pasta|couscous|seitan|barley|rye|soy sauce)' and not ('gluten' = any(coalesce(allergen_tags, '{}'::text[])));

-- Public invite payload now carries the menu's canonical ingredients and allergen
-- tags so guests choose reliable options instead of entering arbitrary strings.
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
  v_allergy_options jsonb;
begin
  select * into v_invite from public.invites where token = p_token;
  if not found then return jsonb_build_object('status', 'revoked'); end if;

  select * into v_party from public.parties where id = v_invite.party_id;
  if not found then return jsonb_build_object('status', 'revoked'); end if;

  select * into v_guest from public.guests where id = v_invite.guest_id;
  v_status := public.invite_status(v_invite, v_party);
  if v_status = 'revoked' then return jsonb_build_object('status', 'revoked'); end if;

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
    where mi.party_id = v_party.id and mi.guest_visible = true

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
    where mi.party_id = v_party.id and mi.guest_visible = true
  ) options;

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
    'menu', v_menu,
    'allergy_options', v_allergy_options
  );
end;
$$;
