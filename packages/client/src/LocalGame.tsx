import { Client } from 'boardgame.io/react';
import { CycladesGame } from '@cyclades/engine';
import { HotseatBoard } from './Board';

// Хотсит: один экран, один клиент без сервера.
// HotseatBoard сам определяет «меня» как ctx.currentPlayer,
// поэтому каждый игрок видит свои данные в свой ход.
const HotseatClient = Client({
  game: CycladesGame,
  board: HotseatBoard,
  numPlayers: 4,
  debug: false,
});

export function LocalGame() {
  return (
    <div className="local-wrap">
      <HotseatClient matchID="local" />
    </div>
  );
}
