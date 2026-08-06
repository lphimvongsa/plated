-- Allow owners to read their party immediately after insert (before party_members row exists).
-- createParty uses insert().select(), which requires a matching SELECT policy on the new row.

drop policy if exists "parties_select_member" on public.parties;
create policy "parties_select_member" on public.parties
  for select to authenticated
  using (owner_id = auth.uid() or public.is_party_member(id));

drop policy if exists "parties_update_member" on public.parties;
create policy "parties_update_member" on public.parties
  for update to authenticated
  using (owner_id = auth.uid() or public.is_party_member(id))
  with check (owner_id = auth.uid() or public.is_party_member(id));

-- Automatically add the creator as party owner member.
create or replace function public.add_party_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.party_members (party_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists parties_add_owner_member on public.parties;
create trigger parties_add_owner_member
  after insert on public.parties
  for each row execute function public.add_party_owner_member();
