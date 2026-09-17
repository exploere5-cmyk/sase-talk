import cron from 'node-cron';
import { config } from '../config.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH = 200;

// Phase 4 — 보관 기간이 지난 메시지와 첨부파일을 DB·Storage에서 완전 삭제
export async function runCleanup(store, { now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - config.retentionDays * DAY_MS).toISOString();
  const result = { cutoff, messages: 0, files: 0, rooms: 0 };

  for (;;) {
    const expired = await store.findExpiredMessages(cutoff, BATCH);
    if (!expired.length) break;

    // 파일을 먼저 지운다. 실패하면 행이 남아 다음 실행에서 재시도되므로 고아 파일이 생기지 않는다.
    const paths = expired.map((m) => m.attachment_path).filter(Boolean);
    await store.removeFiles(paths);
    await store.deleteMessages(expired.map((m) => m.id));

    result.files += paths.length;
    result.messages += expired.length;
    if (expired.length < BATCH) break;
  }

  if (config.cleanup.deleteInactiveRooms) {
    const roomIds = await store.findInactiveRooms(cutoff);
    await store.deleteRooms(roomIds);
    result.rooms = roomIds.length;
  }

  return result;
}

let running = false;

async function runSafely(store, reason) {
  if (running) return;
  running = true;
  try {
    const r = await runCleanup(store);
    console.log(
      `[cleanup:${reason}] ${r.cutoff} 이전 데이터 — 메시지 ${r.messages}건, 파일 ${r.files}개, 방 ${r.rooms}개 삭제`,
    );
  } catch (err) {
    console.error(`[cleanup:${reason}] 실패`, err);
  } finally {
    running = false;
  }
}

export function scheduleCleanup(store) {
  cron.schedule(config.cleanup.cron, () => runSafely(store, 'cron'), {
    timezone: config.cleanup.timezone,
    name: 'retention-cleanup',
    noOverlap: true,
  });
  // 무료 호스팅은 유휴 시 슬립되어 새벽 cron을 놓칠 수 있으므로 기동 시에도 한 번 실행한다.
  runSafely(store, 'startup');
}
