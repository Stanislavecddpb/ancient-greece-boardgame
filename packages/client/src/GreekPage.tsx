import type { ReactNode } from 'react';

/**
 * Общая «античная» обложка для экранов вне партии (главная, комната, лобби):
 * ночное Эгейское море, меандр по краям, заголовок-надпись.
 */
export function GreekPage({ title = 'Cyclades', subtitle, wide, children }: {
  title?: string; subtitle?: string; wide?: boolean; children: ReactNode;
}) {
  return (
    <div className="greek">
      <div className="greek-meander" aria-hidden="true" />
      <main className={`greek-main ${wide ? 'wide' : ''}`}>
        <header className="greek-head">
          <Laurel />
          <h1>{title}</h1>
          {subtitle && <p className="greek-sub">{subtitle}</p>}
          <div className="greek-rule" aria-hidden="true"><span>◆</span></div>
        </header>
        {children}
      </main>
      <div className="greek-meander bottom" aria-hidden="true" />
    </div>
  );
}

/** Лавровый венок над заголовком (процедурный SVG). */
function Laurel() {
  // Ветвь — дуга окружности радиуса R от низа (80°) к верхнему краю (−55°);
  // листья сидят на дуге парами: один чуть наружу, другой чуть внутрь.
  const R = 26;
  const steps = Array.from({ length: 8 }, (_, i) => 80 - i * (135 / 7));
  const branch = (flip: boolean) => (
    <g transform={flip ? 'scale(-1 1)' : undefined}>
      <path d={`M${R * Math.cos((80 * Math.PI) / 180)} ${R * Math.sin((80 * Math.PI) / 180)} A${R} ${R} 0 0 0 ${R * Math.cos((-55 * Math.PI) / 180)} ${R * Math.sin((-55 * Math.PI) / 180)}`}
        fill="none" stroke="currentColor" strokeWidth="1.2" />
      {steps.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return [-1, 1].map((side) => {
          const r = R + side * 3.2;
          const x = r * Math.cos(a), y = r * Math.sin(a);
          const rot = deg - 90 + side * 28; // вдоль дуги, с развалом
          return <ellipse key={`${i}${side}`} cx={x} cy={y} rx="5.2" ry="1.9" transform={`rotate(${rot} ${x} ${y})`} fill="currentColor" />;
        });
      })}
    </g>
  );
  return (
    <svg className="greek-laurel" viewBox="-36 -30 72 62" aria-hidden="true">
      {branch(false)}
      {branch(true)}
    </svg>
  );
}

/** Названия цветов фишек для подсказок. */
export const COLOR_NAMES: Record<string, string> = {
  '#d64545': 'красный', '#3b414b': 'чёрный', '#3b7dd8': 'синий', '#e0b341': 'жёлтый', '#3f9b4f': 'зелёный',
};

/** Выбор числа игроков плитками вместо выпадающего списка. */
export function PlayerCountPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="greek-count" role="radiogroup" aria-label="Число игроков">
      {[2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n}
          className={value === n ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>
      ))}
    </div>
  );
}
