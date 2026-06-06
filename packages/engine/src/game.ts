import type { Game } from 'boardgame.io';

/**
 * Минимальная заготовка игры для проверки сквозной синхронизации
 * (сервер <-> клиент). На Этапе 1 заменяется полноценными правилами Cyclades.
 */
export interface CycladesState {
  gold: Record<string, number>;
  cycle: number;
}

export const GAME_ID = 'cyclades';

export const CycladesGame: Game<CycladesState> = {
  name: GAME_ID,

  setup: ({ ctx }) => {
    const gold: Record<string, number> = {};
    for (let i = 0; i < ctx.numPlayers; i++) gold[String(i)] = 5;
    return { gold, cycle: 1 };
  },

  moves: {
    // Временный ход: игрок собирает 1 золото. Заменится фазой дохода.
    collectGold: ({ G, playerID }) => {
      if (playerID == null) return;
      G.gold[playerID] = (G.gold[playerID] ?? 0) + 1;
    },
  },

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },
};
