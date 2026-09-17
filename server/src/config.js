import 'dotenv/config';

const list = (value) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const config = {
  port: Number(process.env.PORT) || 4000,
  clientOrigins: list(process.env.CLIENT_ORIGIN || 'http://localhost:5173'),
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_BUCKET || 'attachments',
  },
  retentionDays: Number(process.env.RETENTION_DAYS) || 30,
  cleanup: {
    cron: process.env.CLEANUP_CRON || '0 3 * * *',
    timezone: process.env.CLEANUP_TIMEZONE || 'Asia/Seoul',
    deleteInactiveRooms: process.env.CLEANUP_DELETE_INACTIVE_ROOMS === 'true',
  },
  limits: {
    roomName: 50,
    senderName: 20,
    content: 4000,
    fileSize: 10 * 1024 * 1024,
    pageSize: 50,
  },
};

// 허용 첨부파일: 확장자 → 저장 시 사용할 content-type과 분류
// 클라이언트가 보낸 MIME 대신 이 값을 사용해 공개 버킷에 HTML 등이 올라가지 않도록 한다.
export const ALLOWED_FILES = {
  jpg: { type: 'image', mime: 'image/jpeg' },
  jpeg: { type: 'image', mime: 'image/jpeg' },
  png: { type: 'image', mime: 'image/png' },
  gif: { type: 'image', mime: 'image/gif' },
  webp: { type: 'image', mime: 'image/webp' },
  pdf: { type: 'pdf', mime: 'application/pdf' },
  xlsx: { type: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  pptx: { type: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  docx: { type: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  txt: { type: 'txt', mime: 'text/plain; charset=utf-8' },
  csv: { type: 'csv', mime: 'text/csv; charset=utf-8' },
};
