-- =============================================================================
-- MAAT v2 - database migration (run once in Supabase > SQL Editor)
-- Safe to re-run. Does NOT delete any existing data.
-- =============================================================================

-- 1) Audit summaries ----------------------------------------------------------
create table if not exists public.compliance_audits (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  company_name     text,
  policy_filename  text,
  compliance_score numeric,
  risk_level       text,
  audit_result     jsonb,
  report_html      text,
  status           text
);

-- link each audit to the user who ran it
alter table public.compliance_audits add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.compliance_audits add column if not exists created_at timestamptz not null default now();
-- old n8n versions saved audit_result as text (JSON.stringify). Convert to jsonb when possible.
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'compliance_audits' and column_name = 'audit_result') = 'text' then
    begin
      alter table public.compliance_audits
        alter column audit_result type jsonb using nullif(audit_result, '')::jsonb;
    exception when others then
      raise notice 'audit_result kept as text (some old rows are not valid JSON): %', sqlerrm;
    end;
  end if;
end $$;
create index if not exists compliance_audits_user_created_idx on public.compliance_audits (user_id, created_at desc);

-- Row Level Security: a user can READ only his own audits. Nobody can write from the browser.
-- Inserts come only from the maat-proxy Edge Function (service role bypasses RLS).
alter table public.compliance_audits enable row level security;
drop policy if exists "audits_select_own" on public.compliance_audits;
create policy "audits_select_own" on public.compliance_audits
  for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.compliance_audits from anon, authenticated;
revoke all on public.compliance_audits from anon;

-- Privacy: old rows may contain full HTML reports (policy quotes). Uncomment to wipe them.
-- update public.compliance_audits set report_html = null, policy_filename = null;

-- 2) Usage log + quota ---------------------------------------------------------
create table if not exists public.maat_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('audit', 'breach')),
  created_at timestamptz not null default now()
);
create index if not exists maat_usage_user_created_idx on public.maat_usage (user_id, created_at desc);
create index if not exists maat_usage_kind_created_idx on public.maat_usage (kind, created_at desc);
alter table public.maat_usage enable row level security;   -- no policies = no browser access at all
revoke all on public.maat_usage from anon, authenticated;

-- Atomic "check and take one" (a per-user lock prevents two parallel requests from both passing).
create or replace function public.maat_take_quota(
  p_user uuid, p_kind text, p_per_minute int, p_per_day int, p_global_per_day int
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  n_min int; n_day int; n_global int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  select count(*) into n_min from maat_usage
    where user_id = p_user and kind = p_kind and created_at > now() - interval '1 minute';
  select count(*) into n_day from maat_usage
    where user_id = p_user and kind = p_kind and created_at > now() - interval '1 day';
  select count(*) into n_global from maat_usage
    where kind = p_kind and created_at > now() - interval '1 day';
  if n_min >= p_per_minute or n_day >= p_per_day or n_global >= p_global_per_day then
    return false;
  end if;
  insert into maat_usage (user_id, kind) values (p_user, p_kind);
  return true;
end;
$$;
revoke all on function public.maat_take_quota(uuid, text, int, int, int) from public, anon, authenticated;
grant execute on function public.maat_take_quota(uuid, text, int, int, int) to service_role;

-- housekeeping: keep 90 days of usage rows (call manually or from a scheduled job)
create or replace function public.maat_usage_cleanup() returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from maat_usage where created_at < now() - interval '90 days';
$$;
revoke all on function public.maat_usage_cleanup() from public, anon, authenticated;

-- 3) Legal knowledge base: block public reads ----------------------------------
-- n8n reads it with the service role key, so RLS without policies is enough.
-- WARNING: if the n8n Supabase credential uses the ANON key, search will return nothing after this.
--          Use the service_role (secret) key in n8n only - never in the frontend.
do $$
begin
  if to_regclass('public.legal_documents_vectors') is not null then
    execute 'alter table public.legal_documents_vectors enable row level security';
    execute 'revoke all on public.legal_documents_vectors from anon, authenticated';
  end if;
end $$;
