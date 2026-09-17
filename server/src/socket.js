import { config } from './config.js';
import { isValidSlug, roomChannel } from './rooms.js';

const reply = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

async function onlineNames(io, roomId) {
  const sockets = await io.in(roomChannel(roomId)).fetchSockets();
  return sockets.map((s) => s.data.name);
}

// 같은 방에 같은 이름이 있으면 "홍길동(2)" 처럼 구분자를 붙인다
function uniqueName(base, taken) {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}(${n})`)) n++;
  return `${base}(${n})`;
}

async function broadcastPresence(io, roomId) {
  io.to(roomChannel(roomId)).emit('presence:update', { online: await onlineNames(io, roomId) });
}

const notice = (kind, name) => ({ kind, name, at: new Date().toISOString() });

export function registerSocketHandlers(io, store) {
  io.on('connection', (socket) => {
    // Phase 2 — 방 입장
    socket.on('room:join', async (payload, ack) => {
      try {
        const slug = payload?.slug;
        const baseName = String(payload?.name ?? '').trim().slice(0, config.limits.senderName);
        if (!isValidSlug(slug) || !baseName) {
          return reply(ack, { ok: false, error: '방 정보 또는 이름이 올바르지 않습니다.' });
        }

        const room = await store.getRoomBySlug(slug);
        if (!room) return reply(ack, { ok: false, error: '존재하지 않거나 만료된 방입니다.' });

        const prevRoomId = socket.data.roomId;
        if (prevRoomId && prevRoomId !== room.id) {
          socket.leave(roomChannel(prevRoomId));
          socket.to(roomChannel(prevRoomId)).emit('system:notice', notice('leave', socket.data.name));
          await broadcastPresence(io, prevRoomId);
        }

        const others = (await io.in(roomChannel(room.id)).fetchSockets()).filter((s) => s.id !== socket.id);
        const name = uniqueName(baseName, new Set(others.map((s) => s.data.name)));

        socket.data.roomId = room.id;
        socket.data.name = name;
        socket.join(roomChannel(room.id));

        const limit = config.limits.pageSize;
        const messages = await store.listMessages(room.id, { limit });
        reply(ack, { ok: true, name, room, messages, hasMore: messages.length === limit });

        if (prevRoomId !== room.id) socket.to(roomChannel(room.id)).emit('system:notice', notice('join', name));
        await broadcastPresence(io, room.id);
      } catch (err) {
        console.error('[socket] join', err);
        reply(ack, { ok: false, error: '입장 중 오류가 발생했습니다.' });
      }
    });

    // Phase 2 — 텍스트 메시지
    socket.on('message:send', async (payload, ack) => {
      try {
        const { roomId, name } = socket.data;
        if (!roomId) return reply(ack, { ok: false, error: '방에 먼저 입장해주세요.' });

        const content = String(payload?.content ?? '').trim();
        if (!content) return reply(ack, { ok: false, error: '메시지를 입력해주세요.' });
        if (content.length > config.limits.content) {
          return reply(ack, { ok: false, error: `메시지는 ${config.limits.content}자 이하로 보내주세요.` });
        }

        const message = await store.insertMessage({ room_id: roomId, sender_name: name, content });
        io.to(roomChannel(roomId)).emit('message:new', message);
        reply(ack, { ok: true, message });
      } catch (err) {
        console.error('[socket] send', err);
        reply(ack, { ok: false, error: '메시지 전송에 실패했습니다.' });
      }
    });

    socket.on('disconnect', async () => {
      const { roomId, name } = socket.data;
      if (!roomId) return;
      io.to(roomChannel(roomId)).emit('system:notice', notice('leave', name));
      await broadcastPresence(io, roomId).catch(() => {});
    });
  });
}
