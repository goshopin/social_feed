-- Run this in your Supabase SQL editor (supabase.com → project → SQL Editor)

-- 1. Profiles (auto-populated on signup via trigger below)
create table if not exists profiles (
  id      uuid references auth.users on delete cascade primary key,
  email   text,
  name    text,
  picture text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "profiles: public read"  on profiles for select using (true);
create policy "profiles: own insert"   on profiles for insert with check (auth.uid() = id);
create policy "profiles: own update"   on profiles for update using (auth.uid() = id);

-- 2. Posts
create table if not exists posts (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users on delete cascade not null,
  content    text not null default '',
  image_url  text,
  created_at timestamptz default now()
);
alter table posts enable row level security;
create policy "posts: public read"  on posts for select using (true);
create policy "posts: own insert"   on posts for insert with check (auth.uid() = user_id);
create policy "posts: own delete"   on posts for delete using (auth.uid() = user_id);

-- 3. Likes
create table if not exists likes (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);
alter table likes enable row level security;
create policy "likes: public read"   on likes for select using (true);
create policy "likes: own manage"    on likes for all using (auth.uid() = user_id);

-- 4. Comments
create table if not exists comments (
  id         uuid default gen_random_uuid() primary key,
  post_id    uuid references posts on delete cascade not null,
  user_id    uuid references auth.users on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);
alter table comments enable row level security;
create policy "comments: public read"  on comments for select using (true);
create policy "comments: own insert"   on comments for insert with check (auth.uid() = user_id);
create policy "comments: own delete"   on comments for delete using (auth.uid() = user_id);

-- 5. Auto-create profile row when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, picture)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- 6. Storage bucket for post images (public)
insert into storage.buckets (id, name, public)
  values ('post-images', 'post-images', true)
  on conflict (id) do nothing;

create policy "post-images: public read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "post-images: auth upload" on storage.objects
  for insert with check (bucket_id = 'post-images' and auth.role() = 'authenticated');

create policy "post-images: own delete" on storage.objects
  for delete using (bucket_id = 'post-images' and auth.uid()::text = (storage.foldername(name))[1]);
