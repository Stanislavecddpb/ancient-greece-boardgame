import { describe, it, expect } from 'vitest';
import type { Ctx } from 'boardgame.io';
import { createBoard, isIsland, isSea, islandAtCell, seaAtCell, displayScaleFor, BOARD_CENTER, BOARD_RADIUS } from './board';
import { setupGame } from './setup';
import { godsForCycle } from './auction';
import { startActionsPhase } from './actions';
import { COMPETITIVE_GODS, PLAYER_COLORS, UNIT_SUPPLY, type GodName } from './types';

function ctxFor(n: number): Ctx {
  const playOrder = Array.from({ length: n }, (_, i) => String(i));
  return {
    numPlayers: n,
    playOrder,
    playOrderPos: 0,
    currentPlayer: '0',
    turn: 1,
    phase: 'auction',
    numMoves: 0,
  } as unknown as Ctx;
}

describe('карта на 5 игроков', () => {
  it('строит 13 островов с верным числом слотов', () => {
    const t = createBoard(5);
    const islands = Object.values(t).filter(isIsland);
    expect(islands).toHaveLength(13);

    const slots = (id: string) => {
      const isl = t[id];
      return isIsland(isl) ? isl.buildSlots : -1;
    };
    expect(slots('f_andros')).toBe(2);
    expect(slots('f_evia')).toBe(4);
    expect(slots('f_tinos')).toBe(2);
    expect(slots('f_mykonos')).toBe(2);
    expect(slots('f_delos')).toBe(1);
    expect(slots('f_ikaria')).toBe(2);
    expect(slots('f_kythnos')).toBe(1);
    expect(slots('f_serifos')).toBe(2);
    expect(slots('f_milos')).toBe(3);
    expect(slots('f_naxos')).toBe(4);
    expect(slots('f_paros')).toBe(1);
    expect(slots('f_sifnos')).toBe(3);
    expect(slots('f_ios')).toBe(3);
  });

  it('(5,7) — море (а не суша), (6,7) — отдельный остров Делос', () => {
    const t = createBoard(5);
    expect(seaAtCell(t, 5, 7)).toBeDefined();
    expect(islandAtCell(t, 5, 7)).toBeUndefined();
    expect(islandAtCell(t, 6, 7)?.id).toBe('f_delos');
    expect(islandAtCell(t, 4, 6)?.id).toBe('f_mykonos');
    expect(islandAtCell(t, 4, 7)?.id).toBe('f_mykonos');
  });

  it('каждый остров имеет смежное море', () => {
    const t = createBoard(5);
    for (const isl of Object.values(t).filter(isIsland)) {
      expect(isl.adjacentSeas.length).toBeGreaterThan(0);
    }
  });

  it('рога изобилия: 11 на суше суммарно, 6 морских клеток', () => {
    const t = createBoard(5);
    const landCorn = Object.values(t).filter(isIsland).reduce((s, isl) => s + isl.cornucopia, 0);
    expect(landCorn).toBe(11);
    const seaCornCells = Object.values(t).filter((x) => isSea(x) && x.cornucopia > 0);
    expect(seaCornCells).toHaveLength(6);
  });

  it('после масштабирования крайние клетки умещаются в диск доски', () => {
    const t = createBoard(5);
    const C = BOARD_CENTER.x;
    const scale = displayScaleFor(5);
    expect(scale).toBeLessThan(1); // широкая карта сжимается
    for (const x of Object.values(t)) {
      const d = Math.hypot(x.pos.x - C, x.pos.y - C) * scale;
      expect(d).toBeLessThan(BOARD_RADIUS); // масштабированный центр клетки внутри диска
    }
  });
});

describe('стартовая расстановка на 5 игроков', () => {
  it('5 цветов: синий, жёлтый, чёрный, красный, зелёный', () => {
    const G = setupGame(ctxFor(5));
    expect(Object.keys(G.players)).toHaveLength(5);
    expect(G.players['0'].color).toBe(PLAYER_COLORS[2]); // синий
    expect(G.players['1'].color).toBe(PLAYER_COLORS[3]); // жёлтый
    expect(G.players['2'].color).toBe(PLAYER_COLORS[1]); // чёрный
    expect(G.players['3'].color).toBe(PLAYER_COLORS[0]); // красный
    expect(G.players['4'].color).toBe(PLAYER_COLORS[4]); // зелёный
  });

  it('войска и корабли стоят на нужных клетках (включая корабль красного на море (5,7))', () => {
    const G = setupGame(ctxFor(5));
    expect(islandAtCell(G.territories, 4, 9)?.ownerId).toBe('0'); // синий, Икария
    expect(islandAtCell(G.territories, 8, 1)?.ownerId).toBe('0'); // синий, Милос
    expect(islandAtCell(G.territories, 2, 1)?.ownerId).toBe('3'); // красный, Эвбея
    expect(islandAtCell(G.territories, 6, 7)?.ownerId).toBe('3'); // красный, Делос
    expect(seaAtCell(G.territories, 5, 7)?.ownerId).toBe('3');    // красный, корабль на (5,7)
    expect(islandAtCell(G.territories, 1, 4)?.ownerId).toBe('4'); // зелёный, Андрос
  });

  it('по 2 войска и 2 флота у каждого; всего 10 флотов', () => {
    const G = setupGame(ctxFor(5));
    for (const pid of ['0', '1', '2', '3', '4']) {
      expect(G.players[pid].troopsSupply).toBe(UNIT_SUPPLY - 2);
      expect(G.players[pid].fleetsSupply).toBe(UNIT_SUPPLY - 2);
    }
    const fleets = Object.values(G.territories).filter((x) => x.kind === 'sea' && x.fleets > 0);
    expect(fleets).toHaveLength(10);
  });
});

describe('боги на 5 игроков — все 4 в случайном порядке', () => {
  it('без shuffle — все 4 канонически', () => {
    expect(godsForCycle(5, 1)).toEqual(['ares', 'poseidon', 'zeus', 'athena']);
  });

  it('с shuffle — все 4 в заданном порядке', () => {
    const reverse = <T,>(a: T[]) => [...a].reverse();
    const gods = godsForCycle(5, 1, reverse);
    expect(gods).toEqual(['athena', 'zeus', 'poseidon', 'ares']);
    expect(new Set(gods).size).toBe(4);
    for (const g of gods) expect(COMPETITIVE_GODS).toContain(g);
  });

  it('очередь действий следует порядку слотов (а не каноническому)', () => {
    const G = setupGame(ctxFor(5));
    const order: GodName[] = ['athena', 'ares', 'zeus', 'poseidon'];
    G.auction = {
      slots: order.map((god, i) => ({ god, occupantId: String(i), bid: 1 })),
      apollo: [],
      toAct: '0',
    };
    startActionsPhase(G);
    expect(G.actions!.queue.map((t) => t.god)).toEqual(order);
  });
});
