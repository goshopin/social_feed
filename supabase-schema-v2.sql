-- Run after supabase-schema.sql (or in the same SQL editor session)

-- Scheduled posts
create table if not exists scheduled_posts (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  content      text not null default '',
  image_url    text,
  platforms    text[] not null default '{}',
  scheduled_at timestamptz not null,
  status       text not null default 'scheduled', -- scheduled | published | failed
  results      jsonb default '{}',
  created_at   timestamptz default now()
);
alter table scheduled_posts enable row level security;
create policy "scheduled_posts: own select" on scheduled_posts for select using (auth.uid() = user_id);
create policy "scheduled_posts: own insert" on scheduled_posts for insert with check (auth.uid() = user_id);
create policy "scheduled_posts: own update" on scheduled_posts for update using (auth.uid() = user_id);
create policy "scheduled_posts: own delete" on scheduled_posts for delete using (auth.uid() = user_id);
-- Service role (used by API cron) bypasses RLS automatically, no extra policy needed.

create index if not exists idx_scheduled_posts_due
  on scheduled_posts (status, scheduled_at)
  where status = 'scheduled';

-- Social platform tokens (per user, per platform)
create table if not exists social_tokens (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  platform     text not null,        -- twitter | instagram | facebook | threads
  access_token text not null,
  token_data   jsonb default '{}',   -- page_id, ig_user_id, threads_user_id, etc.
  created_at   timestamptz default now(),
  unique (user_id, platform)
);
alter table social_tokens enable row level security;
create policy "social_tokens: own all" on social_tokens for all using (auth.uid() = user_id);
