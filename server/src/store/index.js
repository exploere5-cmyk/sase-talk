import { config } from '../config.js';
import { createMemoryStore } from './memoryStore.js';
import { createSupabaseStore } from './supabaseStore.js';

export function createStore() {
  const { url, serviceRoleKey } = config.supabase;
  if (url && serviceRoleKey) return createSupabaseStore(config.supabase);

  console.warn(
    '[store] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없어 메모리 저장소로 실행합니다. (재시작 시 데이터 초기화)',
  );
  return createMemoryStore();
}
