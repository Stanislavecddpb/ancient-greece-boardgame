import type { Island, Sea, Territory, TerritoryId, Point, LandCell, CornucopiaSpot } from './types';

// Карта — круглое поле из строк клеток-кружков (плотная упаковка), нумерация
// клеток (строка, номер в строке) с 1. Связные клетки суши образуют острова;
// остальное — море. Геометрия каждого варианта собрана в MapConfig:
//  • большая карта (2 и 4 игрока) — строки 4-5-6-7-8-9-8-7-6-5-4;
//  • малая карта (3 игрока)       — строки 2-3-4-5-6-7-6-5-4-3-2.

export const CELL_D = 82; // базовый размер клетки (и фигур) — шаг по умолчанию
export const BOARD_VIEWBOX = 900;
export const BOARD_CENTER: Point = { x: 450, y: 450 };
export const BOARD_RADIUS = 400;
const MID_ROW = 6;

interface IslandDef {
  id: TerritoryId;
  name: string;
  cells: [number, number][];
}

/** Полная геометрия одного варианта карты. */
interface MapConfig {
  rowCounts: number[];
  islands: IslandDef[];
  /** Рога изобилия: [строка, номер, количество]. */
  cornucopias: Array<[number, number, number]>;
  /**
   * Масштаб отрисовки доски (по умолчанию 1). Для широких карт < 1: позиции и
   * фигуры считаются обычным шагом, а весь слой доски на клиенте сжимается вокруг
   * центра, чтобы уместиться в диск (BOARD_RADIUS) без наложения клеток.
   */
  displayScale?: number;
}

// --- Большая карта (2 и 4 игрока) ---
const LARGE_MAP: MapConfig = {
  rowCounts: [4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4],
  // Острова — связные группы клеток суши. Число слотов застройки = число клеток.
  islands: [
    { id: 'home_n', name: 'Афины', cells: [[2, 1], [2, 2], [3, 1], [3, 2]] },
    { id: 'home_e', name: 'Спарта', cells: [[3, 5], [3, 6]] },
    { id: 'home_w', name: 'Коринф', cells: [[7, 1], [8, 1], [8, 2]] },
    { id: 'home_s', name: 'Фивы', cells: [[7, 8], [8, 7], [9, 6], [10, 5]] },

    { id: 'delos', name: 'Делос', cells: [[4, 4], [5, 5]] },
    { id: 'naxos', name: 'Наксос', cells: [[6, 4], [7, 4]] },
    { id: 'milos', name: 'Милос', cells: [[5, 2]] },
    { id: 'paros', name: 'Парос', cells: [[5, 7]] },
    { id: 'serifos', name: 'Серифос', cells: [[7, 6]] },
    { id: 'thira', name: 'Тира', cells: [[9, 3], [10, 2], [10, 3]] },
  ],
  cornucopias: [
    [1, 1, 1], [1, 4, 1], [6, 1, 1], [6, 9, 1], [11, 1, 1], [11, 4, 1], // вода (6 по краям)
    [3, 5, 1], [5, 2, 2], [5, 5, 1], [5, 7, 2], [6, 4, 1], [7, 6, 2], // суша
  ],
};

// --- Малая карта (3 игрока) ---
// Строки 2-3-4-5-6-7-6-5-4-3-2. Острова и рога — по спецификации партии на 3.
const SMALL_MAP: MapConfig = {
  rowCounts: [2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2],
  islands: [
    { id: 'm_kea', name: 'Кеа', cells: [[2, 1]] },
    { id: 'm_andros', name: 'Андрос', cells: [[3, 3], [3, 4]] },
    { id: 'm_tinos', name: 'Тинос', cells: [[4, 2], [5, 3]] },
    { id: 'm_mykonos', name: 'Миконос', cells: [[5, 5]] },
    { id: 'm_syros', name: 'Сирос', cells: [[6, 2], [7, 1], [7, 2]] },
    { id: 'm_rinia', name: 'Риния', cells: [[7, 4]] },
    { id: 'm_naxos', name: 'Наксос', cells: [[7, 6], [8, 5], [9, 4], [10, 3]] },
    { id: 'm_paros', name: 'Парос', cells: [[9, 1], [10, 1], [11, 1]] },
  ],
  cornucopias: [
    [1, 2, 1], [6, 1, 1], [6, 7, 1], [11, 2, 1], // вода
    [2, 1, 2], [3, 3, 1], [5, 3, 1], [5, 5, 2], [7, 4, 2], // суша
  ],
};

// --- Карта на 5 игроков ---
// Строки 6-7-8-9-10-11-10-9-8-7-6. 13 островов; шаг клетки сжат, чтобы 11
// клеток в ряду уместились в диск доски.
const FIVE_MAP: MapConfig = {
  rowCounts: [6, 7, 8, 9, 10, 11, 10, 9, 8, 7, 6],
  displayScale: 0.82,
  islands: [
    { id: 'f_andros', name: 'Андрос', cells: [[1, 4], [2, 5]] },
    { id: 'f_evia', name: 'Эвбея', cells: [[2, 1], [2, 2], [3, 1], [3, 2]] },
    { id: 'f_tinos', name: 'Тинос', cells: [[4, 4], [5, 5]] },
    { id: 'f_mykonos', name: 'Миконос', cells: [[4, 6], [4, 7]] },
    { id: 'f_delos', name: 'Делос', cells: [[6, 7]] },
    { id: 'f_ikaria', name: 'Икария', cells: [[4, 9], [5, 9]] },
    { id: 'f_kythnos', name: 'Кифнос', cells: [[5, 2]] },
    { id: 'f_serifos', name: 'Серифос', cells: [[6, 4], [7, 4]] },
    { id: 'f_milos', name: 'Милос', cells: [[7, 1], [8, 1], [8, 2]] },
    { id: 'f_naxos', name: 'Наксос', cells: [[7, 10], [8, 9], [9, 8], [10, 7]] },
    { id: 'f_paros', name: 'Парос', cells: [[8, 7]] },
    { id: 'f_sifnos', name: 'Сифнос', cells: [[9, 3], [10, 2], [10, 3]] },
    { id: 'f_ios', name: 'Иос', cells: [[9, 5], [10, 5], [11, 5]] },
  ],
  cornucopias: [
    [1, 1, 1], [1, 6, 1], [6, 1, 1], [6, 11, 1], [11, 1, 1], [11, 6, 1], // вода
    [1, 4, 1], [4, 6, 1], [5, 2, 2], [5, 5, 1], [5, 9, 1], [6, 4, 1], [6, 7, 2], [8, 7, 2], // суша
  ],
};

/** Геометрия карты под число игроков: 2/3 — малая, 5 — большая, иначе — стандартная. */
export function mapConfigFor(numPlayers: number): MapConfig {
  if (numPlayers === 2 || numPlayers === 3) return SMALL_MAP;
  if (numPlayers === 5) return FIVE_MAP;
  return LARGE_MAP;
}

/** Масштаб отрисовки доски под число игроков (1 — обычный, < 1 — сжатие). */
export function displayScaleFor(numPlayers: number): number {
  return mapConfigFor(numPlayers).displayScale ?? 1;
}

/** Раскладка строк по умолчанию (стандартная карта) — для cellToPixel без явной карты. */
export const ROW_COUNTS = LARGE_MAP.rowCounts;

/** Пиксельная позиция центра клетки (row, col), нумерация с 1. */
export function cellToPixel(
  row: number,
  col: number,
  rowCounts: number[] = ROW_COUNTS,
  spacing: number = CELL_D,
): Point {
  const count = rowCounts[row - 1];
  return {
    x: BOARD_CENTER.x + (col - (count + 1) / 2) * spacing,
    y: BOARD_CENTER.y + (row - MID_ROW) * spacing * 0.866,
  };
}

const ckey = (row: number, col: number) => `${row}_${col}`;
const seaId = (row: number, col: number) => `s_${row}_${col}`;

function centroid(pts: Point[]): Point {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

/** Создаёт свежую доску под число игроков: море + острова со всей смежностью. */
export function createBoard(numPlayers: number): Record<TerritoryId, Territory> {
  const cfg = mapConfigFor(numPlayers);
  const { rowCounts, islands, cornucopias } = cfg;
  const spacing = CELL_D;

  // 1. Все клетки сетки с позициями.
  const cells: { row: number; col: number; pos: Point }[] = [];
  rowCounts.forEach((count, ri) => {
    const row = ri + 1;
    for (let col = 1; col <= count; col++) cells.push({ row, col, pos: cellToPixel(row, col, rowCounts, spacing) });
  });

  const cellToIsland = new Map<string, TerritoryId>();
  for (const def of islands) for (const [r, c] of def.cells) cellToIsland.set(ckey(r, c), def.id);

  const cornById = new Map<string, number>();
  for (const [r, c, n] of cornucopias) cornById.set(ckey(r, c), (cornById.get(ckey(r, c)) ?? 0) + n);

  const territories: Record<TerritoryId, Territory> = {};

  // 2. Острова.
  for (const def of islands) {
    const landCells: LandCell[] = def.cells.map(([row, col]) => ({ row, col, pos: cellToPixel(row, col, rowCounts, spacing) }));
    const spots: CornucopiaSpot[] = [];
    let cornTotal = 0;
    for (const lc of landCells) {
      const n = cornById.get(ckey(lc.row, lc.col)) ?? 0;
      if (n > 0) {
        cornTotal += n;
        spots.push({ pos: lc.pos, count: n });
      }
    }
    const island: Island = {
      id: def.id,
      kind: 'island',
      name: def.name,
      pos: centroid(landCells.map((c) => c.pos)),
      cells: landCells,
      buildSlots: def.cells.length,
      cornucopia: cornTotal,
      cornucopiaSpots: spots,
      adjacentSeas: [],
      ownerId: null,
      troops: 0,
      buildings: [],
      hasMetropolis: false,
    };
    territories[def.id] = island;
  }

  // 3. Морские клетки (всё, что не суша).
  for (const cell of cells) {
    if (cellToIsland.has(ckey(cell.row, cell.col))) continue;
    const sea: Sea = {
      id: seaId(cell.row, cell.col),
      kind: 'sea',
      name: `Море ${cell.row}·${cell.col}`,
      pos: cell.pos,
      row: cell.row,
      col: cell.col,
      cornucopia: cornById.get(ckey(cell.row, cell.col)) ?? 0,
      adjacentSeas: [],
      adjacentIslands: [],
      ownerId: null,
      fleets: 0,
    };
    territories[sea.id] = sea;
  }

  // 4. Смежность по близости центров (соседи на расстоянии ~spacing).
  const threshold = spacing * 1.15;
  for (const cell of cells) {
    const islandId = cellToIsland.get(ckey(cell.row, cell.col));
    if (islandId) continue; // обрабатываем смежность от лица морских клеток
    const sea = territories[seaId(cell.row, cell.col)] as Sea;
    for (const other of cells) {
      if (other === cell) continue;
      const dist = Math.hypot(other.pos.x - cell.pos.x, other.pos.y - cell.pos.y);
      if (dist > threshold) continue;
      const otherIsland = cellToIsland.get(ckey(other.row, other.col));
      if (otherIsland) {
        if (!sea.adjacentIslands.includes(otherIsland)) sea.adjacentIslands.push(otherIsland);
        const isl = territories[otherIsland] as Island;
        if (!isl.adjacentSeas.includes(sea.id)) isl.adjacentSeas.push(sea.id);
      } else {
        sea.adjacentSeas.push(seaId(other.row, other.col));
      }
    }
  }

  return territories;
}

export function isIsland(t: Territory): t is Island {
  return t.kind === 'island';
}
export function isSea(t: Territory): t is Sea {
  return t.kind === 'sea';
}

/** Остров, занимающий клетку (row,col), либо undefined. */
export function islandAtCell(territories: Record<TerritoryId, Territory>, row: number, col: number): Island | undefined {
  for (const t of Object.values(territories)) {
    if (isIsland(t) && t.cells.some((c) => c.row === row && c.col === col)) return t;
  }
  return undefined;
}

/** Морская клетка (row,col), либо undefined. */
export function seaAtCell(territories: Record<TerritoryId, Territory>, row: number, col: number): Sea | undefined {
  const t = territories[`s_${row}_${col}`];
  return t && isSea(t) ? t : undefined;
}
