begin;
select plan(15);

select has_function('public', 'mark_welcome_sent', array['uuid'], 'public.mark_welcome_sent exists');
select isnt_definer('public', 'mark_welcome_sent', array['uuid'], 'mark_welcome_sent is security invoker');

select function_privs_are('public', 'mark_welcome_sent', array['uuid'], 'public', array[]::text[], 'public cannot execute mark_welcome_sent');
select function_privs_are('public', 'mark_welcome_sent', array['uuid'], 'anon', array[]::text[], 'anon cannot execute mark_welcome_sent');
select function_privs_are('public', 'mark_welcome_sent', array['uuid'], 'authenticated', array[]::text[], 'authenticated cannot execute mark_welcome_sent');
select function_privs_are('public', 'mark_welcome_sent', array['uuid'], 'service_role', array['EXECUTE'], 'service_role can execute mark_welcome_sent');

insert into marketing.waitlist (email, platforms, source, unsubscribe_token)
values
  ('ana@example.com', array['ios'], 'hero', '11111111-1111-1111-1111-111111111111'),
  ('bea@example.com', array['web'], 'footer', '22222222-2222-2222-2222-222222222222');

set local role anon;
select throws_ok(
  $$ select public.mark_welcome_sent('11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'anon cannot call mark_welcome_sent'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select public.mark_welcome_sent('11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'authenticated cannot call mark_welcome_sent'
);
reset role;

select is(
  (select count(*) from marketing.waitlist where welcome_sent_at is not null),
  0::bigint,
  'rejected calls leave welcome_sent_at empty'
);

set local role service_role;

select lives_ok(
  $$ select public.mark_welcome_sent('11111111-1111-1111-1111-111111111111') $$,
  'service_role can call mark_welcome_sent'
);
select is(
  (select welcome_sent_at from marketing.waitlist where email = 'ana@example.com'),
  now(),
  'a valid token fills welcome_sent_at'
);
select is(
  (select welcome_sent_at from marketing.waitlist where email = 'bea@example.com'),
  null,
  'a valid token leaves other rows untouched'
);

update marketing.waitlist set welcome_sent_at = '2026-01-01' where email = 'ana@example.com';
select public.mark_welcome_sent('11111111-1111-1111-1111-111111111111');

select is(
  (select welcome_sent_at from marketing.waitlist where email = 'ana@example.com'),
  '2026-01-01'::timestamptz,
  'marking twice keeps the first date'
);

select lives_ok(
  $$ select public.mark_welcome_sent('00000000-0000-0000-0000-000000000000') $$,
  'an unknown token does not raise an error'
);
select is(
  (select array_agg(email || ':' || coalesce(welcome_sent_at::text, '-') order by email) from marketing.waitlist),
  array['ana@example.com:2026-01-01 00:00:00+00', 'bea@example.com:-'],
  'an unknown token changes nothing'
);

reset role;

select * from finish();
rollback;
