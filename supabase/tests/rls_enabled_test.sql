begin;
select plan(1);

select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('public', 'marketing')
      and not c.relrowsecurity
  $$,
  'every table in public and marketing has row level security enabled'
);

select * from finish();
rollback;
