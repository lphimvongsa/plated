-- Recipe system: cookbook/party copies, task templates, shopping provenance,
-- timeline links, ingredient prices, and user measurement dimension preference.
-- See RECIPE_SYSTEM_SPEC.md.

-- ---------------------------------------------------------------------------
-- Profiles: volume vs weight preference
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists preferred_dimension text not null default 'volume'
    check (preferred_dimension in ('volume', 'weight'));

-- ---------------------------------------------------------------------------
-- Parties: dirty flags for shopping / timeline regen
-- planning_guest_count remains the host-set party serving size (SOT).
-- ---------------------------------------------------------------------------

alter table public.parties
  add column if not exists shopping_dirty boolean not null default true,
  add column if not exists timeline_dirty boolean not null default true;

-- ---------------------------------------------------------------------------
-- Recipes: parent link, richer fields, import metadata
-- ---------------------------------------------------------------------------

alter table public.recipes
  add column if not exists cookbook_recipe_id uuid references public.recipes (id) on delete set null,
  add column if not exists difficulty text,
  add column if not exists total_minutes int,
  add column if not exists dietary_tags text[] not null default '{}',
  add column if not exists allergy_tags text[] not null default '{}',
  add column if not exists make_ahead_notes text,
  add column if not exists storage_notes text,
  add column if not exists reheating_notes text,
  add column if not exists import_status text not null default 'manual'
    check (import_status in ('complete', 'incomplete', 'manual')),
  add column if not exists import_source_type text
    check (import_source_type is null or import_source_type in ('manual', 'text', 'url', 'pdf'));

create index if not exists recipes_cookbook_recipe_id_idx on public.recipes (cookbook_recipe_id);
create index if not exists recipes_owner_id_idx on public.recipes (owner_id);
create index if not exists recipes_party_id_idx on public.recipes (party_id);

-- ---------------------------------------------------------------------------
-- Ingredients: sections, secondary measurement, unit cost
-- ---------------------------------------------------------------------------

alter table public.ingredients
  add column if not exists section text,
  add column if not exists secondary_quantity numeric,
  add column if not exists secondary_unit text,
  add column if not exists estimated_unit_cost numeric(12, 4),
  add column if not exists canonical_key text;

create index if not exists ingredients_recipe_id_idx on public.ingredients (recipe_id);

-- ---------------------------------------------------------------------------
-- Recipe task templates (source of truth for step-level timed tasks)
-- ---------------------------------------------------------------------------

create table if not exists public.recipe_task_templates (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  title text not null,
  description text,
  duration_minutes int,
  section text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipe_task_templates_recipe_id_idx
  on public.recipe_task_templates (recipe_id);

drop trigger if exists recipe_task_templates_updated_at on public.recipe_task_templates;
create trigger recipe_task_templates_updated_at
  before update on public.recipe_task_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Party timeline tasks: link to recipe + template
-- ---------------------------------------------------------------------------

alter table public.tasks
  add column if not exists recipe_id uuid references public.recipes (id) on delete set null,
  add column if not exists template_id uuid references public.recipe_task_templates (id) on delete set null;

create index if not exists tasks_recipe_id_idx on public.tasks (recipe_id);
create index if not exists tasks_template_id_idx on public.tasks (template_id);

-- ---------------------------------------------------------------------------
-- Grocery items: manual flag, numeric qty, dish provenance
-- ---------------------------------------------------------------------------

alter table public.grocery_items
  add column if not exists is_manual boolean not null default false,
  add column if not exists canonical_key text,
  add column if not exists quantity numeric,
  add column if not exists source_recipe_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Ingredient prices (USD) with AI/manual backfill
-- ---------------------------------------------------------------------------

create table if not exists public.ingredient_prices (
  canonical_key text primary key,
  unit text not null,
  price_per_unit numeric(12, 4) not null,
  currency text not null default 'USD' check (currency = 'USD'),
  source text not null default 'seed'
    check (source in ('seed', 'ai', 'manual')),
  updated_at timestamptz not null default now()
);

create trigger ingredient_prices_updated_at
  before update on public.ingredient_prices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Dirty-flag helpers
-- ---------------------------------------------------------------------------

create or replace function public.mark_party_shopping_dirty(p_party_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.parties
  set shopping_dirty = true
  where id = p_party_id;
$$;

create or replace function public.mark_party_timeline_dirty(p_party_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.parties
  set timeline_dirty = true
  where id = p_party_id;
$$;

create or replace function public.trg_menu_items_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.mark_party_shopping_dirty(coalesce(new.party_id, old.party_id));
  perform public.mark_party_timeline_dirty(coalesce(new.party_id, old.party_id));
  return coalesce(new, old);
end;
$$;

create trigger menu_items_dirty
  after insert or delete on public.menu_items
  for each row execute function public.trg_menu_items_dirty();

create or replace function public.trg_party_servings_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.planning_guest_count is distinct from old.planning_guest_count then
    new.shopping_dirty := true;
    new.timeline_dirty := true;
  end if;
  return new;
end;
$$;

create trigger party_servings_dirty
  before update on public.parties
  for each row execute function public.trg_party_servings_dirty();

create or replace function public.trg_party_recipe_ingredients_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party_id uuid;
begin
  select r.party_id into v_party_id
  from public.recipes r
  where r.id = coalesce(new.recipe_id, old.recipe_id);

  if v_party_id is not null then
    perform public.mark_party_shopping_dirty(v_party_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger party_recipe_ingredients_dirty
  after insert or update or delete on public.ingredients
  for each row execute function public.trg_party_recipe_ingredients_dirty();

create or replace function public.trg_party_recipe_templates_dirty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_party_id uuid;
begin
  select r.party_id into v_party_id
  from public.recipes r
  where r.id = coalesce(new.recipe_id, old.recipe_id);

  if v_party_id is not null then
    perform public.mark_party_timeline_dirty(v_party_id);
  end if;
  return coalesce(new, old);
end;
$$;

create trigger party_recipe_templates_dirty
  after insert or update or delete on public.recipe_task_templates
  for each row execute function public.trg_party_recipe_templates_dirty();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.recipe_task_templates enable row level security;
alter table public.ingredient_prices enable row level security;

create policy "recipe_task_templates_all" on public.recipe_task_templates
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

-- Prices are shared reference data: authenticated can read; writes via service/owner actions.
create policy "ingredient_prices_select" on public.ingredient_prices
  for select to authenticated using (true);

create policy "ingredient_prices_insert" on public.ingredient_prices
  for insert to authenticated with check (true);

create policy "ingredient_prices_update" on public.ingredient_prices
  for update to authenticated using (true) with check (true);

grant select, insert, update, delete on public.recipe_task_templates to authenticated;
grant select, insert, update on public.ingredient_prices to authenticated;
