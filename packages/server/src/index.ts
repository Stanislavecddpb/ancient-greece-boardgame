import path from 'path';
import serve from 'koa-static';
import { Server } from 'boardgame.io/server';
import { CycladesGame } from '@cyclades/engine';

const PORT = Number(process.env.PORT ?? 3001);

// Разрешаем любой источник: сервер раздаёт и сам клиент, и держит сокеты,
// поэтому за туннелем (ngrok/Cloudflare) запросы приходят с произвольного домена.
const server = Server({
  games: [CycladesGame],
  origins: [/.*/],
});

// Раздаём собранный клиент с того же порта → для игры по сети нужен один туннель.
// Хеш-роутинг (#/m/<id>) держит путь на «/», поэтому SPA-фолбэк не нужен.
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
server.app.use(serve(CLIENT_DIST));

server.run(PORT, () => {
  console.log(`Cyclades: http://localhost:${PORT}  (клиент + сервер на одном порту)`);
  console.log('Для игры по сети направьте туннель (ngrok/cloudflared) на этот порт.');
});
