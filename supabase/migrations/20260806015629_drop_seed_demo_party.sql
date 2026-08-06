-- Stop auto-creating demo parties for new users
drop function if exists public.seed_demo_party_for_user(uuid);
