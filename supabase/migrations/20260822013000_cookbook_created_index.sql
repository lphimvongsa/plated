-- The cookbook now uses creation order to keep recipe page positions stable
-- when a recipe is edited. Match that filter + order so the index view does
-- not regress as a user's cookbook grows.
create index if not exists recipes_owner_cookbook_created_idx
  on public.recipes (owner_id, created_at asc)
  where party_id is null;

-- Preserve the timeline invariant introduced in the UI: a scheduled task is
-- always owned by a helper lane. Existing prototype data may predate helpers,
-- so assign those scheduled rows to the party's first helper when possible.
with first_helpers as (
  select distinct on (party_id) party_id, id
  from public.party_helpers
  order by party_id, sort_order, created_at, id
)
update public.tasks as task
set helper_id = helper.id
from first_helpers as helper
where task.party_id = helper.party_id
  and task.start_at is not null
  and task.helper_id is null;
