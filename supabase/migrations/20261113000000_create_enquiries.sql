-- Enquiries submitted through the website (D-030).
-- Written only by the Go API using the server-side secret key; never readable from browsers.

create table public.enquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 2 and 80),
  -- Normalised by the API to 10 digits starting 2-9 (D-027).
  phone       text not null check (phone ~ '^[2-9][0-9]{9}$'),
  intent      text not null check (intent in ('general', 'product', 'support', 'trade')),
  model       text check (model is null or model ~ '^[a-z0-9-]{1,64}$'),
  message     text not null default '' check (char_length(message) <= 1000)
);

comment on table public.enquiries is 'Website enquiries. Personal data: deleted after 90 days by cron job delete-old-enquiries.';

create index enquiries_created_at_idx on public.enquiries (created_at);

-- Lock it down: RLS on with no policies, and no table privileges for browser roles.
alter table public.enquiries enable row level security;
revoke all on public.enquiries from anon, authenticated;

-- Retention: delete enquiries older than 90 days, daily at 02:30 UTC.
create extension if not exists pg_cron;
select cron.schedule(
  'delete-old-enquiries',
  '30 2 * * *',
  $$delete from public.enquiries where created_at < now() - interval '90 days'$$
);
