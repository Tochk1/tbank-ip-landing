import { useEffect } from 'react';
import type { RefObject } from 'react';
import { prefersReducedMotion } from '../lib/motion';

/** Подъём 300 мс, задержка наверху 150 мс, возврат 350 мс: всего 800 мс. */
const DURATION = 800;
const LIFT = 'translateY(-16px)';
const KEYFRAMES: Keyframe[] = [
  { transform: 'translateY(0)', easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
  { transform: LIFT, offset: 300 / DURATION, easing: 'linear' },
  { transform: LIFT, offset: 450 / DURATION, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' },
  { transform: 'translateY(0)' },
];

/**
 * Намёк «ниже есть ещё контент» по описанию механики в макете: через ~1 с после загрузки весь
 * второй раздел приподнимается на 16px, держится ~150 мс и возвращается. Двигается раздел целиком,
 * вместе с корешком, поэтому между ними нет щели. Только transform, без прокрутки и без изменения
 * раскладки; один раз за загрузку. Не срабатывает при reduced motion, если человек уже прокрутил
 * страницу или корешка не видно. Анимация без fill: по окончании на разделе не остаётся transform.
 */
export const useHintNudge = (
  sectionRef: RefObject<HTMLElement>,
  peekRef: RefObject<HTMLElement>,
  delay = 1000
) => {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    let animation: Animation | null = null;
    const timer = window.setTimeout(() => {
      const section = sectionRef.current;
      const peek = peekRef.current;
      if (!section || !peek || typeof section.animate !== 'function') return;
      if (window.scrollY > 8) return;
      const { top, bottom } = peek.getBoundingClientRect();
      if (bottom <= 0 || top >= window.innerHeight) return;
      animation = section.animate(KEYFRAMES, { duration: DURATION });
    }, delay);
    return () => {
      window.clearTimeout(timer);
      animation?.cancel();
    };
  }, [sectionRef, peekRef, delay]);
};
