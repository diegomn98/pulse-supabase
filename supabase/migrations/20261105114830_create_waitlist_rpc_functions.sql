create function public.join_waitlist(email text, platforms text[], source text)
returns table (send_welcome boolean, unsubscribe_token uuid)
language sql
security invoker
set search_path = ''
as $$
  insert into marketing.waitlist as w (email, platforms, source)
  values (lower(btrim(join_waitlist.email)), join_waitlist.platforms, join_waitlist.source)
  on conflict (email) do update
    set platforms = excluded.platforms,
        unsubscribed_at = null
  returning w.welcome_sent_at is null, w.unsubscribe_token;
$$;

create function public.unsubscribe_waitlist(token uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update marketing.waitlist
  set unsubscribed_at = now()
  where unsubscribe_token = unsubscribe_waitlist.token
    and unsubscribed_at is null;
$$;

revoke all on function public.join_waitlist(text, text[], text) from public, anon, authenticated;
revoke all on function public.unsubscribe_waitlist(uuid) from public, anon, authenticated;
grant execute on function public.join_waitlist(text, text[], text) to service_role;
grant execute on function public.unsubscribe_waitlist(uuid) to service_role;
