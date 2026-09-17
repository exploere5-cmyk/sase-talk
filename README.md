# SASE Talk — 사내·협력사 소통방

로그인 없이 초대 링크와 이름만으로 입장하는 실시간 대화방입니다. 대화와 첨부파일은 30일 후 자동 삭제됩니다.
요구사항은 `사내채팅서비스_PRD.md`, 디자인 기준은 `sase-img.png`(SASE Design System)를 따릅니다.

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React 19 + Vite (`client/`) |
| 백엔드 | Node.js + Express 5 + Socket.io (`server/`) |
| DB / 파일 | Supabase PostgreSQL + Storage |
| 자동 삭제 | node-cron (매일 03:00 KST + 서버 기동 시 1회) |

## 빠른 시작 (로컬)

```bash
npm install
npm run dev          # 서버 :4000 + 클라이언트 :5173 동시 실행
```

http://localhost:5173 에 접속합니다.
`server/.env`에 Supabase 값이 없으면 **메모리 저장소**로 동작합니다(서버 재시작 시 데이터 초기화, 파일은 `server/.local-uploads/`). UI와 흐름을 확인하는 용도입니다.

## Supabase 연결

1. https://supabase.com 에서 무료 프로젝트를 만듭니다.
2. **SQL Editor**에서 `server/supabase/schema.sql` 내용을 실행합니다. 테이블, 인덱스, RLS, `attachments` 버킷(공개, 10MB 제한)이 생성됩니다.
3. **Project Settings → API**에서 값을 복사해 `server/.env`에 넣습니다.
   ```env
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service_role 키. 서버에만 두고 절대 프론트에 노출하지 마세요.
   ```
4. `npm run dev`로 다시 실행합니다. 로그에 `store: supabase`가 표시되면 연결된 것입니다.

## 구조

```
client/src
  pages/        HomePage(방 생성) · RoomPage(입장) · NotFoundPage
  components/   ChatRoom · MessageItem · Composer · JoinCard · Logo …
  lib/          api(REST·업로드) · files(형식/용량 검증) · util
  styles/       index.css — SASE 컬러·타이포 토큰
server/src
  routes/api.js     REST API (방 생성·조회, 과거 메시지, 첨부 업로드)
  socket.js         Socket.io (입장, 메시지, 접속자)
  jobs/cleanup.js   30일 자동 삭제
  store/            supabaseStore · memoryStore (동일 인터페이스)
server/supabase/schema.sql
```

### API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/rooms` | 방 생성 `{ name }` → `{ room }` (10자리 slug) |
| GET | `/api/rooms/:slug` | 방 정보 |
| GET | `/api/rooms/:slug/messages?before=<id>` | 과거 메시지 50개씩 |
| POST | `/api/rooms/:slug/attachments` | multipart `file`, `content` + 헤더 `x-socket-id` |
| GET | `/api/health` | 상태 확인 |

### Socket 이벤트

| 방향 | 이벤트 | 내용 |
|---|---|---|
| C→S | `room:join` `{ slug, name }` | ack: `{ ok, name, room, messages, hasMore }` — 같은 이름이 있으면 `홍길동(2)` |
| C→S | `message:send` `{ content }` | ack: `{ ok, message }` |
| S→C | `message:new` | 새 메시지(텍스트/첨부) |
| S→C | `presence:update` | `{ online: [이름] }` |
| S→C | `system:notice` | 입장/퇴장 알림 |

## 자동 삭제 (Phase 4)

- 매일 `CLEANUP_CRON`(기본 `0 3 * * *`, `Asia/Seoul`)에 실행하며, **서버가 켜질 때도 1회** 실행합니다. Render 무료 서버는 유휴 시 잠들어 새벽 cron을 놓칠 수 있기 때문입니다.
- 작성 후 `RETENTION_DAYS`(30일)가 지난 메시지는 **Storage 파일을 먼저 지운 뒤** DB 행을 삭제합니다. 파일 삭제에 실패하면 행이 남아 다음 실행에서 다시 시도합니다.
- `CLEANUP_DELETE_INACTIVE_ROOMS=true`이면 30일이 지났고 메시지가 없는 방도 삭제합니다(기본 꺼짐).
- 수동 실행: `npm run cleanup`

## 배포 (Phase 5)

| 구분 | 주소 |
|---|---|
| 서비스 | https://sase-talk.vercel.app |
| API 서버 | https://sase-talk-server.onrender.com (`/api/health`) |

- 백엔드: `main`에 push하면 Render가 자동 재배포합니다.
- 프론트: 현재 CLI로 배포합니다. `client` 폴더에서 `npx vercel deploy --prod` 실행. (Vercel 대시보드에서 Git 연결 + Root Directory `client`로 설정하면 push 시 자동 배포)

**백엔드 → Render**: 저장소를 연결하면 `render.yaml`이 인식됩니다. `CLIENT_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 입력합니다.

**프론트 → Vercel**: Root Directory를 `client`로 지정하고 환경변수 `VITE_API_URL=https://<render 주소>`를 설정합니다. `client/vercel.json`이 `/room/:slug` 새로고침을 처리합니다.

## 참고 / 주의

- PRD 스키마에 `attachment_name`(원본 파일명), `attachment_path`(삭제용 Storage 경로) 컬럼을 추가했습니다.
- 링크만 알면 누구나 입장할 수 있습니다(PRD의 보안 최소화 방침). 실제 업무 자료를 다루기 전에 방 비밀번호/PIN을 검토하세요.
- 첨부 버킷은 공개 버킷입니다. 파일 URL은 추측하기 어려운 무작위 경로지만, URL이 유출되면 30일 동안 누구나 받을 수 있습니다.
- Supabase 무료 프로젝트는 일정 기간 활동이 없으면 일시 정지될 수 있습니다.
