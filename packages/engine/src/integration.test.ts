import { describe, it, expect } from 'vitest';
import { Client } from 'boardgame.io/client';
import { CycladesGame } from './game';
import type { CycladesState } from './types';

/** Запускает локального клиента (singleplayer) и возвращает его. */
function makeClient(numPlayers = 2) {
  const client = Client<CycladesState>({ game: CycladesGame, numPlayers });
  client.start();
  return client;
}

describe('интеграция фаз через boardgame.io', () => {
  it('после setup доход начисляется и игра входит в фазу аукциона', () => {
    const client = makeClient(2);
    const { G, ctx } = client.getState()!;
    expect(ctx.phase).toBe('auction');
    // 5 стартовых + доход с рогов (у красного остров Серифос с рогами).
    expect(G.players['0'].gold).toBeGreaterThanOrEqual(5);
    expect(G.auction).not.toBeNull();
    expect(G.auction!.toAct).toBe(ctx.currentPlayer);
  });

  it('полный проход аукциона передаёт ход в фазу действий', () => {
    const client = makeClient(2);
    // Оба игрока уходят к Аполлону — простейший путь закрыть аукцион.
    client.moves.chooseApollo();
    client.moves.chooseApollo();
    let s = client.getState()!;
    // Конкурентных богов никто не взял, но первый «апполонец» должен поставить рог.
    expect(s.G.pendingCornucopia).toBe('0');
    expect(s.ctx.phase).toBe('actions');
    client.moves.placeCornucopia('home_n');
    s = client.getState()!;
    // После установки рога цикл закрывается, игра идёт к следующему аукциону.
    expect(s.G.cycle).toBe(2);
    expect(s.ctx.phase).toBe('auction');
  });

  it('порядок действий — по позиции бога сверху вниз, Аполлон не ходит', () => {
    const client = makeClient(4);
    // Боги цикла 1 при 4 игроках: ares, poseidon, zeus (3 конкурентных) + Аполлон.
    // Игроки берут их «вперемешку», но очередь должна выстроиться по порядку богов.
    client.moves.bidGod('zeus', 1);     // '0' → Зевс (нижний из конкурентных)
    client.moves.bidGod('ares', 1);     // '1' → Арес (верхний)
    client.moves.chooseApollo();        // '2' → Аполлон
    client.moves.bidGod('poseidon', 1); // '3' → Посейдон (средний)

    let s = client.getState()!;
    expect(s.ctx.phase).toBe('actions');
    const order = s.G.actions!.queue.map((t) => `${t.god}:${t.playerId}`);
    // Сверху вниз: Арес('1'), Посейдон('3'), Зевс('0'). Аполлон('2') — вне очереди.
    expect(order).toEqual(['ares:1', 'poseidon:3', 'zeus:0']);
    // Сначала «апполонец» '2' ставит рог изобилия, и только потом ходят боги.
    expect(s.G.pendingCornucopia).toBe('2');
    expect(s.ctx.currentPlayer).toBe('2');
    const isl2 = Object.values(s.G.territories).find((t) => t.kind === 'island' && t.ownerId === '2')!;
    client.moves.placeCornucopia(isl2.id);

    s = client.getState()!;
    expect(s.G.pendingCornucopia).toBeNull();
    expect(s.ctx.currentPlayer).toBe('1'); // первым из богов ходит подкупивший верхнего бога
  });

  it('победитель аукциона исполняет действия и завершает свой ход', () => {
    const client = makeClient(2);
    // '0' берёт Ареса, '1' уходит к Аполлону → в очереди действий только '0'.
    client.moves.bidGod('ares', 1);
    client.moves.chooseApollo();

    let s = client.getState()!;
    expect(s.ctx.phase).toBe('actions');
    expect(s.G.actions!.queue).toHaveLength(1);
    // Сначала '1' (Аполлон) ставит рог изобилия, затем ходит '0' (Арес).
    expect(s.ctx.currentPlayer).toBe('1');
    const isl1 = Object.values(s.G.territories).find((t) => t.kind === 'island' && t.ownerId === '1')!;
    client.moves.placeCornucopia(isl1.id);
    s = client.getState()!;
    expect(s.ctx.currentPlayer).toBe('0');

    // '0' строит крепость на домашнем острове и завершает активацию.
    client.moves.build('home_n');
    s = client.getState()!;
    const home0 = s.G.territories['home_n'];
    expect(home0.kind === 'island' && home0.buildings.some((b) => b.type === 'fortress')).toBe(true);

    client.moves.endGod();
    s = client.getState()!;
    // Цикл закрылся, перешли к следующему.
    expect(s.G.cycle).toBe(2);
  });
});
