-- SASE Talk — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요. (여러 번 실행해도 안전)

create table if not exists public.rooms (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.messages (
  id               bigint generated always as identity primary key,
  room_id          bigint not null references public.rooms(id) on delete cascade,
  sender_name      text not null,
  content          text,
  attachment_url   text,
  attachment_type  text,          -- image / pdf / xlsx / pptx / docx / txt / csv
  attachment_size  integer,
  attachment_name  text,          -- 원본 파일명 (화면 표시·다운로드용)
  attachment_path  text,          -- Storage 내부 경로 (자동 삭제용)
  created_at       timestamptz not null default now(),
  constraint messages_has_body check (content is not null or attachment_url is not null)
);

create index if not exists messages_room_id_id_idx on public.messages (room_id, id desc);
create index if not exists messages_created_at_idx on public.messages (created_at);
create index if not exists rooms_created_at_idx on public.rooms (created_at);

-- 서버는 service_role 키로만 접근한다.
-- RLS를 켜고 정책을 두지 않아 anon 키로는 테이블에 접근할 수 없게 막는다.
alter table public.rooms enable row level security;
alter table public.messages enable row level security;

-- 첨부파일 버킷 (공개 읽기, 10MB 제한)
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', true, 10485760)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;
