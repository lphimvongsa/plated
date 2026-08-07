-- Backfill duration_minutes for demo tasks and include durations in the demo seeder.

update public.tasks set duration_minutes = 45 where title = 'Make tart dough' and duration_minutes is null;
update public.tasks set duration_minutes = 20 where title = 'Marinate chicken' and duration_minutes is null;
update public.tasks set duration_minutes = 75 where title = 'Bake olive oil cake' and duration_minutes is null;
update public.tasks set duration_minutes = 45 where title = 'Set table & chill wine' and duration_minutes is null;
update public.tasks set duration_minutes = 40 where title = 'Blind-bake tart shell' and duration_minutes is null;
update public.tasks set duration_minutes = 30 where title = 'Prep greens and tahini' and duration_minutes is null;
update public.tasks set duration_minutes = 50 where title = 'Grill chicken' and duration_minutes is null;
update public.tasks set duration_minutes = 35 where title = 'Finish tart & plate welcome bite' and duration_minutes is null;
update public.tasks set duration_minutes = 30 where duration_minutes is null;

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
    'Lukas'' backyard · Providence, RI',
    'America/New_York',
    'Late-summer garden party',
    'Mediterranean-inspired',
    'Family style',
    'Garden color',
    'A bottle you love — wine, sparkling water, or something surprising.',
    '/photos/party-01.webp',
    12,
    'scheduled'
  )
  returning id into v_party_id;

  insert into public.party_members (party_id, user_id, role)
  values (v_party_id, p_user_id, 'owner');

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Heirloom tomato tart', 'Welcome bite', 12, 25, 35, '/photos/party-04.webp', 'Gluten, dairy', 24.8, 'Ready', 'crème fraîche · basil · flaky pastry')
  returning id into r_tart;

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Charred lemon chicken', 'Main', 12, 30, 45, '/photos/party-01.webp', null, 48.2, 'Ready', 'oregano · garlic · pan juices')
  returning id into r_chicken;

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Herby greens & tahini', 'Side', 12, 20, 10, '/photos/party-04.webp', 'Sesame', 19.4, 'Review allergy', 'charred lemon · toasted seeds')
  returning id into r_greens;

  insert into public.recipes (owner_id, party_id, title, course, servings, prep_minutes, cook_minutes, image_url, allergy_notes, estimated_cost, status, description)
  values (p_user_id, v_party_id, 'Citrus olive oil cake', 'Dessert', 12, 20, 50, '/photos/party-08.webp', 'Gluten, eggs', 17.5, 'Ready', 'berries · whipped cream')
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
    (v_party_id, 'Crème fraîche', '16 oz', 'Dairy & eggs', false, 8.9, 8),
    (v_party_id, 'All-purpose flour', '5 cups', 'Pantry & bakery', true, 4.8, 9),
    (v_party_id, 'Tahini', '1 jar', 'Pantry & bakery', false, 7.5, 10),
    (v_party_id, 'Extra-virgin olive oil', '3 cups', 'Pantry & bakery', true, 18, 11);

  insert into public.tasks (
    party_id, title, description, start_at, duration_minutes, difficulty, assigned_name, status, locked, sort_order
  ) values
    (v_party_id, 'Make tart dough', 'Rest overnight in refrigerator', v_starts - interval '2 days' + interval '1 hour', 45, 'Intermediate', 'Lukas', 'done', true, 1),
    (v_party_id, 'Marinate chicken', 'Lemon, garlic, oregano — 20 min active', v_starts - interval '1 day', 20, 'Beginner', 'Maya', 'done', false, 2),
    (v_party_id, 'Bake olive oil cake', 'Must cool before citrus glaze', v_starts - interval '8 hours 30 minutes', 75, 'Intermediate', 'Lukas', 'todo', true, 3),
    (v_party_id, 'Set table & chill wine', 'Outdoor table, flowers, candles', v_starts - interval '5 hours', 45, 'Beginner', 'Ari', 'todo', false, 4),
    (v_party_id, 'Blind-bake tart shell', 'Oven 375°F · Dependency: chilled dough', v_starts - interval '3 hours 30 minutes', 40, 'Intermediate', 'Maya', 'todo', false, 5),
    (v_party_id, 'Prep greens and tahini', 'Hold dressing separately', v_starts - interval '2 hours 20 minutes', 30, 'Beginner', 'Ari', 'todo', false, 6),
    (v_party_id, 'Grill chicken', 'Two batches · rest 15 min', v_starts - interval '1 hour 20 minutes', 50, 'Advanced', 'Lukas', 'todo', true, 7),
    (v_party_id, 'Finish tart & plate welcome bite', 'Keep main grill zone clear', v_starts - interval '25 minutes', 35, 'Intermediate', 'Maya', 'todo', false, 8);

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
