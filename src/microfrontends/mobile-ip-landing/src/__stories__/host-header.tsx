import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import logo from './assets/logo.svg';
import s from './host-header.module.css';

/**
 * Заглушка шапки хоста для Storybook: на проде шапку вставляет банк. Липкая. В самом верху страницы
 * прозрачная: фон с лимонами идёт под ней от верха окна, как в макете. Первый экран блока закреплён
 * под шапкой; если он выше окна и уходит под шапку, появляется бежевая подложка с мягким нижним
 * краем, чтобы логотип не ложился на текст. Когда плашка второго раздела наезжает на первый экран и
 * от него остаётся только заголовок, проявляется бежевая подложка, как фон второго экрана (доля
 * --aic-ip-reveal, её ставит блок на свой корень): лимоны и содержимое не просвечивают под
 * логотипом. Логотип один, жёлтый, на обоих экранах: щит 30x35, верх на 15px.
 */
export const HostHeader = ({ height }: { height: number }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      // Корень блока помечен data-aic-ip-root: так его находит и шапка банка (INTEGRATION.md).
      const root = document.querySelector('[data-aic-ip-root]');
      const hero = root?.firstElementChild;
      if (!(root instanceof HTMLElement) || !(hero instanceof HTMLElement)) return;
      // Фон второго экрана — слой ::after закреплённого первого экрана (hero/styles.module.css).
      const veil = getComputedStyle(hero, '::after');
      header.style.setProperty('--aic-ip-host-stage-image', veil.backgroundImage);
      header.style.setProperty('--aic-ip-host-stage-color', veil.backgroundColor);
      // Подложка проявляется вместе с фоном второго экрана, по доле наезда плашки.
      const under = parseFloat(root.style.getPropertyValue('--aic-ip-reveal')) || 0;
      header.style.setProperty('--aic-ip-host-under', String(under));
      // Подложка над первым экраном: только когда он уже уехал под шапку (окно ниже экрана).
      header.toggleAttribute('data-scrolled', hero.getBoundingClientRect().top < height - 0.5);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [height]);

  return (
    <header ref={ref} className={s.header} style={{ height } as CSSProperties}>
      <img className={s['logo-first']} src={logo} alt="Т-Банк" width={30} height={35} />
    </header>
  );
};
