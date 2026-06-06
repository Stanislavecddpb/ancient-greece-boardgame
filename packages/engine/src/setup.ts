import type { Ctx } from 'boardgame.io';
import {
  type CycladesState,
  type PlayerData,
  type PlayerID,
  type Sea,
  PLAYER_COLORS,
  STARTING_GOLD,
  UNIT_SUPPLY,
} from './types';
import { createBoard, homeIslandsFor, isIsland, isSea } from './board';

const START_TROOPS = 3;
const START_FLEETS = 1;

/** Строит начальное состояние партии под число игроков из ctx. */
export function setupGame(ctx: Ctx): CycladesState {
  const territories = createBoard();
  const homes = homeIslandsFor(ctx.numPlayers);
  const players: Record<PlayerID, PlayerData> = {};

  ctx.playOrder.forEach((pid, i) => {
    players[pid] = {
      id: pid,
      name: `Игрок ${Number(pid) + 1}`,
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      gold: STARTING_GOLD,
      priests: 0,
      philosophers: 0,
      troopsSupply: UNIT_SUPPLY - START_TROOPS,
      fleetsSupply: UNIT_SUPPLY - START_FLEETS,
      isEliminated: false,
    };

    // Домашний остров: войска на нём + один флот в соседнем море.
    const homeId = homes[i];
    const home = territories[homeId];
    if (isIsland(home)) {
      home.ownerId = pid;
      home.troops = START_TROOPS;
      // Флот ставим на свободную соседнюю клетку, предпочитая клетку с рогом
      // изобилия (чтобы был стартовый доход).
      const adjacent = home.adjacentSeas
        .map((id) => territories[id])
        .filter((t): t is Sea => !!t && isSea(t) && t.fleets === 0);
      const target = adjacent.find((s) => s.cornucopia > 0) ?? adjacent[0];
      if (target) {
        target.ownerId = pid;
        target.fleets = START_FLEETS;
      }
    }
  });

  return {
    players,
    territories,
    cycle: 1,
    startIndex: 0,
    auction: null,
    actions: null,
    log: [{ cycle: 1, text: 'Партия началась. Боги ждут подношений.' }],
  };
}
