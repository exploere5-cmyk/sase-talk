import { customAlphabet } from 'nanoid';
import { config } from './config.js';

// 헷갈리는 문자(0/o, 1/l)를 뺀 소문자+숫자 10자리 슬러그
const makeSlug = customAlphabet('23456789abcdefghijkmnpqrstuvwxyz', 10);

const DAY_MS = 24 * 60 * 60 * 1000;

export async function createRoom(store, name) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = new Date();
    try {
      return await store.createRoom({
        slug: makeSlug(),
        name,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + config.retentionDays * DAY_MS).toISOString(),
      });
    } catch (err) {
      if (err.code !== 'DUPLICATE') throw err;
    }
  }
  throw new Error('방 코드 생성에 실패했습니다.');
}

export const roomChannel = (roomId) => `room:${roomId}`;

export const isValidSlug = (slug) => typeof slug === 'string' && /^[a-z0-9]{4,32}$/.test(slug);
