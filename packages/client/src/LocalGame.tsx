import { useMemo, useState } from 'react';
import { Client } from 'boardgame.io/react';
import { CycladesGame } from '@cyclades/engine';
import { HotseatBoard } from './Board';
import { GreekPage, PlayerCountPicker } from './GreekPage';

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
      <GreekPage title="Локальная игра" subtitle="За одним компьютером — ходите по очереди за всех игроков.">
        <section className="greek-card">
          <div className="greek-field">Игроков
            <PlayerCountPicker value={numPlayers} onChange={setNumPlayers} />
          </div>
          <button className="greek-btn" onClick={() => setStarted(true)}>Начать</button>
        </section>
        <a className="greek-link" href="#/">← На главную</a>
      </GreekPage>
    );
  }

  return (
    <div className="local-wrap">
      <HotseatClient matchID="local" />
    </div>
  );
}
