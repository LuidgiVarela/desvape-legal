create table if not exists public.desvape_launch_waitlist (
  email text primary key check (email = lower(btrim(email)) and length(email) <= 254),
  platform text check (platform is null or platform in ('iOS', 'Android')),
  created_at timestamptz not null default now(),
  consented_at timestamptz not null,
  utm jsonb,
  referrer_host text check (referrer_host is null or length(referrer_host) <= 253)
);

comment on table public.desvape_launch_waitlist is 'Opted-in DesVape launch-notification addresses. Manage access through Supabase Dashboard.';
comment on column public.desvape_launch_waitlist.utm is 'Only the five allowlisted campaign fields; no free-form visitor data.';

alter table public.desvape_launch_waitlist enable row level security;
revoke all on table public.desvape_launch_waitlist from anon, authenticated;
grant select, insert, update on table public.desvape_launch_waitlist to service_role;

create table if not exists public.desvape_waitlist_rate_limits (
  scope_hash text primary key check (length(scope_hash) = 64),
  request_count integer not null check (request_count > 0),
  window_started_at timestamptz not null default now()
);

alter table public.desvape_waitlist_rate_limits enable row level security;
revoke all on table public.desvape_waitlist_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.desvape_waitlist_rate_limits to service_role;

create or replace function public.check_desvape_waitlist_rate_limit(
  p_scope_hash text,
  p_limit integer default 5,
  p_window_seconds integer default 900
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_started timestamptz;
  v_retry integer;
begin
  if p_scope_hash !~ '^[a-f0-9]{64}$' or p_limit < 1 or p_limit > 20 or p_window_seconds < 60 or p_window_seconds > 3600 then
    raise exception 'invalid rate limit parameters';
  end if;

  -- Reap a small batch of expired buckets on each registration attempt.
  delete from public.desvape_waitlist_rate_limits as old
  where old.scope_hash in (
    select candidate.scope_hash from public.desvape_waitlist_rate_limits as candidate
    where candidate.window_started_at < v_now - interval '1 day'
    order by candidate.window_started_at limit 100
  );

  insert into public.desvape_waitlist_rate_limits as bucket (scope_hash, request_count, window_started_at)
  values (p_scope_hash, 1, v_now)
  on conflict (scope_hash) do update set
    request_count = case
      when bucket.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
      else least(bucket.request_count + 1, p_limit + 1)
    end,
    window_started_at = case
      when bucket.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
      else bucket.window_started_at
    end
  returning request_count, window_started_at into v_count, v_started;

  v_retry := greatest(1, ceil(extract(epoch from (v_started + make_interval(secs => p_window_seconds) - v_now)))::integer);
  return query select (v_count <= p_limit), v_retry;
end;
$$;

revoke all on function public.check_desvape_waitlist_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_desvape_waitlist_rate_limit(text, integer, integer) to service_role;
