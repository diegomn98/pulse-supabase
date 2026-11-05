begin;
select plan(31);

select has_function('public', 'join_waitlist', array['text', 'text[]', 'text'], 'public.join_waitlist exists');
select has_function('public', 'unsubscribe_waitlist', array['uuid'], 'public.unsubscribe_waitlist exists');
select isnt_definer('public', 'join_waitlist', array['text', 'text[]', 'text'], 'join_waitlist is security invoker');
select isnt_definer('public', 'unsubscribe_waitlist', array['uuid'], 'unsubscribe_waitlist is security invoker');

select function_privs_are('public', 'join_waitlist', array['text', 'text[]', 'text'], 'public', array[]::text[], 'public cannot execute join_waitlist');
select function_privs_are('public', 'join_waitlist', array['text', 'text[]', 'text'], 'anon', array[]::text[], 'anon cannot execute join_waitlist');
select function_privs_are('public', 'join_waitlist', array['text', 'text[]', 'text'], 'authenticated', array[]::text[], 'authenticated cannot execute join_waitlist');
select function_privs_are('public', 'join_waitlist', array['text', 'text[]', 'text'], 'service_role', array['EXECUTE'], 'service_role can execute join_waitlist');
select function_privs_are('public', 'unsubscribe_waitlist', array['uuid'], 'public', array[]::text[], 'public cannot execute unsubscribe_waitlist');
select function_privs_are('public', 'unsubscribe_waitlist', array['uuid'], 'anon', array[]::text[], 'anon cannot execute unsubscribe_waitlist');
select function_privs_are('public', 'unsubscribe_waitlist', array['uuid'], 'authenticated', array[]::text[], 'authenticated cannot execute unsubscribe_waitlist');
select function_privs_are('public', 'unsubscribe_waitlist', array['uuid'], 'service_role', array['EXECUTE'], 'service_role can execute unsubscribe_waitlist');

insert into marketing.waitlist (email, platforms, source)
values ('ana@example.com', array['ios'], 'hero');

set local role anon;
select throws_ok(
  $$ select * from public.join_waitlist('eve@example.com', array['ios'], 'hero') $$,
  '42501', null, 'anon cannot call join_waitlist'
);
select throws_ok(
  $$ select public.unsubscribe_waitlist((select gen_random_uuid())) $$,
  '42501', null, 'anon cannot call unsubscribe_waitlist'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select * from public.join_waitlist('eve@example.com', array['ios'], 'hero') $$,
  '42501', null, 'authenticated cannot call join_waitlist'
);
select throws_ok(
  $$ select public.unsubscribe_waitlist((select gen_random_uuid())) $$,
  '42501', null, 'authenticated cannot call unsubscribe_waitlist'
);
reset role;

select is(
  (select count(*) from marketing.waitlist where email = 'eve@example.com'),
  0::bigint,
  'rejected calls leave no rows behind'
);

set local role service_role;

select is(
  (select send_welcome from public.join_waitlist(' Bea@Example.com ', array['ios', 'web'], 'hero')),
  true,
  'a new email asks for the welcome email'
);
select is(
  (select platforms || source from marketing.waitlist where email = 'bea@example.com'),
  array['ios', 'web', 'hero'],
  'a new email is stored normalized with its platforms and source'
);
select is(
  (select unsubscribe_token from public.join_waitlist('bea@example.com', array['android'], 'footer')),
  (select unsubscribe_token from marketing.waitlist where email = 'bea@example.com'),
  'an existing email returns its unsubscribe token'
);
select is(
  (select platforms || source from marketing.waitlist where email = 'bea@example.com'),
  array['android', 'hero'],
  'an existing email gets its platforms replaced and keeps its source'
);
select is(
  (select count(*) from marketing.waitlist where email = 'bea@example.com'),
  1::bigint,
  'an existing email does not create a second row'
);
select is(
  (select send_welcome from public.join_waitlist('bea@example.com', array['android'], 'footer')),
  true,
  'an existing email still asks for the welcome email while it has not been sent'
);

update marketing.waitlist set welcome_sent_at = now() where email = 'bea@example.com';

select is(
  (select send_welcome from public.join_waitlist('bea@example.com', array['ios'], 'hero')),
  false,
  'an email that already got the welcome email does not ask for it again'
);

select lives_ok(
  $$ select public.unsubscribe_waitlist((select unsubscribe_token from marketing.waitlist where email = 'bea@example.com')) $$,
  'unsubscribe_waitlist accepts a valid token'
);
select isnt(
  (select unsubscribed_at from marketing.waitlist where email = 'bea@example.com'),
  null,
  'a valid token marks the email as unsubscribed'
);

update marketing.waitlist set unsubscribed_at = '2026-01-01' where email = 'bea@example.com';
select public.unsubscribe_waitlist((select unsubscribe_token from marketing.waitlist where email = 'bea@example.com'));

select is(
  (select unsubscribed_at from marketing.waitlist where email = 'bea@example.com'),
  '2026-01-01'::timestamptz,
  'unsubscribing twice keeps the first date'
);

select lives_ok(
  $$ select public.unsubscribe_waitlist('00000000-0000-0000-0000-000000000000') $$,
  'an unknown token does not raise an error'
);
select is(
  (select count(*) from marketing.waitlist where unsubscribed_at is not null),
  1::bigint,
  'an unknown token changes nothing'
);

select is(
  (select send_welcome from public.join_waitlist('bea@example.com', array['web'], 'footer')),
  false,
  'rejoining after unsubscribing does not resend the welcome email'
);
select is(
  (select unsubscribed_at from marketing.waitlist where email = 'bea@example.com'),
  null,
  'rejoining after unsubscribing reactivates the email'
);

reset role;

select * from finish();
rollback;
