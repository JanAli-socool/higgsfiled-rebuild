-- First migration. Postgres on Supabase.
-- Access: RLS on every table. Clients may only SELECT their own rows.
-- All writes go through server code using the service role, and every
-- credit change goes through the security-definer functions below.

-- ---------------------------------------------------------------- helpers

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),  -- cached balance; ledger is the source of truth
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- uploads

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path text not null unique,                       -- storage: uploads/{user_id}/{uuid}.{ext}
  mime text not null check (mime in ('image/png','image/jpeg','image/webp')),
  bytes integer not null check (bytes > 0 and bytes <= 10485760),
  width integer,
  height integer,
  created_at timestamptz not null default now()
);
create index uploads_user_created on public.uploads (user_id, created_at desc);

-- ---------------------------------------------------------------- generations

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null default gen_random_uuid(),         -- "4 outputs" = 4 rows, one batch
  parent_id uuid references public.generations(id) on delete set null,  -- Recreate / Reference / Animate lineage
  kind text not null check (kind in ('image','video')),
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','failed','cancelled')),
  model_id text not null,                                   -- key into the model registry in code
  prompt text not null check (char_length(prompt) between 1 and 2000),
  params jsonb not null default '{}',                       -- aspect, duration_s, preset_id, camera_moves[], seed
  input_image_path text,                                    -- storage path of reference / start frame
  provider text not null default 'fal',
  provider_request_id text unique,
  output_path text,                                         -- storage: outputs/{user_id}/{id}.{ext}
  output_width integer,
  output_height integer,
  output_duration_s numeric(5,2),
  cost_credits integer not null check (cost_credits >= 0),
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  deleted_at timestamptz,
  search tsvector generated always as (to_tsvector('english', prompt)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint output_when_succeeded check (status <> 'succeeded' or output_path is not null)
);
create trigger generations_updated_at before update on public.generations
  for each row execute function public.set_updated_at();

create index generations_feed on public.generations (user_id, created_at desc) where deleted_at is null;
create index generations_feed_kind on public.generations (user_id, kind, created_at desc) where deleted_at is null;
create index generations_parent on public.generations (parent_id);
create index generations_batch on public.generations (batch_id);
create index generations_active on public.generations (status, created_at) where status in ('queued','running');
create index generations_search on public.generations using gin (search);

-- ---------------------------------------------------------------- credit ledger

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('signup_grant','purchase','generation','refund','adjustment')),
  generation_id uuid references public.generations(id) on delete set null,
  stripe_session_id text,
  created_at timestamptz not null default now()
);
create index credit_ledger_user on public.credit_ledger (user_id, created_at desc);
create index credit_ledger_generation on public.credit_ledger (generation_id);

-- Idempotency: each of these can happen at most once, however many times a webhook or retry fires.
create unique index ledger_one_signup on public.credit_ledger (user_id) where reason = 'signup_grant';
create unique index ledger_one_charge on public.credit_ledger (generation_id) where reason = 'generation';
create unique index ledger_one_refund on public.credit_ledger (generation_id) where reason = 'refund';
create unique index ledger_one_purchase on public.credit_ledger (stripe_session_id) where reason = 'purchase';

-- ---------------------------------------------------------------- credit functions (service role only)

-- Charge for a generation. One conditional UPDATE, so two parallel requests can't overspend.
create or replace function public.charge_generation(p_user uuid, p_generation uuid, p_amount integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_balance integer;
begin
  update public.profiles set credits = credits - p_amount
    where id = p_user and credits >= p_amount
    returning credits into v_balance;
  if not found then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;
  insert into public.credit_ledger (user_id, delta, reason, generation_id)
    values (p_user, -p_amount, 'generation', p_generation);
  return v_balance;
end $$;

-- Refund a generation. Safe to call any number of times.
create or replace function public.refund_generation(p_generation uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_amount integer;
begin
  select user_id, -delta into v_user, v_amount
    from public.credit_ledger where generation_id = p_generation and reason = 'generation';
  if not found then return; end if;
  insert into public.credit_ledger (user_id, delta, reason, generation_id)
    values (v_user, v_amount, 'refund', p_generation)
    on conflict (generation_id) where reason = 'refund' do nothing;
  if found then
    update public.profiles set credits = credits + v_amount where id = v_user;
  end if;
end $$;

-- Grant credits for signup or a Stripe purchase. Safe to call any number of times.
create or replace function public.grant_credits(p_user uuid, p_amount integer, p_reason text, p_stripe_session text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.credit_ledger (user_id, delta, reason, stripe_session_id)
    values (p_user, p_amount, p_reason, p_stripe_session)
    on conflict do nothing;
  if found then
    update public.profiles set credits = credits + p_amount where id = p_user;
  end if;
end $$;

-- Create a batch of N generations and charge for all of them, or none (one transaction).
create or replace function public.create_generations(
  p_user uuid, p_count integer, p_kind text, p_model text, p_prompt text, p_params jsonb,
  p_input_image_path text, p_parent uuid, p_cost_each integer
) returns setof uuid language plpgsql security definer set search_path = '' as $$
declare v_batch uuid := gen_random_uuid(); v_id uuid; i integer;
begin
  if p_count < 1 or p_count > 4 then raise exception 'bad_count'; end if;
  if p_parent is not null and not exists
    (select 1 from public.generations where id = p_parent and user_id = p_user) then
    raise exception 'bad_parent';
  end if;
  for i in 1..p_count loop
    insert into public.generations (user_id, batch_id, parent_id, kind, model_id, prompt, params, input_image_path, cost_credits)
      values (p_user, v_batch, p_parent, p_kind, p_model, p_prompt, p_params, p_input_image_path, p_cost_each)
      returning id into v_id;
    perform public.charge_generation(p_user, v_id, p_cost_each);
    return next v_id;
  end loop;
end $$;

revoke execute on function public.create_generations(uuid, integer, text, text, text, jsonb, text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.charge_generation(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.refund_generation(uuid) from public, anon, authenticated;
revoke execute on function public.grant_credits(uuid, integer, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- new user → profile + starter credits

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  -- Guests ("try without an account") get a smaller grant so a public demo can't be farmed.
  perform public.grant_credits(new.id, case when new.is_anonymous then 30 else 100 end, 'signup_grant');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.uploads enable row level security;
alter table public.generations enable row level security;
alter table public.credit_ledger enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own uploads" on public.uploads for select to authenticated using (user_id = (select auth.uid()));
create policy "own generations" on public.generations for select to authenticated using (user_id = (select auth.uid()));
create policy "own ledger" on public.credit_ledger for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: clients can't write. The server uses the service role.

-- Live status updates in the feed (Realtime respects the select policy above).
alter publication supabase_realtime add table public.generations, public.profiles;

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false), ('outputs', 'outputs', false);

create policy "read own files" on storage.objects for select to authenticated
  using (bucket_id in ('uploads','outputs') and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Uploads go through server-issued signed upload URLs; outputs are written by the server.
