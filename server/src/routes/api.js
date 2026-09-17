import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { ALLOWED_FILES, config } from '../config.js';
import { createRoom, isValidSlug, roomChannel } from '../rooms.js';
import { LOCAL_UPLOAD_DIR } from '../store/memoryStore.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.limits.fileSize, files: 1 },
  defParamCharset: 'utf8', // 한글 파일명 깨짐 방지
});

export function createApiRouter({ store, io }) {
  const router = express.Router();

  const findRoom = async (req, res) => {
    const room = isValidSlug(req.params.slug) ? await store.getRoomBySlug(req.params.slug) : null;
    if (!room) res.status(404).json({ error: '존재하지 않거나 만료된 방입니다.' });
    return room;
  };

  router.get('/health', (req, res) => res.json({ ok: true, store: store.kind }));

  // Phase 1 — 방 생성
  router.post('/rooms', async (req, res) => {
    const name = String(req.body?.name ?? '').trim();
    if (!name || name.length > config.limits.roomName) {
      return res.status(400).json({ error: `방 이름은 1~${config.limits.roomName}자로 입력해주세요.` });
    }
    const room = await createRoom(store, name);
    res.status(201).json({ room });
  });

  router.get('/rooms/:slug', async (req, res) => {
    const room = await findRoom(req, res);
    if (room) res.json({ room, retentionDays: config.retentionDays });
  });

  // 과거 메시지 페이지 조회 (id 커서 기반)
  router.get('/rooms/:slug/messages', async (req, res) => {
    const room = await findRoom(req, res);
    if (!room) return;
    const beforeId = Number(req.query.before) || undefined;
    const limit = Math.min(Number(req.query.limit) || config.limits.pageSize, 100);
    const messages = await store.listMessages(room.id, { beforeId, limit });
    res.json({ messages, hasMore: messages.length === limit });
  });

  // Phase 3 — 파일 첨부: Storage 업로드 + 메시지 저장 + 실시간 브로드캐스트를 한 번에 처리
  router.post('/rooms/:slug/attachments', upload.single('file'), async (req, res) => {
    const room = await findRoom(req, res);
    if (!room) return;

    // 소켓으로 입장한 사용자만 업로드 가능 — 표시 이름은 서버가 관리하는 값을 사용
    const socket = io.sockets.sockets.get(String(req.get('x-socket-id') ?? ''));
    if (!socket || socket.data.roomId !== room.id) {
      return res.status(403).json({ error: '방에 입장한 후 파일을 보낼 수 있습니다.' });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: '파일이 없습니다.' });

    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const kind = ALLOWED_FILES[ext];
    if (!kind) return res.status(415).json({ error: '지원하지 않는 파일 형식입니다.' });

    const content = String(req.body?.content ?? '').trim().slice(0, config.limits.content) || null;
    const storagePath = `${room.slug}/${nanoid(16)}.${ext}`;
    const url = await store.uploadFile({ path: storagePath, buffer: file.buffer, contentType: kind.mime });

    let message;
    try {
      message = await store.insertMessage({
        room_id: room.id,
        sender_name: socket.data.name,
        content,
        attachment_url: url,
        attachment_type: kind.type,
        attachment_size: file.size,
        attachment_name: file.originalname.slice(0, 200),
        attachment_path: storagePath,
      });
    } catch (err) {
      await store.removeFiles([storagePath]).catch(() => {});
      throw err;
    }

    io.to(roomChannel(room.id)).emit('message:new', message);
    res.status(201).json({ message });
  });

  // 메모리 저장소 사용 시 로컬 파일 제공
  if (store.kind === 'memory') {
    router.get('/files/:key', (req, res) => {
      const key = path.basename(req.params.key);
      const options = { root: LOCAL_UPLOAD_DIR, headers: { 'X-Content-Type-Options': 'nosniff' } };
      if (req.query.download) res.download(key, String(req.query.download), options);
      else res.sendFile(key, options);
    });
  }

  router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      return res.status(tooLarge ? 413 : 400).json({
        error: tooLarge
          ? `파일은 ${config.limits.fileSize / 1024 / 1024}MB 이하만 올릴 수 있습니다.`
          : '파일 업로드 요청이 올바르지 않습니다.',
      });
    }
    console.error('[api]', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  });

  return router;
}
