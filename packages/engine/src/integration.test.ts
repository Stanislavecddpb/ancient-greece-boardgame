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

/** Хост стартует игру (выход из лобби в аукцион). */
function startGame(client: ReturnType<typeof makeClient>) {
  client.moves.startGame();
}

/** Остров, принадлежащий игроку pid. */
function islandOf(G: CycladesState, pid: string): string {
  return Object.values(G.territories).find((t) => t.kind === 'island' && t.ownerId === pid)!.id;
}

describe('интеграция фаз через boardgame.io', () => {
  it('до старта — фаза лобби, после startGame — аукцион с доходом', () => {
    const client = makeClient(2);
    expect(client.getState()!.ctx.phase).toBe('lobby');
    startGame(client);
    const { G, ctx } = client.getState()!;
    expect(ctx.phase).toBe('auction');
    expect(G.started).toBe(true);
    expect(G.players['0'].gold).toBeGreaterThanOrEqual(5);
    expect(G.auction).not.toBeNull();
    expect(G.auction!.toAct).toBe(ctx.currentPlayer);
  });

  it('полный проход аукциона передаёт ход в фазу действий', () => {
    const client = makeClient(2);
    startGame(client);
    // Оба игрока (в порядке хода) уходят к Аполлону — простейший способ закрыть аукцион.
    client.moves.chooseApollo();
    client.moves.chooseApollo();
    let s = client.getState()!;
    // Никто не взял конкурентного бога, но первый «апполонец» ставит рог.
    expect(s.ctx.phase).toBe('actions');
    const pid = s.G.pendingCornucopia!;
    expect(pid).not.toBeNull();
    expect(s.ctx.currentPlayer).toBe(pid);
    client.moves.placeCornucopia(islandOf(s.G, pid));
    s = client.getState()!;
    expect(s.G.cycle).toBe(2);
    expect(s.ctx.phase).toBe('auction');
  });

  it('порядок действий — по позиции бога сверху вниз, Аполлон не ходит', () => {
    const client = makeClient(4);
    startGame(client);
    // Назначаем каждому игроку фиксированного бога, кто бы ни ходил первым:
    // '0'→Зевс, '1'→Арес, '2'→Аполлон, '3'→Посейдон.
    const plan: Record<string, () => void> = {
      '0': () => client.moves.bidGod('zeus', 1),
      '1': () => client.moves.bidGod('ares', 1),
      '2': () => client.moves.chooseApollo(),
      '3': () => client.moves.bidGod('poseidon', 1),
    };
    let guard = 0;
    while (client.getState()!.ctx.phase === 'auction' && guard++ < 10) {
      plan[client.getState()!.ctx.currentPlayer]();
    }

    let s = client.getState()!;
    expect(s.ctx.phase).toBe('actions');
    const order = s.G.actions!.queue.map((t) => `${t.god}:${t.playerId}`);
    // Сверху вниз: Арес('1'), Посейдон('3'), Зевс('0'). Аполлон('2') — вне очереди.
    expect(order).toEqual(['ares:1', 'poseidon:3', 'zeus:0']);
    // Сначала «апполонец» '2' ставит рог изобилия.
    expect(s.G.pendingCornucopia).toBe('2');
    expect(s.ctx.currentPlayer).toBe('2');
    client.moves.placeCornucopia(islandOf(s.G, '2'));

    s = client.getState()!;
    expect(s.G.pendingCornucopia).toBeNull();
    expect(s.ctx.currentPlayer).toBe('1'); // первым из богов ходит подкупивший верхнего бога
  });

  it('победитель аукциона исполняет действия и завершает свой ход', () => {
    const client = makeClient(2);
    startGame(client);
    // 2 игрока: открыт один случайный бог. Первый берёт его, второй — Аполлона.
    const first = client.getState()!.ctx.currentPlayer;
    const god = client.getState()!.G.auction!.slots[0].god;
    client.moves.bidGod(god, 1);
    client.moves.chooseApollo();

    let s = client.getState()!;
    expect(s.ctx.phase).toBe('actions');
    expect(s.G.actions!.queue).toHaveLength(1);
    expect(s.G.actions!.queue[0]).toEqual({ god, playerId: first });
    // Сначала «апполонец» ставит рог, затем ходит взявший бога.
    const apolloPid = s.G.pendingCornucopia!;
    expect(s.ctx.currentPlayer).toBe(apolloPid);
    client.moves.placeCornucopia(islandOf(s.G, apolloPid));
    s = client.getState()!;
    expect(s.ctx.currentPlayer).toBe(first);

    // Взявший бога строит здание на своём острове и завершает активацию.
    const myIsland = islandOf(s.G, first);
    const islBefore = s.G.territories[myIsland];
    const before = islBefore.kind === 'island' ? islBefore.buildings.length : 0;
    client.moves.build(myIsland);
    s = client.getState()!;
    const isl = s.G.territories[myIsland];
    expect(isl.kind === 'island' && isl.buildings.length).toBe(before + 1);

    client.moves.endGod();
    s = client.getState()!;
    expect(s.G.cycle).toBe(2);
  });
});
