import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type CycladesState,
  type CombatRound,
  type CombatReport,
  type PlayerID,
  type TerritoryId,
  COMBAT_DIE,
  isIsland,
  isSea,
} from '@cyclades/engine';

// ===================== Бой: модалка у всех участников =====================

/** Грань боевой кости: 0–3 точки (на кубике Киклад грани 0,0,1,1,2,3). */
function DieFace({ value, color, lost, rolling }: { value: number; color: string; lost?: boolean; rolling?: boolean }) {
  const pips: Record<number, [number, number][]> = {
    0: [], 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[25, 25], [50, 50], [75, 75]],
  };
  return (
    <motion.div className={`cm-die ${lost && !rolling ? 'lost' : ''}`} style={{ ['--die' as any]: color }}
      animate={rolling ? { rotate: [0, 90, 180, 270, 360], y: [0, -14, 0, -8, 0] } : { rotate: 0, y: 0 }}
      transition={rolling ? { duration: 0.5, repeat: Infinity, ease: 'linear' } : { type: 'spring', stiffness: 300, damping: 14 }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {pips[value]?.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="11" />)}
        {value === 0 && <line x1="32" y1="50" x2="68" y2="50" strokeWidth="8" strokeLinecap="round" />}
      </svg>
    </motion.div>
  );
}

/** Ряд фишек стороны: живые — в цвете игрока, погибшие — блёклые и перечёркнутые. */
function UnitRow({ alive, total, color, naval }: { alive: number; total: number; color: string; naval: boolean }) {
  return (
    <div className="cm-units" aria-label={`${alive} из ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span key={i} className={`cm-unit ${i < alive ? '' : 'dead'}`} style={{ ['--pc' as any]: color }}
          animate={i < alive ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.35 }}>
          {naval ? '⛵' : '⚔️'}
        </motion.span>
      ))}
    </div>
  );
}

function outcomeText(r: CombatRound): string {
  if (r.aLost && r.dLost) return 'обе стороны теряют по юниту';
  if (r.dLost) return 'защитник теряет юнита';
  if (r.aLost) return 'атакующий теряет юнита';
  return 'без потерь';
}

/** История раундов: «I · 3 против 2 — защитник теряет юнита». */
function RoundsList({ history, bonus }: { history: CombatRound[]; bonus: number }) {
  if (history.length === 0) return null;
  return (
    <ol className="cm-history">
      {history.map((r, i) => {
        const aBefore = r.attacker + (r.aLost ? 1 : 0);
        const dBefore = r.defender + (r.dLost ? 1 : 0);
        return (
          <li key={i}>
            <b>Раунд {i + 1}:</b> {aBefore}+{r.aDie} = {aBefore + r.aDie} против {dBefore}+{r.dDie}{bonus ? `+${bonus}` : ''} = {dBefore + r.dDie + bonus} — {outcomeText(r)}
          </li>
        );
      })}
    </ol>
  );
}

export function CombatModal({ G, me, moves, nameOf }: {
  G: CycladesState; me: string | null; moves: any; nameOf: (pid: string) => string;
}) {
  const c = G.combat!;
  const loc = G.territories[c.location];
  const attacker = G.players[c.attackerId];
  const defender = G.players[c.defenderId];
  const naval = c.kind === 'naval';
  const myFight = c.attackerId === me;
  const last = c.lastRoll;

  // Кубики «катятся» ~0.9 с после каждого нового раунда, у всех игроков одинаково.
  const [rolling, setRolling] = useState(false);
  const [spin, setSpin] = useState<[number, number]>([1, 2]);
  useEffect(() => {
    if (c.round === 0) return;
    setRolling(true);
    const t = setInterval(() => setSpin([
      COMBAT_DIE[Math.floor(Math.random() * 6)], COMBAT_DIE[Math.floor(Math.random() * 6)],
    ]), 90);
    const stop = setTimeout(() => { clearInterval(t); setRolling(false); }, 900);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [c.round]);

  const startA = c.startAttacker ?? c.attackerUnits;
  const startD = c.startDefender ?? c.defenderUnits;
  const aBefore = last ? last.attacker + (last.aLost ? 1 : 0) : c.attackerUnits;
  const dBefore = last ? last.defender + (last.dLost ? 1 : 0) : c.defenderUnits;
  const aDie = rolling ? spin[0] : last?.aDie ?? 0;
  const dDie = rolling ? spin[1] : last?.dDie ?? 0;

  return (
    <div className="cm-overlay">
      <motion.div className="cm-modal" role="dialog" aria-modal="true" aria-label={`Бой за ${loc?.name}`}
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
        <div className="cm-kicker">{naval ? 'Морской бой' : 'Битва'}{c.round > 0 ? ` · раунд ${c.round}` : ''}</div>
        <h2 className="cm-title">{loc?.name}</h2>

        <div className="cm-arena">
          <div className="cm-side" style={{ ['--pc' as any]: attacker.color }}>
            <div className="cm-role">Атакует</div>
            <div className="cm-name">{nameOf(c.attackerId)}</div>
            <UnitRow alive={c.attackerUnits} total={startA} color={attacker.color} naval={naval} />
          </div>

          <div className="cm-center">
            {last || rolling ? (
              <>
                <div className="cm-dice">
                  <div className="cm-die-col">
                    <DieFace value={aDie} color={attacker.color} lost={last?.aLost} rolling={rolling} />
                    {!rolling && last && <div className="cm-sum">{aBefore}+{last.aDie} = <b>{aBefore + last.aDie}</b></div>}
                  </div>
                  <span className="cm-vs">против</span>
                  <div className="cm-die-col">
                    <DieFace value={dDie} color={defender.color} lost={last?.dLost} rolling={rolling} />
                    {!rolling && last && <div className="cm-sum">{dBefore}+{last.dDie}{c.defenderBonus ? `+${c.defenderBonus}` : ''} = <b>{dBefore + last.dDie + c.defenderBonus}</b></div>}
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {!rolling && last && (
                    <motion.div key={c.round} className="cm-verdict" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                      {outcomeText(last)}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="cm-vs big">против</div>
            )}
          </div>

          <div className="cm-side" style={{ ['--pc' as any]: defender.color }}>
            <div className="cm-role">Защищает{c.defenderBonus ? ` · +${c.defenderBonus} ${naval ? 'порт' : 'крепость'}` : ''}</div>
            <div className="cm-name">{nameOf(c.defenderId)}</div>
            <UnitRow alive={c.defenderUnits} total={startD} color={defender.color} naval={naval} />
          </div>
        </div>

        <RoundsList history={c.history ?? []} bonus={c.defenderBonus} />

        <div className="cm-actions">
          {myFight ? (
            <>
              <button className="cm-roll" disabled={rolling} onClick={() => moves.combatRound()}>🎲 Бросить кубики</button>
              <button className="sub-done" disabled={rolling} onClick={() => moves.combatRetreat()}>Отступить</button>
            </>
          ) : (
            <span className="cm-wait">Кубики бросает {nameOf(c.attackerId)}…</span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/** Итог боя — показывается всем один раз, пока не закроют. */
export function CombatResultModal({ report, G, nameOf, onClose }: {
  report: CombatReport; G: CycladesState; nameOf: (pid: string) => string; onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Решающий раунд сначала докатывается на кубиках, затем объявляется итог.
  const final = report.history[report.history.length - 1];
  const [revealed, setRevealed] = useState(!final);
  const [spin, setSpin] = useState<[number, number]>([1, 2]);
  useEffect(() => {
    if (!final) return;
    const t = setInterval(() => setSpin([
      COMBAT_DIE[Math.floor(Math.random() * 6)], COMBAT_DIE[Math.floor(Math.random() * 6)],
    ]), 90);
    const stop = setTimeout(() => { clearInterval(t); setRevealed(true); }, 900);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [report.id]);
  const loc = G.territories[report.location];
  const winnerId = report.result === 'attacker' ? report.attackerId : report.defenderId;
  const winner = G.players[winnerId];
  const naval = report.kind === 'naval';
  const headline = report.result === 'attacker'
    ? `${nameOf(report.attackerId)} ${naval ? 'захватывает море у' : 'захватывает'} ${loc?.name}`
    : report.result === 'retreat'
      ? `${nameOf(report.attackerId)} отступает от ${loc?.name}`
      : `${nameOf(report.defenderId)} отбивает атаку на ${loc?.name}`;
  return (
    <div className="cm-overlay" onClick={onClose}>
      <motion.div className="cm-modal result" role="dialog" aria-modal="true" aria-label="Итог боя"
        style={{ ['--pc' as any]: winner?.color }} onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
        {final && (
          <div className="cm-dice">
            <DieFace value={revealed ? final.aDie : spin[0]} color={G.players[report.attackerId]?.color} lost={final.aLost} rolling={!revealed} />
            <span className="cm-vs">против</span>
            <DieFace value={revealed ? final.dDie : spin[1]} color={G.players[report.defenderId]?.color} lost={final.dLost} rolling={!revealed} />
          </div>
        )}
        {!revealed ? (
          <div className="cm-kicker">Решающий бросок…</div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="cm-kicker">{naval ? 'Морской бой окончен' : 'Битва окончена'}</div>
            <h2 className="cm-title">{report.result === 'retreat' ? 'Отступление' : 'Победа'}</h2>
            <div className="cm-headline">{headline}</div>
          </motion.div>
        )}
        <div className="cm-score">
          <span style={{ color: G.players[report.attackerId]?.color }}>{nameOf(report.attackerId)}: {report.attackerLeft} из {report.startAttacker}</span>
          <span style={{ color: G.players[report.defenderId]?.color }}>{nameOf(report.defenderId)}: {report.defenderLeft} из {report.startDefender}</span>
        </div>
        <RoundsList history={report.history} bonus={report.defenderBonus} />
        <div className="cm-actions"><button className="cm-roll" autoFocus onClick={onClose}>Продолжить</button></div>
      </motion.div>
    </div>
  );
}

// ===================== Претендент на победу =====================

export function VictoryBanner({ G, nameOf }: { G: CycladesState; nameOf: (pid: string) => string }) {
  const holders = G.metroHolders ?? [];
  if (holders.length === 0 || G.winner) return null;
  return (
    <div className="victory-banner" role="status">
      🏛️ {holders.map(nameOf).join(', ')} {holders.length > 1 ? 'держат' : 'держит'} две Метрополии —
      если устоят до конца цикла, {holders.length > 1 ? 'игра закончится' : 'победа'}!
    </div>
  );
}

// ===================== Ручной режим =====================

export function ManualPanel({ G, ctx, me, moves, selected, nameOf, onClose }: {
  G: CycladesState; ctx: any; me: string | null; moves: any; selected: TerritoryId | null;
  nameOf: (pid: string) => string; onClose: () => void;
}) {
  const sel = selected ? G.territories[selected] : null;
  const players: PlayerID[] = ctx.playOrder;
  const [target, setTarget] = useState<PlayerID>(me ?? players[0]);
  const edit = (op: any) => moves.manualEdit(op);
  const figure = sel ? G.boardCreatures.find((c) => c.location === sel.id) : null;
  const effects = !!(G.combat || G.fleetMove || G.sphinxResell || G.sylphMove || G.krakenMove || G.polyphemusPush
    || G.pegasusMove || G.chimeraPick || G.satyrSteal || G.cyclopsSwap);

  // Кому добавлять фишку: на занятой клетке — владельцу, иначе выбранному игроку.
  const unitOwner = sel && (isIsland(sel) ? (sel.troops > 0 ? sel.ownerId : null) : sel.fleets > 0 ? sel.ownerId : null);

  return (
    <div className="manual-panel" role="dialog" aria-label="Ручной режим">
      <div className="mp-head">
        <b>✋ Ручной режим</b>
        <button className="sub-done" onClick={onClose} aria-label="Закрыть ручной режим">✕</button>
      </div>
      <div className="mp-hint">Для исправления ошибок. Каждая правка пишется в журнал.</div>

      <div className="mp-section">
        <div className="mp-label">Игрок для новых фишек</div>
        <div className="mp-players">
          {players.map((pid) => (
            <button key={pid} className={`mp-chip ${target === pid ? 'on' : ''}`} style={{ ['--pc' as any]: G.players[pid].color }}
              aria-pressed={target === pid} onClick={() => setTarget(pid)}>{nameOf(pid)}</button>
          ))}
        </div>
      </div>

      <div className="mp-section">
        <div className="mp-label">Клетка: <b>{sel ? sel.name : 'кликните по карте'}</b></div>
        {sel && isIsland(sel) && (
          <>
            <div className="mp-row">
              <span>Войска{sel.ownerId ? ` (${nameOf(sel.ownerId)})` : ''}</span>
              <button className="sub-done" disabled={sel.troops <= 0} onClick={() => edit({ kind: 'troops', territory: sel.id, delta: -1 })}>−</button>
              <b className="mp-num">{sel.troops}</b>
              <button className="sub-done" onClick={() => edit({ kind: 'troops', territory: sel.id, delta: 1, owner: unitOwner ?? target })}>+</button>
            </div>
            <div className="mp-row">
              <span>Владелец</span>
              <select value={sel.ownerId ?? ''} onChange={(e) => edit({ kind: 'owner', territory: sel.id, owner: e.target.value || null })}>
                <option value="">ничей</option>
                {players.map((pid) => <option key={pid} value={pid}>{nameOf(pid)}</option>)}
              </select>
            </div>
            <div className="mp-row">
              <span>Метрополия</span>
              <button className="sub-done" onClick={() => edit({ kind: 'metropolis', territory: sel.id })}>
                {sel.hasMetropolis ? 'Снять' : 'Поставить'}
              </button>
            </div>
          </>
        )}
        {sel && isSea(sel) && (
          <div className="mp-row">
            <span>Корабли{sel.ownerId ? ` (${nameOf(sel.ownerId)})` : ''}</span>
            <button className="sub-done" disabled={sel.fleets <= 0} onClick={() => edit({ kind: 'fleets', territory: sel.id, delta: -1 })}>−</button>
            <b className="mp-num">{sel.fleets}</b>
            <button className="sub-done" onClick={() => edit({ kind: 'fleets', territory: sel.id, delta: 1, owner: unitOwner ?? target })}>+</button>
          </div>
        )}
        {figure && (
          <div className="mp-row">
            <span>Фигура существа</span>
            <button className="sub-done" onClick={() => edit({ kind: 'removeFigure', territory: sel!.id })}>Убрать</button>
          </div>
        )}
      </div>

      <div className="mp-section">
        <div className="mp-label">Ресурсы игроков</div>
        <table className="mp-table">
          <thead><tr><th></th><th>🪙</th><th>⚜️</th><th>📜</th></tr></thead>
          <tbody>
            {players.map((pid) => {
              const p = G.players[pid];
              const cell = (field: 'gold' | 'priests' | 'philosophers') => (
                <td>
                  <span className="mp-step">
                    <button className="sub-done" aria-label={`Уменьшить у ${nameOf(pid)}`} disabled={p[field] <= 0}
                      onClick={() => edit({ kind: 'resource', player: pid, field, delta: -1 })}>−</button>
                    <b>{p[field]}</b>
                    <button className="sub-done" aria-label={`Увеличить у ${nameOf(pid)}`}
                      onClick={() => edit({ kind: 'resource', player: pid, field, delta: 1 })}>+</button>
                  </span>
                </td>
              );
              return (
                <tr key={pid}>
                  <th style={{ color: p.color }}>{nameOf(pid)}</th>
                  {cell('gold')}{cell('priests')}{cell('philosophers')}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="end-turn mp-cancel" disabled={!effects} onClick={() => edit({ kind: 'cancelEffects' })}>
        Отменить бой и эффекты существ
      </button>
    </div>
  );
}
