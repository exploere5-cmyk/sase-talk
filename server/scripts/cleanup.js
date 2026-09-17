// 자동 삭제 작업을 수동으로 1회 실행: npm run cleanup
import { runCleanup } from '../src/jobs/cleanup.js';
import { createStore } from '../src/store/index.js';

const result = await runCleanup(createStore());
console.log('[cleanup] 완료', result);
