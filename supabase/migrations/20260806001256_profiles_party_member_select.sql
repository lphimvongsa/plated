-- Allow party co-members to read each other's display names/avatars
create policy "profiles_select_party_peers" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1
      from public.party_members me
      join public.party_members peer on peer.party_id = me.party_id
      where me.user_id = auth.uid()
        and peer.user_id = profiles.id
    )
  );
