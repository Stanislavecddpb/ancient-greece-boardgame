import { Server, Origins } from 'boardgame.io/server';
import { CycladesGame } from '@cyclades/engine';

const PORT = Number(process.env.PORT ?? 3001);

const server = Server({
  games: [CycladesGame],
  origins: [Origins.LOCALHOST, /\.localhost:\d+$/],
});

server.run(PORT, () => {
  console.log(`Сервер Cyclades слушает порт ${PORT}`);
});
