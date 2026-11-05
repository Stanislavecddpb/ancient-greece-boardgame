import {
  type CycladesState,
  type PlayerID,
  type TerritoryId,
  UNIT_SUPPLY,
} from './types';
import { isIsland, isSea } from './board';
import { freeSlots, metropolisSlotCost, log } from './helpers';
import { cancelCombat } from './movement';

/**
 * Ручной режим: правки состояния «руками», чтобы чинить партию, если что-то
 * пошло не так (баг, ошибочный клик, зависший эффект существа). Каждое
 * изменение пишется в журнал, чтобы все за столом видели, кто что поправил.
 */
export type ManualOp =
  | { kind: 'troops'; territory: TerritoryId; delta: 1 | -1; owner?: PlayerID }
  | { kind: 'fleets'; territory: TerritoryId; delta: 1 | -1; owner?: PlayerID }
  | { kind: 'owner'; territory: TerritoryId; owner: PlayerID | null }
  | { kind: 'metropolis'; territory: TerritoryId }
  | { kind: 'removeFigure'; territory: TerritoryId }
  | { kind: 'resource'; player: PlayerID; field: 'gold' | 'priests' | 'philosophers'; delta: number }
  | { kind: 'cancelEffects' };

const RESOURCE_LABEL = { gold: 'золото', priests: 'жрецы', philosophers: 'философы' } as const;

/** Применяет ручную правку. Возвращает текст ошибки или null. */
export function applyManualEdit(G: CycladesState, actor: PlayerID, op: ManualOp): string | null {
  const who = G.players[actor];
  if (!who) return 'нет такого игрока';
  const note = (text: string) => log(G, `✋ Ручной режим — ${who.name}: ${text}.`);

  switch (op?.kind) {
    case 'troops': {
      const isl = G.territories[op.territory];
      if (!isl || !isIsland(isl)) return 'нужен остров';
      if (op.delta > 0) {
        const owner = op.owner ?? isl.ownerId;
        if (!owner || !G.players[owner]) return 'выберите владельца войска';
        if (isl.troops > 0 && isl.ownerId !== owner) return 'на острове войска другого игрока';
        if (G.players[owner].troopsSupply <= 0) return 'у игрока нет войск в запасе';
        if (isl.ownerId !== owner) {
          isl.ownerId = owner;
          for (const b of isl.buildings) b.ownerId = owner;
        }
        isl.troops += 1;
        G.players[owner].troopsSupply -= 1;
        note(`+1 войско (${G.players[owner].name}) на ${isl.name}`);
      } else {
        if (isl.troops <= 0 || !isl.ownerId) return 'на острове нет войск';
        isl.troops -= 1;
        const p = G.players[isl.ownerId];
        p.troopsSupply = Math.min(UNIT_SUPPLY, p.troopsSupply + 1);
        note(`−1 войско (${p.name}) на ${isl.name}`);
      }
      return null;
    }

    case 'fleets': {
      const sea = G.territories[op.territory];
      if (!sea || !isSea(sea)) return 'нужна морская зона';
      if (op.delta > 0) {
        const owner = op.owner ?? sea.ownerId;
        if (!owner || !G.players[owner]) return 'выберите владельца флота';
        if (sea.fleets > 0 && sea.ownerId !== owner) return 'в зоне флот другого игрока';
        if (G.players[owner].fleetsSupply <= 0) return 'у игрока нет кораблей в запасе';
        sea.ownerId = owner;
        sea.fleets += 1;
        G.players[owner].fleetsSupply -= 1;
        note(`+1 корабль (${G.players[owner].name}) в ${sea.name}`);
      } else {
        if (sea.fleets <= 0 || !sea.ownerId) return 'в зоне нет флота';
        const p = G.players[sea.ownerId];
        sea.fleets -= 1;
        p.fleetsSupply = Math.min(UNIT_SUPPLY, p.fleetsSupply + 1);
        if (sea.fleets === 0) sea.ownerId = null;
        note(`−1 корабль (${p.name}) в ${sea.name}`);
      }
      return null;
    }

    case 'owner': {
      const isl = G.territories[op.territory];
      if (!isl || !isIsland(isl)) return 'нужен остров';
      if (op.owner === isl.ownerId) return null;
      if (op.owner !== null && !G.players[op.owner]) return 'нет такого игрока';
      if (isl.troops > 0) {
        // Войска переходят к новому владельцу: старому — в запас, у нового — из запаса.
        if (op.owner === null) return 'сначала уберите войска с острова';
        const next = G.players[op.owner];
        if (next.troopsSupply < isl.troops) return 'у нового владельца не хватает войск в запасе';
        const prev = isl.ownerId ? G.players[isl.ownerId] : null;
        if (prev) prev.troopsSupply = Math.min(UNIT_SUPPLY, prev.troopsSupply + isl.troops);
        next.troopsSupply -= isl.troops;
      }
      isl.ownerId = op.owner;
      for (const b of isl.buildings) b.ownerId = op.owner ?? b.ownerId;
      note(`${isl.name} → ${op.owner ? G.players[op.owner].name : 'ничей'}`);
      return null;
    }

    case 'metropolis': {
      const isl = G.territories[op.territory];
      if (!isl || !isIsland(isl)) return 'нужен остров';
      if (isl.hasMetropolis) {
        isl.hasMetropolis = false;
        note(`снята Метрополия на ${isl.name}`);
        return null;
      }
      if (!isl.ownerId) return 'у острова нет владельца';
      if (freeSlots(isl) < metropolisSlotCost(isl)) return 'на острове нет места под Метрополию';
      isl.hasMetropolis = true;
      note(`поставлена Метрополия на ${isl.name}`);
      return null;
    }

    case 'removeFigure': {
      const t = G.territories[op.territory];
      const fig = G.boardCreatures.find((c) => c.location === op.territory);
      if (!t || !fig) return 'здесь нет фигуры существа';
      G.boardCreatures = G.boardCreatures.filter((c) => c.location !== op.territory);
      if (fig.kind === 'kraken' && G.krakenMove?.at === op.territory) G.krakenMove = null;
      if (fig.kind === 'polyphemus' && G.polyphemusPush?.island === op.territory) G.polyphemusPush = null;
      note(`убрана фигура существа с ${t.name}`);
      return null;
    }

    case 'resource': {
      const p = G.players[op.player];
      if (!p) return 'нет такого игрока';
      const delta = Math.trunc(Number(op.delta) || 0);
      if (!delta) return 'нечего менять';
      const before = p[op.field];
      const after = Math.max(0, Math.min(99, before + delta));
      if (after === before) return 'значение уже на пределе';
      p[op.field] = after;
      note(`${RESOURCE_LABEL[op.field]} у ${p.name}: ${before} → ${after}`);
      return null;
    }

    case 'cancelEffects': {
      const had = !!(G.combat || G.fleetMove || G.sphinxResell || G.sylphMove || G.krakenMove || G.polyphemusPush
        || G.pegasusMove || G.chimeraPick || G.satyrSteal || G.cyclopsSwap);
      if (!had) return 'нет активных эффектов';
      if (G.combat) cancelCombat(G); // выжившие атакующие возвращаются назад
      G.fleetMove = null;
      G.sphinxResell = null;
      G.sylphMove = null;
      G.krakenMove = null;
      G.polyphemusPush = null;
      G.pegasusMove = null;
      G.chimeraPick = null;
      G.satyrSteal = null;
      G.cyclopsSwap = null;
      note('отменены текущий бой и эффекты существ');
      return null;
    }

    default:
      return 'неизвестная правка';
  }
}
