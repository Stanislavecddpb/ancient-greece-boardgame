import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { CycladesGame } from '@cyclades/engine';
import { Board } from './Board';

const SERVER = import.meta.env.VITE_SERVER ?? 'http://localhost:3001';

const CycladesClient = Client({
  game: CycladesGame,
  board: Board,
  numPlayers: 2,
  multiplayer: SocketIO({ server: SERVER }),
});

// На время разработки показываем оба «места» игроков рядом, в одной партии,
// чтобы видеть живую синхронизацию. Лобби по ссылке появится на Этапе 3.
const DEV_MATCH_ID = 'dev';

export function App() {
  return (
    <div className="app">
      <h1>Cyclades</h1>
      <div className="seats">
        <CycladesClient matchID={DEV_MATCH_ID} playerID="0" />
        <CycladesClient matchID={DEV_MATCH_ID} playerID="1" />
      </div>
    </div>
  );
}
