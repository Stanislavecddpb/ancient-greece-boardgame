import path from 'path';
import serve from 'koa-static';
import { addPlatformRoutes } from './platform';
import { FlatFile, Server } from 'boardgame.io/server';
import { CycladesGame } from '@cyclades/engine';

const PORT = Number(process.env.PORT ?? 3001);
// Партии сохраняются на диск и переживают перезапуск сервера (папка — переменная MATCHES_DIR).
const MATCHES_DIR = process.env.MATCHES_DIR ?? path.resolve(__dirname, '../../../data/matches');

// Разрешаем любой источник: сервер раздаёт и сам клиент, и держит сокеты,
// поэтому за туннелем (ngrok/Cloudflare) запросы приходят с произвольного домена.
const server = Server({
  games: [CycladesGame],
  origins: [/.*/],
  db: new FlatFile({ dir: MATCHES_DIR }),
});

// Раздаём собранный клиент с того же порта → для игры по сети нужен один туннель.
// Хеш-роутинг (#/m/<id>) держит путь на «/», поэтому SPA-фолбэк не нужен.
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
server.app.use(serve(CLIENT_DIST));

// Служебные маршруты платформы Zarya (при заданном PLATFORM_SECRET).
addPlatformRoutes(server);

server.run(PORT, () => {
  console.log(`Cyclades: http://localhost:${PORT}  (клиент + сервер на одном порту)`);
  console.log('Для игры по сети направьте туннель (ngrok/cloudflared) на этот порт.');
});
