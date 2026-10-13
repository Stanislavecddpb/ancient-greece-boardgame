import { describe, it, expect } from 'vitest';
import type { Ctx } from 'boardgame.io';
import { createBoard, isIsland, isSea, islandAtCell, seaAtCell } from './board';
import { setupGame } from './setup';
import { godsForCycle, drawGods, setupAuction } from './auction';
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

describe('малая карта (3 игрока)', () => {
  it('строит 8 островов с верным числом слотов застройки', () => {
    const t = createBoard(3);
    const islands = Object.values(t).filter(isIsland);
    expect(islands).toHaveLength(8);

    const slots = (id: string) => {
      const isl = t[id];
      return isIsland(isl) ? isl.buildSlots : -1;
    };
    expect(slots('m_kea')).toBe(1);
    expect(slots('m_andros')).toBe(2);
    expect(slots('m_tinos')).toBe(2);
    expect(slots('m_mykonos')).toBe(1);
    expect(slots('m_syros')).toBe(3);
    expect(slots('m_rinia')).toBe(1);
    expect(slots('m_naxos')).toBe(4);
    expect(slots('m_paros')).toBe(3);
  });

  it('каждый остров имеет хотя бы одно смежное море', () => {
    const t = createBoard(3);
    for (const isl of Object.values(t).filter(isIsland)) {
      expect(isl.adjacentSeas.length).toBeGreaterThan(0);
    }
  });

  it('рога изобилия: 8 на суше суммарно и 4 морских клетки с рогом', () => {
    const t = createBoard(3);
    const landCorn = Object.values(t)
      .filter(isIsland)
      .reduce((s, isl) => s + isl.cornucopia, 0);
    expect(landCorn).toBe(8);

    const seaCornCells = Object.values(t).filter((x) => isSea(x) && x.cornucopia > 0);
    expect(seaCornCells).toHaveLength(4);
  });

  it('связь клетка→территория совпадает со спецификацией', () => {
    const t = createBoard(3);
    // (7,4) — отдельный одноклеточный остров Риния.
    expect(islandAtCell(t, 7, 4)?.id).toBe('m_rinia');
    // (5,5) — Миконос, отдельный остров (не слит с Тиносом).
    expect(islandAtCell(t, 5, 5)?.id).toBe('m_mykonos');
    expect(islandAtCell(t, 4, 2)?.id).toBe('m_tinos');
    expect(islandAtCell(t, 5, 3)?.id).toBe('m_tinos');
    // Морские клетки существуют там, где должны быть корабли/рога.
    expect(seaAtCell(t, 6, 4)).toBeDefined();
    expect(seaAtCell(t, 1, 2)?.cornucopia).toBe(1);
  });
});

describe('стартовая расстановка на 3 игрока', () => {
  it('цвета мест: синий, жёлтый, чёрный', () => {
    const G = setupGame(ctxFor(3));
    expect(Object.keys(G.players)).toHaveLength(3);
    expect(G.players['0'].color).toBe(PLAYER_COLORS[2]); // синий
    expect(G.players['1'].color).toBe(PLAYER_COLORS[3]); // жёлтый
    expect(G.players['2'].color).toBe(PLAYER_COLORS[1]); // чёрный
  });

  it('синий (0) стоит на Тиносе и Паросе, его корабли на (6,4) и (11,2)', () => {
    const G = setupGame(ctxFor(3));
    expect(islandAtCell(G.territories, 4, 2)?.ownerId).toBe('0'); // Тинос
    expect(islandAtCell(G.territories, 10, 1)?.ownerId).toBe('0'); // Парос
    expect(seaAtCell(G.territories, 6, 4)?.ownerId).toBe('0');
    expect(seaAtCell(G.territories, 11, 2)?.ownerId).toBe('0');
  });

  it('жёлтый (1) и чёрный (2) на своих клетках', () => {
    const G = setupGame(ctxFor(3));
    expect(islandAtCell(G.territories, 2, 1)?.ownerId).toBe('1'); // Кеа
    expect(islandAtCell(G.territories, 9, 4)?.ownerId).toBe('1'); // Наксос
    expect(islandAtCell(G.territories, 3, 3)?.ownerId).toBe('2'); // Андрос
    expect(islandAtCell(G.territories, 6, 2)?.ownerId).toBe('2'); // Сирос
  });

  it('по 2 войска и 2 флота у каждого, остаток запаса корректен', () => {
    const G = setupGame(ctxFor(3));
    for (const pid of ['0', '1', '2']) {
      expect(G.players[pid].troopsSupply).toBe(UNIT_SUPPLY - 2);
      expect(G.players[pid].fleetsSupply).toBe(UNIT_SUPPLY - 2);
    }
    const fleets = Object.values(G.territories).filter((x) => x.kind === 'sea' && x.fleets > 0);
    expect(fleets).toHaveLength(6);
  });
});

describe('боги на 3 игрока — по 2 из мешка', () => {
  const reverse = <T,>(a: T[]) => [...a].reverse();

  it('без shuffle — канонически: сначала Арес+Посейдон, затем Зевс+Афина', () => {
    const bag: GodName[] = [];
    expect(drawGods(bag, 2)).toEqual(['ares', 'poseidon']);
    expect(drawGods(bag, 2)).toEqual(['zeus', 'athena']);
    expect(bag).toEqual([]);
  });

  it('порядок слотов случаен, а не канонический', () => {
    const bag: GodName[] = [];
    expect(drawGods(bag, 2, reverse)).toEqual(['athena', 'zeus']);
    expect(drawGods(bag, 2, reverse)).toEqual(['poseidon', 'ares']);
  });

  it('за каждые два цикла выходят все 4 бога (Афина не пропадает)', () => {
    const ctx = ctxFor(3);
    const G = setupGame(ctx);
    // «Случайность»: каждый раз другой сдвиг, чтобы круги отличались.
    let n = 0;
    const rotate = <T,>(a: T[]) => { n++; return [...a.slice(n % a.length), ...a.slice(0, n % a.length)]; };
    for (let round = 0; round < 5; round++) {
      const seen: GodName[] = [];
      for (let i = 0; i < 2; i++) {
        setupAuction(G, ctx, { Shuffle: rotate });
        expect(G.auction!.slots).toHaveLength(2);
        seen.push(...G.auction!.slots.map((s) => s.god));
        G.cycle++;
      }
      expect([...seen].sort()).toEqual([...COMPETITIVE_GODS].sort());
    }
  });

  it('у 4 игроков логика богов не изменилась (3 бога, ротация)', () => {
    expect(godsForCycle(4, 1)).toEqual(['ares', 'poseidon', 'zeus']);
    expect(godsForCycle(4, 2)).toEqual(['poseidon', 'zeus', 'athena']);
    const ctx = ctxFor(4);
    const G = setupGame(ctx);
    setupAuction(G, ctx);
    expect(G.auction!.slots.map((s) => s.god)).toEqual(['ares', 'poseidon', 'zeus']);
    expect(G.godBag).toEqual([]);
  });
});

describe('режим на 2 игрока (та же малая карта)', () => {
  it('2 игрока на малой карте: цвета жёлтый и чёрный', () => {
    const G = setupGame(ctxFor(2));
    expect(Object.keys(G.players)).toHaveLength(2);
    expect(G.players['0'].color).toBe(PLAYER_COLORS[3]); // жёлтый
    expect(G.players['1'].color).toBe(PLAYER_COLORS[1]); // чёрный
    // Жёлтый на Кеа (2,1) и Наксосе (9,4); чёрный на Андросе (3,3) и Паросе (10,1).
    expect(islandAtCell(G.territories, 2, 1)?.ownerId).toBe('0');
    expect(islandAtCell(G.territories, 9, 4)?.ownerId).toBe('0');
    expect(islandAtCell(G.territories, 3, 3)?.ownerId).toBe('1');
    expect(islandAtCell(G.territories, 10, 1)?.ownerId).toBe('1');
    const fleets = Object.values(G.territories).filter((x) => x.kind === 'sea' && x.fleets > 0);
    expect(fleets).toHaveLength(4);
  });

  it('боги: по 1 за цикл из мешка — за 4 цикла выходят все четверо', () => {
    const ctx = ctxFor(2);
    const G = setupGame(ctx);
    const reverse = <T,>(a: T[]) => [...a].reverse();
    const seen: GodName[] = [];
    for (let i = 0; i < 4; i++) {
      setupAuction(G, ctx, { Shuffle: reverse });
      expect(G.auction!.slots).toHaveLength(1);
      seen.push(G.auction!.slots[0].god);
    }
    expect(seen).toEqual(['athena', 'zeus', 'poseidon', 'ares']);
  });
});
