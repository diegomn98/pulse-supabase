begin;
select plan(42);

select has_schema('marketing');
select has_table('marketing', 'waitlist', 'marketing.waitlist exists');

select col_type_is('marketing', 'waitlist', 'id', 'uuid', 'id is uuid');
select col_is_pk('marketing', 'waitlist', 'id', 'id is the primary key');
select col_type_is('marketing', 'waitlist', 'email', 'text', 'email is text');
select col_not_null('marketing', 'waitlist', 'email', 'email is required');
select col_is_unique('marketing', 'waitlist', 'email', 'email is unique');
select col_type_is('marketing', 'waitlist', 'platforms', 'text[]', 'platforms is text[]');
select col_not_null('marketing', 'waitlist', 'platforms', 'platforms is required');
select col_type_is('marketing', 'waitlist', 'source', 'text', 'source is text');
select col_not_null('marketing', 'waitlist', 'source', 'source is required');
select col_type_is('marketing', 'waitlist', 'created_at', 'timestamp with time zone', 'created_at is timestamptz');
select col_type_is('marketing', 'waitlist', 'updated_at', 'timestamp with time zone', 'updated_at is timestamptz');
select col_type_is('marketing', 'waitlist', 'welcome_sent_at', 'timestamp with time zone', 'welcome_sent_at is timestamptz');
select col_is_null('marketing', 'waitlist', 'welcome_sent_at', 'welcome_sent_at is nullable');
select col_type_is('marketing', 'waitlist', 'unsubscribe_token', 'uuid', 'unsubscribe_token is uuid');
select col_is_unique('marketing', 'waitlist', 'unsubscribe_token', 'unsubscribe_token is unique');
select col_type_is('marketing', 'waitlist', 'unsubscribed_at', 'timestamp with time zone', 'unsubscribed_at is timestamptz');
select col_is_null('marketing', 'waitlist', 'unsubscribed_at', 'unsubscribed_at is nullable');

insert into marketing.waitlist (email, platforms, source, created_at, updated_at)
values ('ana@example.com', array['ios', 'web'], 'hero', '2026-01-01', '2026-01-01');

select ok(
  (select id is not null and unsubscribe_token is not null and unsubscribed_at is null and welcome_sent_at is null
   from marketing.waitlist where email = 'ana@example.com'),
  'defaults fill id and unsubscribe_token and leave timestamps of later events null'
);

update marketing.waitlist set platforms = array['android'] where email = 'ana@example.com';

select is(
  (select updated_at from marketing.waitlist where email = 'ana@example.com'),
  now(),
  'updated_at is refreshed on update'
);

select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('ana@example.com', array['ios'], 'hero') $$,
  '23505', null, 'duplicate email is rejected'
);
select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('Ana@Example.com', array['ios'], 'hero') $$,
  '23514', null, 'email with uppercase letters is rejected'
);
select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values (' bea@example.com', array['ios'], 'hero') $$,
  '23514', null, 'email with surrounding spaces is rejected'
);
select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('bea@example.com', array['ios', 'windows'], 'hero') $$,
  '23514', null, 'platform outside ios, android and web is rejected'
);
select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('bea@example.com', array['ios'], 'banner') $$,
  '23514', null, 'source outside hero and footer is rejected'
);
select lives_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('bea@example.com', array['ios', 'android', 'web'], 'footer') $$,
  'valid row with every platform is accepted'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'marketing.waitlist'::regclass),
  'row level security is enabled on marketing.waitlist'
);
select is_empty(
  $$ select policyname from pg_policies where schemaname = 'marketing' $$,
  'marketing has no policies'
);

select ok(not has_schema_privilege('anon', 'marketing', 'usage'), 'anon has no usage on marketing');
select ok(not has_schema_privilege('authenticated', 'marketing', 'usage'), 'authenticated has no usage on marketing');
select table_privs_are('marketing', 'waitlist', 'anon', array[]::text[], 'anon has no privileges on waitlist');
select table_privs_are('marketing', 'waitlist', 'authenticated', array[]::text[], 'authenticated has no privileges on waitlist');

set local role anon;
select throws_ok($$ select * from marketing.waitlist $$, '42501', null, 'anon cannot read waitlist');
select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('eve@example.com', array['ios'], 'hero') $$,
  '42501', null, 'anon cannot insert into waitlist'
);
select throws_ok($$ update marketing.waitlist set source = 'footer' $$, '42501', null, 'anon cannot update waitlist');
select throws_ok($$ delete from marketing.waitlist $$, '42501', null, 'anon cannot delete from waitlist');
reset role;

set local role authenticated;
select throws_ok($$ select * from marketing.waitlist $$, '42501', null, 'authenticated cannot read waitlist');
select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('eve@example.com', array['ios'], 'hero') $$,
  '42501', null, 'authenticated cannot insert into waitlist'
);
reset role;

grant usage on schema marketing to anon;
grant select, insert, update, delete on marketing.waitlist to anon;

set local role anon;
select is_empty($$ select * from marketing.waitlist $$, 'rls hides every row from anon even with table privileges');
select throws_ok(
  $$ insert into marketing.waitlist (email, platforms, source) values ('eve@example.com', array['ios'], 'hero') $$,
  '42501', null, 'rls rejects inserts from anon even with table privileges'
);
update marketing.waitlist set source = 'footer';
delete from marketing.waitlist;
reset role;

select is(
  (select array_agg(email || ':' || source order by email) from marketing.waitlist),
  array['ana@example.com:hero', 'bea@example.com:footer'],
  'rls blocks updates and deletes from anon even with table privileges'
);

select * from finish();
rollback;
