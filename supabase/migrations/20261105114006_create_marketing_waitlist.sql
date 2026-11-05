create schema marketing;

revoke all on schema marketing from public, anon, authenticated;
grant usage on schema marketing to service_role;

create function marketing.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function marketing.set_updated_at() from public, anon, authenticated;

create table marketing.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  platforms text[] not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  welcome_sent_at timestamptz,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  unsubscribed_at timestamptz,
  constraint waitlist_email_normalized check (email = lower(btrim(email))),
  constraint waitlist_email_length check (char_length(email) between 3 and 254),
  constraint waitlist_platforms_allowed check (platforms <@ array['ios', 'android', 'web']),
  constraint waitlist_source_allowed check (source in ('hero', 'footer'))
);

alter table marketing.waitlist enable row level security;

revoke all on table marketing.waitlist from public, anon, authenticated;
grant select, insert, update on table marketing.waitlist to service_role;

create trigger waitlist_set_updated_at
before update on marketing.waitlist
for each row execute function marketing.set_updated_at();
