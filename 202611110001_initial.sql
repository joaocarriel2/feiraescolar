-- MARGEM demo platform: Supabase schema and RLS baseline.
-- Run only in the new Supabase project after reviewing the setup notes.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9-]{3,32}$'),
  display_name text not null default 'Estudante' check (char_length(display_name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 400),
  interests text[] not null default '{}',
  avatar_path text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;
revoke all on public.admin_roles from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles r where r.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.create_student_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    'estudante-' || substr(replace(new.id::text, '-', ''), 1, 16),
    'Estudante'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.create_student_profile();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,100}$'),
  kind text not null check (kind in ('article', 'science_project', 'technology_project', 'experiment', 'report', 'research')),
  title text not null check (char_length(title) between 3 and 180),
  subtitle text not null default '' check (char_length(subtitle) <= 300),
  public_author_name text not null default 'Estudante colaborador' check (char_length(public_author_name) between 1 and 80),
  category text not null check (char_length(category) between 1 and 80),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb
    check (octet_length(content::text) <= 1000000),
  references_list jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'rejected', 'hidden')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publications_public_feed_idx
  on public.publications (published_at desc)
  where status = 'published';
create index if not exists publications_author_idx on public.publications (author_id, updated_at desc);
create index if not exists publications_category_idx on public.publications (category, status);

drop trigger if exists publications_set_updated_at on public.publications;
create trigger publications_set_updated_at
  before update on public.publications
  for each row execute function public.set_updated_at();

create or replace function public.set_publication_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if tg_op = 'INSERT' then
      new.published_at = now();
    elsif old.status is distinct from 'published' then
      new.published_at = now();
    end if;
  else
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists publications_set_publication_date on public.publications;
create trigger publications_set_publication_date
  before insert or update of status on public.publications
  for each row execute function public.set_publication_date();

create table if not exists public.publication_media (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications (id) on delete cascade,
  storage_path text not null unique,
  media_kind text not null check (media_kind in ('image', 'video', 'file')),
  alt_text text not null default '' check (char_length(alt_text) <= 250),
  caption text not null default '' check (char_length(caption) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('privacy', 'inappropriate', 'copyright', 'safety', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.publications enable row level security;
alter table public.publication_media enable row level security;
alter table public.content_reports enable row level security;

revoke all on public.profiles, public.publications, public.publication_media, public.content_reports
  from anon, authenticated; grant select on public.profiles to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (handle, display_name, bio, interests, avatar_path, is_public) on public.profiles to authenticated;
grant select on public.publications to anon, authenticated;
grant insert, delete on public.publications to authenticated;
grant update (slug, kind, title, subtitle, public_author_name, category, content, references_list, tags, cover_path, status)
  on public.publications to authenticated;
grant select on public.publication_media to anon, authenticated;
grant insert, update, delete on public.publication_media to authenticated;
grant select, insert, update on public.content_reports to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to anon, authenticated
  using (is_public or id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists publications_read on public.publications;
create policy publications_read on public.publications for select to anon, authenticated
  using (status = 'published' or author_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists publications_create on public.publications;
create policy publications_create on public.publications for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status in ('draft', 'pending')
  );
drop policy if exists publications_update_owner_or_admin on public.publications;
create policy publications_update_owner_or_admin on public.publications for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (
    (select public.is_admin())
    or (author_id = (select auth.uid()) and status in ('draft', 'pending'))
  );
drop policy if exists publications_delete_owner_or_admin on public.publications;
create policy publications_delete_owner_or_admin on public.publications for delete to authenticated
  using (
    (select public.is_admin())
    or (author_id = (select auth.uid()) and status in ('draft', 'pending', 'rejected'))
  );

drop policy if exists media_read on public.publication_media;
create policy media_read on public.publication_media for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.publications p
      where p.id = publication_id
        and (p.status = 'published' or p.author_id = (select auth.uid()))
    )
  );
drop policy if exists media_create on public.publication_media;
create policy media_create on public.publication_media for insert to authenticated
  with check (
    exists (
      select 1 from public.publications p
      where p.id = publication_id and p.author_id = (select auth.uid())
        and p.status in ('draft', 'pending')
    )
  );
drop policy if exists media_update_owner_or_admin on public.publication_media;
create policy media_update_owner_or_admin on public.publication_media for update to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.publications p
      where p.id = publication_id and p.author_id = (select auth.uid())
        and p.status in ('draft', 'pending')
    )
  )
  with check (
    (select public.is_admin())
    or exists (
      select 1 from public.publications p
      where p.id = publication_id and p.author_id = (select auth.uid())
        and p.status in ('draft', 'pending')
    )
  );
drop policy if exists media_delete_owner_or_admin on public.publication_media;
create policy media_delete_owner_or_admin on public.publication_media for delete to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.publications p
      where p.id = publication_id and p.author_id = (select auth.uid())
        and p.status in ('draft', 'pending', 'rejected')
    )
  );

drop policy if exists reports_read_own_or_admin on public.content_reports;
create policy reports_read_own_or_admin on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists reports_create_authenticated on public.content_reports;
create policy reports_create_authenticated on public.content_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (select 1 from public.publications p where p.id = publication_id and p.status = 'published')
  );
drop policy if exists reports_update_admin on public.content_reports;
create policy reports_update_admin on public.content_reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Create these private buckets in Supabase Storage using the limits in ../README.md.
-- Storage policies below only allow owner uploads to their own draft/pending content.
drop policy if exists "published or owner publication media read" on storage.objects;
create policy "published or owner publication media read" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'publication-media'
    and (
      (select public.is_admin())
      or exists (
        select 1 from public.publications p
        where p.id::text = split_part(name, '/', 2)
          and p.author_id::text = split_part(name, '/', 1)
          and (p.status = 'published' or p.author_id = (select auth.uid()))
      )
    )
  );
drop policy if exists "owner uploads publication media" on storage.objects;
create policy "owner uploads publication media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'publication-media'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and case when coalesce((metadata->>'size') ~ '^[0-9]+$', false)
      then (metadata->>'size')::bigint <= 52428800 else false end
    and coalesce(metadata->>'mimetype', '') in (
      'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'
    )
    and exists (
      select 1 from public.publications p
      where p.id::text = split_part(name, '/', 2)
        and p.author_id = (select auth.uid())
        and p.status in ('draft', 'pending')
    )
  );
drop policy if exists "owner updates publication media" on storage.objects;
create policy "owner updates publication media" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'publication-media'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and exists (
      select 1 from public.publications p
      where p.id::text = split_part(name, '/', 2)
        and p.author_id = (select auth.uid())
        and p.status in ('draft', 'pending')
    )
  )
  with check (
    bucket_id = 'publication-media'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and case when coalesce((metadata->>'size') ~ '^[0-9]+$', false)
      then (metadata->>'size')::bigint <= 52428800 else false end
    and coalesce(metadata->>'mimetype', '') in (
      'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'
    )
    and exists (
      select 1 from public.publications p
      where p.id::text = split_part(name, '/', 2)
        and p.author_id = (select auth.uid())
        and p.status in ('draft', 'pending')
    )
  );
drop policy if exists "owner deletes publication media" on storage.objects;
create policy "owner deletes publication media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'publication-media'
    and (
      (select public.is_admin())
      or (
        split_part(name, '/', 1) = (select auth.uid())::text
        and exists (
          select 1 from public.publications p
          where p.id::text = split_part(name, '/', 2)
            and p.author_id = (select auth.uid())
            and p.status in ('draft', 'pending', 'rejected')
        )
      )
    )
  );

drop policy if exists "public profile avatar read" on storage.objects;
create policy "public profile avatar read" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'profile-avatars'
    and (
      (select public.is_admin())
      or split_part(name, '/', 1) = (select auth.uid())::text
      or exists (
        select 1 from public.profiles p
        where p.avatar_path = name and p.is_public
      )
    )
  );
drop policy if exists "owner uploads profile avatar" on storage.objects;
create policy "owner uploads profile avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and case when coalesce((metadata->>'size') ~ '^[0-9]+$', false)
      then (metadata->>'size')::bigint <= 5242880 else false end
    and coalesce(metadata->>'mimetype', '') in ('image/jpeg', 'image/png', 'image/webp')
  );
drop policy if exists "owner updates profile avatar" on storage.objects;
create policy "owner updates profile avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-avatars' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (
    bucket_id = 'profile-avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and case when coalesce((metadata->>'size') ~ '^[0-9]+$', false)
      then (metadata->>'size')::bigint <= 5242880 else false end
    and coalesce(metadata->>'mimetype', '') in ('image/jpeg', 'image/png', 'image/webp')
  );
drop policy if exists "owner deletes profile avatar" on storage.objects;
create policy "owner deletes profile avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (split_part(name, '/', 1) = (select auth.uid())::text or (select public.is_admin()))
  );
