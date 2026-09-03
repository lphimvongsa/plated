-- Timeline duration scaling for party serving-size changes.
-- Recipe-backed tasks keep the recipe's original duration as a stable base and
-- calculate a party-specific scheduled duration from that base.

alter table public.tasks
  add column if not exists base_duration_minutes int,
  add column if not exists duration_scaling_mode text;

update public.tasks
set base_duration_minutes = duration_minutes
where base_duration_minutes is null and duration_minutes is not null;

update public.tasks
set duration_scaling_mode = case when recipe_id is null then 'manual' else null end
where duration_scaling_mode is null;

alter table public.tasks
  drop constraint if exists tasks_duration_scaling_mode_check;

alter table public.tasks
  add constraint tasks_duration_scaling_mode_check
  check (duration_scaling_mode is null or duration_scaling_mode in ('fixed', 'quantity', 'batch', 'manual'));
