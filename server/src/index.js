import { config } from './config.js';
import { createServer } from './app.js';
import { scheduleCleanup } from './jobs/cleanup.js';
import { createStore } from './store/index.js';

const store = createStore();
const { server } = createServer(store);

server.listen(config.port, () => {
  console.log(`[server] http://localhost:${config.port} (store: ${store.kind})`);
  scheduleCleanup(store);
});
