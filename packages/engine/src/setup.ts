import type { Ctx } from 'boardgame.io';
import {
  type CycladesState,
  type PlayerData,
  type PlayerID,
  PLAYER_COLORS,
  STARTING_GOLD,
  UNIT_SUPPLY,
} from './types';
import { createBoard, islandAtCell, seaAtCell } from './board';
import { createCreatureMarket } from './creatures';

/** Доступ к перемешиванию из плагина random boardgame.io (опционально). */
interface RandomAPI { Shuffle?: <T>(a: T[]) => T[] }

// Стартовое размещение по местам. soldiers — клетки суши (по 1 войску),
// ships — морские клетки (по 1 флоту), color — цвет игрока на этом месте.
interface Placement {
  color: string;
  soldiers: [number, number][];
  ships: [number, number][];
}

// Большая карта (2 и 4 игрока): красный, чёрный, синий, жёлтый.
const LARGE_PLACEMENTS: Placement[] = [
  { color: PLAYER_COLORS[0], soldiers: [[2, 1], [7, 6]], ships: [[2, 3], [6, 7]] }, // красный
  { color: PLAYER_COLORS[1], soldiers: [[3, 5], [7, 1]], ships: [[6, 1], [4, 6]] }, // чёрный
  { color: PLAYER_COLORS[2], soldiers: [[5, 2], [9, 6]], ships: [[6, 3], [9, 5]] }, // синий
  { color: PLAYER_COLORS[3], soldiers: [[5, 5], [10, 2]], ships: [[6, 5], [11, 1]] }, // жёлтый
];

// Малая карта (3 игрока): место 0 — синий, 1 — жёлтый, 2 — чёрный.
const SMALL_PLACEMENTS: Placement[] = [
  { color: PLAYER_COLORS[2], soldiers: [[4, 2], [10, 1]], ships: [[6, 4], [11, 2]] }, // синий
  { color: PLAYER_COLORS[3], soldiers: [[2, 1], [9, 4]], ships: [[3, 2], [7, 5]] }, // жёлтый
  { color: PLAYER_COLORS[1], soldiers: [[3, 3], [6, 2]], ships: [[4, 4], [6, 1]] }, // чёрный
];

function placementsFor(numPlayers: number): Placement[] {
  return numPlayers === 3 ? SMALL_PLACEMENTS : LARGE_PLACEMENTS;
}

/** Строит начальное состояние партии под число игроков из ctx. */
export function setupGame(ctx: Ctx, random?: RandomAPI): CycladesState {
  const territories = createBoard(ctx.numPlayers);
  const players: Record<PlayerID, PlayerData> = {};
  const placements = placementsFor(ctx.numPlayers);

  ctx.playOrder.forEach((pid, i) => {
    const place = placements[i];
    let troopsPlaced = 0;
    let fleetsPlaced = 0;

    for (const [r, c] of place.soldiers) {
      const isl = islandAtCell(territories, r, c);
      if (isl) {
        isl.ownerId = pid;
        isl.troops += 1;
        troopsPlaced += 1;
      }
    }
    for (const [r, c] of place.ships) {
      const sea = seaAtCell(territories, r, c);
      if (sea) {
        sea.ownerId = pid;
        sea.fleets += 1;
        fleetsPlaced += 1;
      }
    }

    players[pid] = {
      id: pid,
      name: `Игрок ${Number(pid) + 1}`,
      color: place.color,
      gold: STARTING_GOLD,
      priests: 0,
      philosophers: 0,
      troopsSupply: UNIT_SUPPLY - troopsPlaced,
      fleetsSupply: UNIT_SUPPLY - fleetsPlaced,
      isEliminated: false,
    };
  });

  return {
    players,
    territories,
    cycle: 1,
    startIndex: 0,
    started: false,
    auction: null,
    actions: null,
    creatures: createCreatureMarket(random?.Shuffle),
    boardCreatures: [],
    pendingCornucopia: null,
    combat: null,
    fleetMove: null,
    sphinxResell: null,
    sylphMove: null,
    krakenMove: null,
    polyphemusPush: null,
    pegasusMove: null,
    chimeraPick: null,
    satyrSteal: null,
    cyclopsSwap: null,
    metropolisPlace: null,
    log: [{ cycle: 1, text: 'Партия началась. Боги ждут подношений.' }],
  };
}
