-- Section-level timeline tasks: one party task per recipe section, not per step.

alter table public.tasks
  add column if not exists section text;

create index if not exists tasks_party_recipe_section_idx
  on public.tasks (party_id, recipe_id, section)
  where recipe_id is not null and section is not null;

-- Backfill section from the linked step template when present.
update public.tasks t
set section = coalesce(nullif(trim(rtt.section), ''), 'Cooking')
from public.recipe_task_templates rtt
where t.template_id = rtt.id
  and t.section is null;

-- Collapse existing per-step timeline rows into one task per (party, recipe, section).
-- Keep the earliest-scheduled (or lowest sort_order) row; clear template_id so
-- sync keys off section instead of a single step.
with ranked as (
  select
    id,
    party_id,
    recipe_id,
    section,
    row_number() over (
      partition by party_id, recipe_id, section
      order by start_at nulls last, sort_order, created_at
    ) as rn
  from public.tasks
  where recipe_id is not null
    and nullif(trim(section), '') is not null
),
keepers as (
  select id, party_id, recipe_id, section from ranked where rn = 1
),
durations as (
  select
    t.party_id,
    t.recipe_id,
    coalesce(nullif(trim(rtt.section), ''), 'Cooking') as section,
    sum(coalesce(rtt.duration_minutes, 0))::int as duration_minutes,
    min(rtt.sort_order) as sort_order
  from public.tasks t
  join public.recipe_task_templates rtt on rtt.recipe_id = t.recipe_id
  where t.recipe_id is not null
  group by t.party_id, t.recipe_id, coalesce(nullif(trim(rtt.section), ''), 'Cooking')
)
update public.tasks t
set
  title = k.section,
  section = k.section,
  template_id = null,
  duration_minutes = coalesce(d.duration_minutes, t.duration_minutes),
  sort_order = coalesce(d.sort_order, t.sort_order)
from keepers k
left join durations d
  on d.party_id = k.party_id
 and d.recipe_id = k.recipe_id
 and d.section = k.section
where t.id = k.id;

delete from public.tasks t
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by party_id, recipe_id, section
        order by start_at nulls last, sort_order, created_at
      ) as rn
    from public.tasks
    where recipe_id is not null
      and nullif(trim(section), '') is not null
  ) ranked
  where rn > 1
) doomed
where t.id = doomed.id;

-- Force a structural timeline sync so any leftover per-step rows collapse in-app.
update public.parties
set timeline_dirty = true
where exists (select 1 from public.menu_items mi where mi.party_id = parties.id);
