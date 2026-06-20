import { useMemo, useState } from 'react';
import { Client } from 'boardgame.io/react';
import { CycladesGame } from '@cyclades/engine';
import { HotseatBoard } from './Board';

// Хотсит: один экран, один клиент без сервера.
// HotseatBoard сам определяет «меня» как ctx.currentPlayer,
// поэтому каждый игрок видит свои данные в свой ход.
// Число игроков фиксируется при создании клиента, поэтому сперва
// показываем экран выбора, затем монтируем клиент с нужным numPlayers.
function makeHotseatClient(numPlayers: number) {
  return Client({
    game: CycladesGame,
    board: HotseatBoard,
    numPlayers,
    debug: false,
  });
}

export function LocalGame() {
  const [numPlayers, setNumPlayers] = useState(4);
  const [started, setStarted] = useState(false);
  const HotseatClient = useMemo(() => makeHotseatClient(numPlayers), [numPlayers]);

  if (!started) {
    return (
      <div className="home">
        <h1>Локальная игра</h1>
        <p className="hint">За одним компьютером — ходите по очереди за всех игроков.</p>

        <div className="home-card">
          <label>Игроков
            <select value={numPlayers} onChange={(e) => setNumPlayers(Number(e.target.value))}>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
          <button onClick={() => setStarted(true)}>Начать</button>
        </div>

        <a className="local-link" href="#/">← На главную</a>
      </div>
    );
  }

  return (
    <div className="local-wrap">
      <HotseatClient matchID="local" />
    </div>
  );
}
