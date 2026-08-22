-- Composite indexes for the application's common filtered ordering paths.
-- These complement the existing single-column foreign-key indexes.

create index if not exists recipes_owner_cookbook_updated_idx
  on public.recipes (owner_id, updated_at desc)
  where party_id is null;

create index if not exists recipes_party_updated_idx
  on public.recipes (party_id, updated_at desc);

create index if not exists menu_items_party_sort_idx
  on public.menu_items (party_id, sort_order);

create index if not exists grocery_items_party_sort_idx
  on public.grocery_items (party_id, sort_order);

create index if not exists tasks_party_sort_idx
  on public.tasks (party_id, sort_order);

create index if not exists tasks_party_status_start_idx
  on public.tasks (party_id, status, start_at);

create index if not exists recipe_steps_recipe_sort_idx
  on public.recipe_steps (recipe_id, sort_order);

create index if not exists invites_party_active_created_idx
  on public.invites (party_id, created_at)
  where revoked_at is null;

create unique index if not exists party_members_party_user_idx
  on public.party_members (party_id, user_id);
