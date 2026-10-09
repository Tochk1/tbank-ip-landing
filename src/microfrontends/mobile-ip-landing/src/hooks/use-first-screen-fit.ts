import { useEffect } from 'react';
import type { RefObject } from 'react';
import { fitFirstScreen, minScaleFrom } from '../lib/fit';

const px = (style: CSSStyleDeclaration, name: string) =>
  parseFloat(style.getPropertyValue(name)) || 0;

/**
 * Первый экран вместе с корешком в окне (lib/fit.ts, fitFirstScreen). Место под содержимое —
 * минимальная высота первого экрана (окно − шапка) минус корешок. Отступы макета и наименьший
 * отступ берутся из переменных CSS первого экрана, содержимое меряется по offsetHeight (transform
 * на него не влияет). Скрипт ставит --aic-ip-hero-gaps (доля отступов), --aic-ip-hero-scale,
 * --aic-ip-hero-content-h (для компенсации высоты при масштабе) и --aic-ip-hero-h (высота экрана:
 * по ней CSS закрепляет экран, не пряча его низ). Пересчёт в кадре анимации: на resize и при
 * изменении размеров содержимого (форма банка может вырасти от ошибок валидации). На сервере и до
 * скрипта экран как в макете.
 */
export const useFirstScreenFit = (
  heroRef: RefObject<HTMLElement>,
  contentRef: RefObject<HTMLElement>
) => {
  useEffect(() => {
    const hero = heroRef.current;
    const content = contentRef.current;
    if (!hero || !content) return undefined;
    const set = (name: string, value: string) => {
      if (hero.style.getPropertyValue(name) !== value) hero.style.setProperty(name, value);
    };

    let frame = 0;
    const layout = () => {
      frame = 0;
      const style = getComputedStyle(hero);
      const second = content.children[1];
      const top = parseFloat(getComputedStyle(content).paddingTop) || 0;
      const mid = second ? parseFloat(getComputedStyle(second).marginTop) || 0 : 0;
      const { gapShare, scale } = fitFirstScreen({
        room: (parseFloat(style.minHeight) || 0) - px(style, '--aic-ip-peek-h'),
        content: content.offsetHeight - top - mid,
        gaps: [
          px(style, '--aic-ip-hero-gap-top'),
          px(style, '--aic-ip-hero-gap-mid'),
          px(style, '--aic-ip-hero-gap-bottom'),
        ],
        minGap: px(style, '--aic-ip-hero-gap-min'),
        minScale: minScaleFrom(style),
      });
      set('--aic-ip-hero-gaps', String(Math.round(gapShare * 10000) / 10000));
      set('--aic-ip-hero-scale', String(Math.round(scale * 10000) / 10000));
      set('--aic-ip-hero-content-h', `${content.offsetHeight}px`);
      // Высота экрана для закрепления: выше окна он сначала прокручивается до своего низа.
      set('--aic-ip-hero-h', `${hero.offsetHeight}px`);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(layout);
    };

    layout();
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    Array.from(content.children).forEach((child) => observer?.observe(child));
    observer?.observe(hero);
    return () => {
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [heroRef, contentRef]);
};
