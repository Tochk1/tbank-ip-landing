import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import logo from './assets/logo.svg';
import s from './host-header.module.css';

/**
 * Заглушка шапки хоста для Storybook: на проде шапку вставляет банк. Липкая. В самом верху страницы
 * прозрачная: фон первого экрана идёт под ней от верха окна, как в макете. Как только страница
 * прокручена, под шапкой бежевая подложка цвета фона блока (#f1eee8): содержимое, которое уходит
 * под шапку в конце блока, не просвечивает под логотипом. Логотип один, жёлтый, на обоих экранах:
 * щит 41x48, верх на 24px.
 */
export const HostHeader = ({ height }: { height: number }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      header.toggleAttribute('data-scrolled', window.scrollY > 0);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={ref} className={s.header} style={{ height } as CSSProperties}>
      <img className={s.logo} src={logo} alt="Т-Банк" width={41} height={48} />
    </header>
  );
};
