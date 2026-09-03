-- Hard database invariant: one helper cannot be scheduled for two tasks at the
-- same time. The UI and server actions already prevent conflicts; this protects
-- against concurrent/stale writes as well.

create extension if not exists btree_gist with schema extensions;

-- Older prototypes allowed overlapping rows. Keep the earliest row in each
-- conflicting pair and unschedule later conflicts while preserving delegation.
update public.tasks as current
set start_at = null
where current.helper_id is not null
  and current.start_at is not null
  and exists (
    select 1
    from public.tasks as earlier
    where earlier.party_id = current.party_id
      and earlier.helper_id = current.helper_id
      and earlier.start_at is not null
      and (
        earlier.start_at < current.start_at
        or (earlier.start_at = current.start_at and earlier.id::text < current.id::text)
      )
      and tstzrange(
        earlier.start_at,
        earlier.start_at + make_interval(mins => greatest(5, coalesce(earlier.duration_minutes, 30))),
        '[)'
      ) && tstzrange(
        current.start_at,
        current.start_at + make_interval(mins => greatest(5, coalesce(current.duration_minutes, 30))),
        '[)'
      )
  );

alter table public.tasks drop constraint if exists tasks_helper_schedule_no_overlap;
alter table public.tasks
  add constraint tasks_helper_schedule_no_overlap
  exclude using gist (
    party_id with =,
    helper_id with =,
    tstzrange(
      start_at,
      start_at + make_interval(mins => greatest(5, coalesce(duration_minutes, 30))),
      '[)'
    ) with &&
  )
  where (helper_id is not null and start_at is not null);
