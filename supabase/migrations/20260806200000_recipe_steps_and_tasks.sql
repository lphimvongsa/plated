-- Clarify model: recipe steps belong to named tasks (was "sections").
-- Table recipe_task_templates → recipe_steps; section → task; template_id → step_id.

alter table public.recipe_task_templates rename to recipe_steps;

alter table public.recipe_steps rename column section to task;

alter index if exists recipe_task_templates_recipe_id_idx rename to recipe_steps_recipe_id_idx;

alter trigger recipe_task_templates_updated_at on public.recipe_steps
  rename to recipe_steps_updated_at;

drop trigger if exists party_recipe_templates_dirty on public.recipe_steps;

create or replace function public.trg_party_recipe_steps_dirty()
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

create trigger party_recipe_steps_dirty
  after insert or update or delete on public.recipe_steps
  for each row execute function public.trg_party_recipe_steps_dirty();

drop function if exists public.trg_party_recipe_templates_dirty();

drop policy if exists "recipe_task_templates_all" on public.recipe_steps;

create policy "recipe_steps_all" on public.recipe_steps
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

alter table public.tasks rename column section to task;
alter table public.tasks rename column template_id to step_id;

alter index if exists tasks_template_id_idx rename to tasks_step_id_idx;
alter index if exists tasks_party_recipe_section_idx rename to tasks_party_recipe_task_idx;
