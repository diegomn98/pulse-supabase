create function public.mark_welcome_sent(token uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update marketing.waitlist
  set welcome_sent_at = now()
  where unsubscribe_token = mark_welcome_sent.token
    and welcome_sent_at is null;
$$;

revoke all on function public.mark_welcome_sent(uuid) from public, anon, authenticated;
grant execute on function public.mark_welcome_sent(uuid) to service_role;
