// Доменная модель Cyclades. Всё состояние игры сериализуемо — его целиком
// гоняем между сервером и клиентами.

export type PlayerId = string;
export type TerritoryId = string;

/** Боги, за которых идёт аукцион каждый цикл. */
export type GodName = 'ares' | 'poseidon' | 'zeus' | 'athena' | 'apollo';

/** Типы зданий. Все четыре на островах игрока дают Метрополию. */
export type BuildingType = 'port' | 'fortress' | 'temple' | 'university';

export const ALL_BUILDINGS: BuildingType[] = ['port', 'fortress', 'temple', 'university'];

export interface Building {
  type: BuildingType;
  ownerId: PlayerId;
}

/** Остров: держит войска, здания и, возможно, Метрополию. Даёт доход. */
export interface Island {
  id: TerritoryId;
  kind: 'island';
  name: string;
  /** Сколько объектов (здания + метрополия) помещается на острове. */
  buildSlots: number;
  /** Доход золотом владельцу за цикл (рога изобилия). */
  prosperity: number;
  adjacentSeas: TerritoryId[];
  // --- динамика ---
  /** Кто контролирует остров (его здания и доход). null — ничей. */
  ownerId: PlayerId | null;
  /** Войска владельца, стоящие на острове. */
  troops: number;
  buildings: Building[];
  hasMetropolis: boolean;
}

/** Морская зона: держит флот. */
export interface Sea {
  id: TerritoryId;
  kind: 'sea';
  name: string;
  adjacentSeas: TerritoryId[];
  adjacentIslands: TerritoryId[];
  // --- динамика ---
  ownerId: PlayerId | null;
  fleets: number;
}

export type Territory = Island | Sea;

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  gold: number;
  /** Жрецы: каждый снижает оплату ставки на 1 GP (минимум 1). */
  priests: number;
  /** Философы: 4 штуки дают Метрополию. */
  philosophers: number;
  /** Доступные к размещению войска (из запаса фигурок). */
  troopsReserve: number;
  /** Доступный к размещению флот. */
  fleetsReserve: number;
  isEliminated: boolean;
}

/** Один лот аукциона: бог на дорожке расположения. */
export interface GodSlot {
  god: GodName;
  /** Кто сейчас стоит на этом боге (последняя ставка). */
  occupantId: PlayerId | null;
  /** Текущая ставка золотом. */
  bid: number;
}

/** Фаза аукциона за богов. */
export interface AuctionPhase {
  kind: 'auction';
  slots: GodSlot[];
  /** Чья очередь делать ставку (индекс в auctionOrder). */
  currentIndex: number;
  /** Порядок ходов в аукционе (вытесненные снова попадают сюда). */
  order: PlayerId[];
}

/** Фаза действий: победители аукциона по очереди исполняют действия бога. */
export interface ActionsPhase {
  kind: 'actions';
  /** Порядок исполнения богов (Арес, Посейдон, Зевс, Афина, затем Аполлоны). */
  resolutionOrder: GodName[];
  /** Индекс текущего бога в resolutionOrder. */
  godIndex: number;
  /** Игрок, исполняющий текущего бога. */
  activePlayerId: PlayerId;
  /** Сколько войск/флота уже нанято в этом ходу (лимит 3 за раз). */
  recruitedThisTurn: number;
  /** Уже строил здание в этом ходу? (1 постройка за активацию бога). */
  hasBuilt: boolean;
}

/** Активная битва (сухопутная или морская). */
export interface Combat {
  territoryId: TerritoryId;
  attackerId: PlayerId;
  defenderId: PlayerId;
  attackerUnits: number;
  defenderUnits: number;
  /** Бонус защитника от крепостей/портов. */
  defenderBonus: number;
  /** Результат последнего броска для показа в UI. */
  lastRoll?: { attackerRoll: number; defenderRoll: number };
  /** Чья очередь решать отступление после раунда. */
  awaitingRetreat: 'defender' | 'attacker' | null;
}

export type Phase =
  | { kind: 'lobby' }
  | { kind: 'income' }
  | AuctionPhase
  | (ActionsPhase & { combat?: Combat })
  | { kind: 'gameOver'; winnerId: PlayerId };

export interface LogEntry {
  cycle: number;
  text: string;
}

export interface GameState {
  /** Растёт при каждом применённом действии — для синхронизации. */
  version: number;
  players: Player[];
  /** Посадка за столом (постоянный порядок). */
  seating: PlayerId[];
  /** Индекс стартового игрока текущего цикла. */
  startPlayerIndex: number;
  cycle: number;
  territories: Record<TerritoryId, Territory>;
  phase: Phase;
  /** Состояние детерминированного ГСЧ (для бросков костей). */
  rngState: number;
  log: LogEntry[];
}

/** Грань боевой кости Cyclades: значения 0,0,1,1,2,3. */
export const COMBAT_DIE: number[] = [0, 0, 1, 1, 2, 3];

/** Лимит фигурок одного типа у игрока (войска / флот). */
export const UNIT_SUPPLY = 8;

/** Сколько единиц можно нанять за одну активацию бога. */
export const MAX_RECRUIT_PER_TURN = 3;

/** Метрополий для победы. */
export const METROPOLIS_TO_WIN = 2;

/** Философов для получения Метрополии. */
export const PHILOSOPHERS_FOR_METROPOLIS = 4;
