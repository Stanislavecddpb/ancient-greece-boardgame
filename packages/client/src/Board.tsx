import type { BoardProps } from 'boardgame.io/react';
import type { CycladesState } from '@cyclades/engine';

export function Board({ G, ctx, moves, playerID, isActive }: BoardProps<CycladesState>) {
  return (
    <div className="board">
      <h3>
        Игрок {playerID} · цикл {G.cycle}
      </h3>
      <ul>
        {Object.entries(G.gold).map(([id, gold]) => (
          <li key={id} className={id === ctx.currentPlayer ? 'active-player' : ''}>
            Игрок {id}: {gold} 🪙
          </li>
        ))}
      </ul>
      <button onClick={() => moves.collectGold()} disabled={!isActive}>
        Собрать золото {isActive ? '' : '(не ваш ход)'}
      </button>
    </div>
  );
}
