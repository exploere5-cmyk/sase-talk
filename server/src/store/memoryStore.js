import fs from 'node:fs/promises';
import path from 'node:path';

// Supabase 설정 전 로컬 개발/테스트용 저장소. 서버 재시작 시 데이터가 사라진다.
export const LOCAL_UPLOAD_DIR = path.resolve('.local-uploads');

export const toLocalFileKey = (storagePath) => storagePath.replaceAll('/', '__');

export function createMemoryStore() {
  const rooms = [];
  const messages = [];
  let roomSeq = 0;
  let messageSeq = 0;

  return {
    kind: 'memory',

    async createRoom(room) {
      if (rooms.some((r) => r.slug === room.slug)) {
        throw Object.assign(new Error('duplicate slug'), { code: 'DUPLICATE' });
      }
      const row = { id: ++roomSeq, ...room };
      rooms.push(row);
      return row;
    },

    async getRoomBySlug(slug) {
      return rooms.find((r) => r.slug === slug) ?? null;
    },

    async insertMessage(message) {
      const row = { id: ++messageSeq, created_at: new Date().toISOString(), ...message };
      messages.push(row);
      return row;
    },

    async listMessages(roomId, { beforeId, limit }) {
      return messages
        .filter((m) => m.room_id === roomId && (!beforeId || m.id < beforeId))
        .slice(-limit);
    },

    async uploadFile({ path: storagePath, buffer }) {
      const key = toLocalFileKey(storagePath);
      await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, key), buffer);
      return `/api/files/${key}`;
    },

    async removeFiles(paths) {
      await Promise.all(
        paths.map((p) => fs.rm(path.join(LOCAL_UPLOAD_DIR, toLocalFileKey(p)), { force: true })),
      );
    },

    async findExpiredMessages(cutoffIso, limit) {
      return messages
        .filter((m) => m.created_at < cutoffIso)
        .slice(0, limit)
        .map(({ id, attachment_path }) => ({ id, attachment_path }));
    },

    async deleteMessages(ids) {
      const remove = new Set(ids);
      for (let i = messages.length - 1; i >= 0; i--) {
        if (remove.has(messages[i].id)) messages.splice(i, 1);
      }
    },

    async findInactiveRooms(cutoffIso) {
      return rooms
        .filter((r) => r.created_at < cutoffIso && !messages.some((m) => m.room_id === r.id))
        .map((r) => r.id);
    },

    async deleteRooms(ids) {
      const remove = new Set(ids);
      for (let i = rooms.length - 1; i >= 0; i--) {
        if (remove.has(rooms[i].id)) rooms.splice(i, 1);
      }
    },
  };
}
