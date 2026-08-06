-- PostgREST needs explicit table grants; RLS still enforces row access.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- anon has no direct table access; invite RPCs are granted in initial_schema
revoke all on all tables in schema public from anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
