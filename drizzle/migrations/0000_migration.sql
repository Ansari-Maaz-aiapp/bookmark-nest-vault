create table public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 120),
  description text,
  color text not null default 'amber',
  parent_id uuid references public.folders(id) on delete cascade,
  is_pinned boolean not null default false,
  pin_order int not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.folders(user_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kind text not null default 'link' check (kind in ('link','article','video','repo','pdf','image','doc','note','other')),
  url text,
  normalized_url text,
  title text not null check (char_length(title) between 1 and 500),
  description text,
  content text,
  favicon_url text,
  image_url text,
  site_name text,
  domain text,
  author text,
  published_at timestamptz,
  folder_id uuid references public.folders(id) on delete set null,
  is_favorite boolean not null default false,
  is_pinned boolean not null default false,
  pin_order int not null default 0,
  reading_status text not null default 'none' check (reading_status in ('none','unread','reading','completed')),
  in_inbox boolean not null default true,
  duplicate_of uuid references public.items(id) on delete set null,
  deleted_at timestamptz,
  last_viewed_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.items(user_id, created_at desc);
create unique index items_unique_url on public.items(user_id, normalized_url)
  where normalized_url is not null and duplicate_of is null and deleted_at is null;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create table public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  primary key (item_id, tag_id)
);
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  item_id uuid references public.items(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index on public.activity_logs(user_id, created_at desc);
create table public.user_preferences (
  user_id uuid primary key default auth.uid(),
  dashboard jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.folders, public.items, public.tags, public.item_tags, public.activity_logs, public.user_preferences to authenticated;
grant all on public.folders, public.items, public.tags, public.item_tags, public.activity_logs, public.user_preferences to service_role;

alter table public.folders enable row level security;
alter table public.items enable row level security;
alter table public.tags enable row level security;
alter table public.item_tags enable row level security;
alter table public.activity_logs enable row level security;
alter table public.user_preferences enable row level security;

create policy "own folders" on public.folders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own items" on public.items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tags" on public.tags for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own item_tags" on public.item_tags for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own activity" on public.activity_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prefs" on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger items_touch before update on public.items for each row execute function public.touch_updated_at();