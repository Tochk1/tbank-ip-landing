/**
 * Нижний предел масштаба — правило, а не число: основной текст карт не мельче 12px. Предел =
 * --aic-ip-text-min / --aic-ip-text-body (12px / 15px = 0.8), переменные корня блока. Ниже предела
 * композиция не сжимается, страница прокручивается.
 */
export const minScaleFrom = (style: CSSStyleDeclaration): number => {
  const min = parseFloat(style.getPropertyValue('--aic-ip-text-min'));
  const body = parseFloat(style.getPropertyValue('--aic-ip-text-body'));
  return min > 0 && body > 0 ? Math.min(1, min / body) : 1;
};

const clampScale = (value: number, minScale: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(minScale, value)) : 1;

export type FitInput = {
  /** Высота окна, px (100vh или 100svh в CSS-пикселях блока). */
  viewport: number;
  /** Высота шапки хоста, px. */
  header: number;
  /** Высота окна, под которое нарисован макет второго экрана, px. */
  designViewport: number;
  /** Высота шапки хоста в том же макете, px. */
  designHeader: number;
  /** Нижний предел масштаба (minScaleFrom). */
  minScale: number;
};

export type Fit = {
  /** Масштаб композиции: не больше 1 и не меньше minScale. */
  scale: number;
  /** Сдвиг композиции вниз, px: на окне выше макета область макета стоит по центру. */
  shift: number;
};

/**
 * Второй экран подстраивается по высоте окна: макет нарисован под окно определённой высоты, и всё,
 * что ниже шапки хоста, масштабируется в отношении (окно − шапка) / (окно макета − шапка макета),
 * никогда не увеличиваясь. Масштаб один для всех состояний: шаги и подарки одного размера, при
 * переходе ничего не прыгает. Шапка хоста не масштабируется: она не часть блока, поэтому из
 * отношения вычтена.
 */
export const fitComposition = ({
  viewport,
  header,
  designViewport,
  designHeader,
  minScale,
}: FitInput): Fit => {
  const room = designViewport - designHeader;
  if (viewport <= 0 || room <= 0) return { scale: 1, shift: 0 };
  const scale = clampScale((viewport - header) / room, minScale);
  const shift = Math.max(0, (viewport - header - room) / 2);
  return { scale, shift };
};

export type FirstScreenInput = {
  /** Место под содержимое первого экрана: окно − шапка − высота корешка, px. */
  room: number;
  /** Содержимое без переменных отступов (заголовок, форма, плашки), px. */
  content: number;
  /** Отступы макета: над заголовком, между заголовком и формой, над корешком, px. */
  gaps: [number, number, number];
  /** Наименьший отступ: как между формой и плашками, px. */
  minGap: number;
  minScale: number;
};

export type FirstScreenFit = {
  /** Доля отступов макета: 1 — как в макете, 0 — все отступы minGap. */
  gapShare: number;
  scale: number;
};

/**
 * Первый экран целиком в окне вместе с корешком: место под содержимое — окно − шапка − корешок.
 * Сначала отступы сжимаются пропорционально, от отступов макета до minGap; если и этого мало,
 * содержимое масштабируется, не ниже minScale. При окне макета доля отступов 1 и масштаб 1: экран
 * как в макете.
 */
export const fitFirstScreen = ({
  room,
  content,
  gaps,
  minGap,
  minScale,
}: FirstScreenInput): FirstScreenFit => {
  const design = gaps[0] + gaps[1] + gaps[2];
  const floor = minGap * gaps.length;
  if (room <= 0 || content <= 0 || design <= floor) return { gapShare: 1, scale: 1 };
  const gapShare = Math.min(1, Math.max(0, (room - content - floor) / (design - floor)));
  const scale = gapShare > 0 ? 1 : clampScale(room / (content + floor), minScale);
  return { gapShare, scale };
};
