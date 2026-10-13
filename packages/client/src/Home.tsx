import { useState } from 'react';
import { lobby, GAME_ID, saveSeat, savedName, rememberName } from './net';
import { GreekPage, PlayerCountPicker } from './GreekPage';

export function Home() {
  const [name, setName] = useState(savedName() || 'Игрок');
  const [numPlayers, setNumPlayers] = useState(2);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGame() {
    setBusy(true);
    setError(null);
    try {
      rememberName(name);
      const { matchID } = await lobby.createMatch(GAME_ID, { numPlayers });
      // Создатель занимает первое место.
      const { playerCredentials } = await lobby.joinMatch(GAME_ID, matchID, {
        playerID: '0',
        playerName: name,
      });
      saveSeat(matchID, { playerID: '0', credentials: playerCredentials, name });
      location.hash = `#/m/${matchID}`;
    } catch (e) {
      setError('Не удалось создать игру. Сервер запущен?');
    } finally {
      setBusy(false);
    }
  }

  function joinByCode() {
    const code = joinCode.trim();
    if (code) location.hash = `#/m/${code}`;
  }

  return (
    <GreekPage subtitle="Борьба за господство над островами Эгейского моря. Возведите две Метрополии — и боги признают вас владыкой Киклад.">
      <section className="greek-card">
        <h2>Созвать игру</h2>
        <label>Ваше имя
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
        </label>
        <div className="greek-field">Игроков
          <PlayerCountPicker value={numPlayers} onChange={setNumPlayers} />
        </div>
        <button className="greek-btn" disabled={busy} onClick={createGame}>
          {busy ? 'Созываем…' : 'Создать игру'}
        </button>
        {error && <div className="err">{error}</div>}
      </section>

      <section className="greek-card">
        <h2>Вступить в игру</h2>
        <label>Код партии от друга
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') joinByCode(); }} placeholder="например, W28urhFkUw7" />
        </label>
        <button className="greek-btn ghost" disabled={!joinCode.trim()} onClick={joinByCode}>Присоединиться</button>
      </section>

      <a className="greek-link" href="#/local">Локальная игра за одним компьютером →</a>
    </GreekPage>
  );
}
