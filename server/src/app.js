import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import { config } from './config.js';
import { createApiRouter } from './routes/api.js';
import { registerSocketHandlers } from './socket.js';

export function createServer(store) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({ origin: config.clientOrigins }));
  app.use(express.json({ limit: '100kb' }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.clientOrigins },
    maxHttpBufferSize: 100 * 1024,
  });

  registerSocketHandlers(io, store);
  app.use('/api', createApiRouter({ store, io }));

  return { app, server, io };
}
