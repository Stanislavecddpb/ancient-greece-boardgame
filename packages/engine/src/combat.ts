import { COMBAT_DIE } from './types';

/** Функция броска: возвращает значение грани боевой кости (0,0,1,1,2,3). */
export type DieRoll = () => number;

/** Создаёт DieRoll поверх boardgame.io random (random.Die(6) → грань кости). */
export function dieFromRandom(random: { Die: (n: number) => number }): DieRoll {
  return () => COMBAT_DIE[random.Die(6) - 1];
}

export interface CombatResult {
  attackerLeft: number;
  defenderLeft: number;
  rounds: Array<{ attacker: number; defender: number; aLost: boolean; dLost: boolean }>;
}

/**
 * Авторазрешение боя до уничтожения одной из сторон (без отступления — пока MVP).
 * Каждый раунд: бросок + число юнитов (+ бонус защитника от крепости/порта).
 * Меньшее значение теряет юнит; при равенстве теряют оба.
 */
export function resolveCombat(
  attackerUnits: number,
  defenderUnits: number,
  defenderBonus: number,
  roll: DieRoll,
  maxRounds = 100,
): CombatResult {
  let atk = attackerUnits;
  let def = defenderUnits;
  const rounds: CombatResult['rounds'] = [];

  for (let i = 0; i < maxRounds && atk > 0 && def > 0; i++) {
    const a = roll() + atk;
    const d = roll() + def + defenderBonus;
    let aLost = false;
    let dLost = false;
    if (a > d) dLost = true;
    else if (d > a) aLost = true;
    else { aLost = true; dLost = true; }
    if (aLost) atk -= 1;
    if (dLost) def -= 1;
    rounds.push({ attacker: atk, defender: def, aLost, dLost });
  }

  return { attackerLeft: atk, defenderLeft: def, rounds };
}
