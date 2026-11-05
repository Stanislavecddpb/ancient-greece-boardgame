import { describe, it, expect } from 'vitest';
import type { Ctx } from 'boardgame.io';
import { Client } from 'boardgame.io/client';
import { setupGame } from './setup';
import { applyManualEdit } from './manual';
import { applyCombatRound } from './movement';
import { CycladesGame } from './game';
import { isIsland, isSea } from './board';
import type { CycladesState, Island, Sea } from './types';

function ctxFor(n: number): Ctx {
  return { numPlayers: n, playOrder: Array.from({ length: n }, (_, i) => String(i)), playOrderPos: 0, currentPlayer: '0' } as unknown as Ctx;
}
const ownIsland = (G: CycladesState, pid: string) =>
  Object.values(G.territories).find((t): t is Island => isIsland(t) && t.ownerId === pid)!;
const emptySea = (G: CycladesState) =>
  Object.values(G.territories).find((t): t is Sea => isSea(t) && t.fleets === 0)!;

describe('ручной режим', () => {
  it('войска: добавить берёт из запаса, убрать возвращает в запас', () => {
    const G = setupGame(ctxFor(4));
    const isl = ownIsland(G, '1');
    const t0 = isl.troops, s0 = G.players['1'].troopsSupply;
    expect(applyManualEdit(G, '0', { kind: 'troops', territory: isl.id, delta: 1 })).toBeNull();
    expect(isl.troops).toBe(t0 + 1);
    expect(G.players['1'].troopsSupply).toBe(s0 - 1);
    expect(applyManualEdit(G, '0', { kind: 'troops', territory: isl.id, delta: -1 })).toBeNull();
    expect(G.players['1'].troopsSupply).toBe(s0);
    expect(applyManualEdit(G, '0', { kind: 'troops', territory: isl.id, delta: 1, owner: '2' })).toBe('на острове войска другого игрока');
    expect(G.log.at(-1)!.text).toContain('Ручной режим');
  });

  it('флот: поставить в пустую зону выбранному игроку и убрать', () => {
    const G = setupGame(ctxFor(4));
    const sea = emptySea(G);
    expect(applyManualEdit(G, '3', { kind: 'fleets', territory: sea.id, delta: 1 })).toBe('выберите владельца флота');
    expect(applyManualEdit(G, '3', { kind: 'fleets', territory: sea.id, delta: 1, owner: '2' })).toBeNull();
    expect(sea.ownerId).toBe('2');
    expect(applyManualEdit(G, '3', { kind: 'fleets', territory: sea.id, delta: -1 })).toBeNull();
    expect(sea.fleets).toBe(0);
    expect(sea.ownerId).toBeNull();
  });

  it('золото не уходит в минус; эффекты существ отменяются', () => {
    const G = setupGame(ctxFor(4));
    G.players['2'].gold = 1;
    expect(applyManualEdit(G, '0', { kind: 'resource', player: '2', field: 'gold', delta: -5 })).toBeNull();
    expect(G.players['2'].gold).toBe(0);
    expect(applyManualEdit(G, '0', { kind: 'cancelEffects' })).toBe('нет активных эффектов');
    G.pegasusMove = '1';
    G.sylphMove = { playerId: '1', stepsLeft: 3 };
    expect(applyManualEdit(G, '0', { kind: 'cancelEffects' })).toBeNull();
    expect(G.pegasusMove).toBeNull();
    expect(G.sylphMove).toBeNull();
  });

  it('правку может сделать игрок, чей сейчас не ход', () => {
    const client = Client<CycladesState>({ game: CycladesGame, numPlayers: 4, playerID: '0' });
    client.start();
    client.moves.startGame();
    // Правим от имени любого игрока, кроме текущего.
    const cur = client.getState()!.ctx.currentPlayer;
    const other = ['0', '1', '2', '3'].find((p) => p !== cur)!;
    client.updatePlayerID(other);
    const gold0 = client.getState()!.G.players[other].gold;
    client.moves.manualEdit({ kind: 'resource', player: other, field: 'gold', delta: 3 });
    expect(client.getState()!.G.players[other].gold).toBe(gold0 + 3);
  });
});

describe('итог боя для модалки', () => {
  it('раунды копятся, по окончании боя пишется итог', () => {
    const G = setupGame(ctxFor(4));
    const a = Object.values(G.territories).find((t): t is Sea => isSea(t) && t.adjacentSeas.length > 0)!;
    const b = G.territories[a.adjacentSeas[0]] as Sea;
    a.ownerId = '0'; a.fleets = 0; b.ownerId = '1'; b.fleets = 1;
    G.combat = { kind: 'naval', location: b.id, fromId: a.id, attackerId: '0', defenderId: '1',
      attackerUnits: 2, defenderUnits: 1, defenderBonus: 0, round: 0, lastRoll: null };
    let n = 0;
    const roll = () => (n++ % 2 === 0 ? 3 : 0); // атакующий бросает 3, защитник 0
    applyCombatRound(G, '0', roll);
    expect(G.combat).toBeNull();
    expect(G.lastCombat).toMatchObject({ id: 1, result: 'attacker', startAttacker: 2, startDefender: 1, attackerLeft: 2, defenderLeft: 0 });
    expect(G.lastCombat!.history).toHaveLength(1);
  });
});
