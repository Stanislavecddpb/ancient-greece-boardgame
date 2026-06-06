import { describe, it, expect } from 'vitest';
import { resolveCombat } from './combat';

const always = (v: number) => () => v;

describe('бой', () => {
  it('перевес атакующего: защитник уничтожен', () => {
    const r = resolveCombat(3, 1, 0, always(0));
    expect(r.defenderLeft).toBe(0);
    expect(r.attackerLeft).toBe(3);
  });

  it('бонус защитника (крепость/порт) может отбить атаку', () => {
    const r = resolveCombat(1, 1, 5, always(0));
    expect(r.attackerLeft).toBe(0);
    expect(r.defenderLeft).toBe(1);
  });

  it('при равенстве теряют обе стороны', () => {
    const r = resolveCombat(2, 2, 0, always(0));
    expect(r.attackerLeft).toBe(0);
    expect(r.defenderLeft).toBe(0);
    expect(r.rounds[0].aLost && r.rounds[0].dLost).toBe(true);
  });
});
