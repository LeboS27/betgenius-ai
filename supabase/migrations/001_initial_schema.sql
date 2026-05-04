-- BetGenius AI — Initial Schema
-- Run this in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table profiles (
  id uuid references auth.users primary key,
  full_name text,
  email text not null,
  phone text,
  phone_verified boolean default false,
  email_verified boolean default false,
  tier text default 'free' check (tier in ('free','premium','pro')),
  is_admin boolean default false,
  onboarding_complete boolean default false,
  favourite_leagues jsonb default '[]',
  preferred_markets jsonb default '["Match Result","Both Teams To Score","Total Goals"]',
  notification_preferences jsonb default '{"match_alerts":true,"expiry_reminders":true,"weekly_digest":true}',
  theme text default 'dark',
  lite_mode boolean default false,
  analyses_today integer default 0,
  analyses_reset timestamp with time zone default now(),
  session_token text,
  is_banned boolean default false,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  tier text not null check (tier in ('premium','pro')),
  status text default 'active' check (status in ('active','expired','cancelled')),
  started_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  paynow_reference text,
  activated_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table subscriptions enable row level security;
create policy "Users can view own subscriptions" on subscriptions for select using (auth.uid() = user_id);

-- ============================================================
-- PENDING PAYMENTS
-- ============================================================
create table pending_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  tier text not null check (tier in ('premium','pro')),
  amount numeric not null,
  paynow_reference text,
  submitted_at timestamp with time zone default now(),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamp with time zone
);

alter table pending_payments enable row level security;
create policy "Users can view own payments" on pending_payments for select using (auth.uid() = user_id);
create policy "Users can insert payments" on pending_payments for insert with check (auth.uid() = user_id);

-- ============================================================
-- MATCHES
-- ============================================================
create table matches (
  id text primary key,  -- API-Football fixture ID as string
  home_team text not null,
  home_team_id integer,
  home_team_logo text,
  away_team text not null,
  away_team_id integer,
  away_team_logo text,
  competition text not null,
  competition_id integer,
  stage text,
  kickoff_utc timestamp with time zone not null,
  venue text,
  status text default 'scheduled' check (status in ('scheduled','live','finished')),
  live_score jsonb,
  match_minute integer,
  h2h jsonb,
  standings jsonb,
  lineups_available boolean default false,
  odds jsonb,
  last_odds_update timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table matches enable row level security;
create policy "Anyone can view matches" on matches for select using (true);

create index idx_matches_kickoff on matches(kickoff_utc);
create index idx_matches_status on matches(status);
create index idx_matches_competition_id on matches(competition_id);

-- ============================================================
-- CACHED ANALYSES
-- ============================================================
create table cached_analyses (
  id uuid primary key default uuid_generate_v4(),
  match_id text references matches(id) on delete cascade,
  analysis_type text not null check (analysis_type in ('quick_pick','full_report','full_expert_report')),
  report jsonb,
  cache_stale boolean default false,
  generated_at timestamp with time zone default now(),
  regeneration_count integer default 0,
  odds_snapshot jsonb,
  unique(match_id, analysis_type)
);

alter table cached_analyses enable row level security;
create policy "Authenticated users can view cached analyses" on cached_analyses for select using (auth.role() = 'authenticated');

-- ============================================================
-- PREDICTION HISTORY
-- ============================================================
create table prediction_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  match_id text references matches(id) on delete set null,
  analysis_type text check (analysis_type in ('quick_pick','full_report','full_expert_report')),
  report jsonb,
  viewed_at timestamp with time zone default now()
);

alter table prediction_history enable row level security;
create policy "Users can view own history" on prediction_history for select using (auth.uid() = user_id);
create policy "Users can insert own history" on prediction_history for insert with check (auth.uid() = user_id);

create index idx_prediction_history_user on prediction_history(user_id, viewed_at desc);

-- ============================================================
-- REFERRALS
-- ============================================================
create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_id uuid references profiles(id) on delete cascade,
  referred_user_id uuid references profiles(id) on delete cascade,
  signed_up_at timestamp with time zone default now(),
  converted_at timestamp with time zone,
  rewarded boolean default false,
  reward_type text
);

alter table referrals enable row level security;
create policy "Users can view own referrals" on referrals for select using (auth.uid() = referrer_id);

-- ============================================================
-- NEWS CACHE
-- ============================================================
create table news_cache (
  id uuid primary key default uuid_generate_v4(),
  team_name text unique not null,
  headlines jsonb default '[]',
  cached_at timestamp with time zone default now()
);

alter table news_cache enable row level security;
create policy "Authenticated users can view news" on news_cache for select using (auth.role() = 'authenticated');

-- ============================================================
-- PLATFORM CONFIG
-- ============================================================
create table platform_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

alter table platform_config enable row level security;
create policy "Admins can manage config" on platform_config using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "All authenticated users can read config" on platform_config for select using (auth.role() = 'authenticated');

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default platform config
insert into platform_config (key, value) values
  ('premium_price_usd', '2.00'),
  ('pro_price_usd', '5.00'),
  ('free_analyses_per_day', '2');

-- Seed admin account (replace with your actual user ID after first signup)
-- update profiles set is_admin = true, tier = 'pro' where email = 'lebohangsbeta20@gmail.com';
