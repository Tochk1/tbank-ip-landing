export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Сколько ждать, пока форма станет видимой, прежде чем отказаться от фокуса. */
const FOCUS_WAIT_MS = 2000;

/**
 * Фокус, как только элемент станет видимым: форма под плашкой второго раздела скрыта
 * (visibility), пока к ней прокручивают. Пробуем в каждом кадре, но не дольше FOCUS_WAIT_MS
 * по часам, а не по числу кадров (на 120 Гц кадров вдвое больше). Прекращаем, если фокус
 * уже перевели на другой элемент: пользователь сам выбрал, куда смотреть.
 * Возвращает отмену: блок снимает ожидание при размонтировании и при повторном переходе.
 */
const focusWhenVisible = (field: HTMLElement): (() => void) => {
  const startedAt = performance.now();
  const from = document.activeElement;
  let frame = 0;
  const attempt = () => {
    frame = 0;
    field.focus({ preventScroll: true });
    const current = document.activeElement;
    if (current === field) return;
    if (current !== from && current !== null && current !== document.body) return;
    if (performance.now() - startedAt > FOCUS_WAIT_MS) return;
    frame = window.requestAnimationFrame(attempt);
  };
  attempt();
  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };
};

const noop = () => {};

/**
 * Прокрутка к форме заявки и фокус в первое поле. Форма приходит слотом от банка,
 * поэтому ищем первый интерактивный элемент внутри слота, а не конкретный класс.
 * Первый экран закреплён (position: sticky), к нему прокручиваем по месту в потоке:
 * scrollTarget — начало блока, у него scroll-margin-top на высоту шапки хоста.
 * Возвращает отмену ожидания фокуса (focusWhenVisible).
 */
export const scrollToForm = (
  anchor: HTMLElement | null,
  scrollTarget?: HTMLElement | null
): (() => void) => {
  if (!anchor) return noop;
  (scrollTarget ?? anchor).scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: scrollTarget ? 'start' : 'center',
  });
  const field = anchor.querySelector<HTMLElement>('input, textarea, select, button');
  return field ? focusWhenVisible(field) : noop;
};
