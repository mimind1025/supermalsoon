-- ============================================================
-- 슈퍼말순 관리자 CMS 전체 스키마 (여러 번 실행해도 안전합니다)
-- ============================================================

-- 1) contents 테이블 보강
alter table contents add column if not exists is_published boolean not null default true;
alter table contents add column if not exists download_count integer not null default 0;

alter table contents enable row level security;

drop policy if exists "public can read contents" on contents;
drop policy if exists "anon can read published contents" on contents;
drop policy if exists "authenticated can read all contents" on contents;
drop policy if exists "authenticated can insert contents" on contents;
drop policy if exists "authenticated can update contents" on contents;
drop policy if exists "authenticated can delete contents" on contents;

create policy "anon can read published contents"
on contents for select to anon
using (is_published = true);

create policy "authenticated can read all contents"
on contents for select to authenticated
using (true);

create policy "authenticated can insert contents"
on contents for insert to authenticated
with check (true);

create policy "authenticated can update contents"
on contents for update to authenticated
using (true) with check (true);

create policy "authenticated can delete contents"
on contents for delete to authenticated
using (true);

-- 2) site_settings: 홈페이지 기본 설정
create table if not exists site_settings (
  id text primary key default 'main',
  brand_name text,
  hero_badge text,
  hero_title text,
  hero_desc text,
  hero_image_url text,
  hero_cta_label text,
  category_section_title text,
  category_section_sub text,
  content_section_title text,
  content_section_sub text,
  guestbook_title text,
  guestbook_sub text,
  footer_text text,
  youtube_url text,
  kakao_channel_url text,
  updated_at timestamptz default now()
);

alter table site_settings enable row level security;

drop policy if exists "anon can read site_settings" on site_settings;
drop policy if exists "authenticated can manage site_settings" on site_settings;

create policy "anon can read site_settings"
on site_settings for select to anon
using (true);

create policy "authenticated can manage site_settings"
on site_settings for all to authenticated
using (true) with check (true);

-- 3) categories: 카테고리 카드 3종
create table if not exists categories (
  id text primary key,
  title text,
  description text,
  image_url text,
  sort_order integer default 0
);

alter table categories enable row level security;

drop policy if exists "anon can read categories" on categories;
drop policy if exists "authenticated can manage categories" on categories;

create policy "anon can read categories"
on categories for select to anon
using (true);

create policy "authenticated can manage categories"
on categories for all to authenticated
using (true) with check (true);

insert into categories (id, title, description, sort_order) values
  ('holiday', '명절 이모티콘', '명절마다 꺼내쓰는 말순이 인사 모음', 0),
  ('gif', '말순이 일상 움짤', '카톡에 슬쩍 던지기 좋은 말순이 리액션', 1),
  ('video', '말순이 영상', '고화질로 소장하는 말순이 짧은 영상', 2)
on conflict (id) do nothing;

-- 4) guestbook: 방명록 (숨김 처리 지원)
create table if not exists guestbook (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  nickname text not null,
  message text not null,
  is_hidden boolean not null default false
);

alter table guestbook enable row level security;

drop policy if exists "anon can read visible guestbook" on guestbook;
drop policy if exists "authenticated can read all guestbook" on guestbook;
drop policy if exists "anon can post guestbook" on guestbook;
drop policy if exists "authenticated can update guestbook" on guestbook;
drop policy if exists "authenticated can delete guestbook" on guestbook;

create policy "anon can read visible guestbook"
on guestbook for select to anon
using (is_hidden = false);

create policy "authenticated can read all guestbook"
on guestbook for select to authenticated
using (true);

create policy "anon can post guestbook"
on guestbook for insert to anon
with check (true);

create policy "authenticated can update guestbook"
on guestbook for update to authenticated
using (true) with check (true);

create policy "authenticated can delete guestbook"
on guestbook for delete to authenticated
using (true);

-- 5) visits: 방문자 통계 (관리자만 조회 가능)
create table if not exists visits (
  id bigint generated always as identity primary key,
  created_at timestamptz default now()
);

alter table visits enable row level security;

drop policy if exists "anon can log visit" on visits;
drop policy if exists "authenticated can read visits" on visits;

create policy "anon can log visit"
on visits for insert to anon
with check (true);

create policy "authenticated can read visits"
on visits for select to authenticated
using (true);

-- 6) downloads: 다운로드 통계 (관리자만 조회 가능)
create table if not exists downloads (
  id bigint generated always as identity primary key,
  created_at timestamptz default now(),
  content_id bigint
);

alter table downloads enable row level security;

drop policy if exists "anon can log download" on downloads;
drop policy if exists "authenticated can read downloads" on downloads;

create policy "anon can log download"
on downloads for insert to anon
with check (true);

create policy "authenticated can read downloads"
on downloads for select to authenticated
using (true);
