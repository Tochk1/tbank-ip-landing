import cn from 'classnames';
import { useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useFirstScreenFit } from '../../hooks/use-first-screen-fit';
import { Html } from '../../lib/html';
import { Icon } from '../icon/icon';
import { Picture } from '../picture/picture';
import type { Benefit, Picture as PictureData } from '../../types';
import s from './styles.module.css';

type HeroProps = {
  titleHtml: string;
  background: PictureData;
  formTitle: string;
  /** null — формы нет: карточка формы не рендерится. */
  form: ReactNode;
  formRef: RefObject<HTMLDivElement>;
  benefits: Benefit[];
  /** Фон заходит под шапку хоста до верха окна (проп блока bleedUnderHeader). */
  bleed: boolean;
};

export const Hero = ({
  titleHtml,
  background,
  formTitle,
  form,
  formRef,
  benefits,
  bleed,
}: HeroProps) => {
  const heroRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useFirstScreenFit(heroRef, contentRef);

  return (
    <section ref={heroRef} className={cn(s.hero, bleed && s['hero-bleed'])}>
      {/* Содержимое масштабируется целиком, если и с наименьшими отступами не влезает в окно. */}
      <div ref={contentRef} className={s.content}>
        <Html as="h1" html={titleHtml} className={s.title} />

        <div className={s.offer}>
          {/* Лимоны привязаны к форме и лежат под ней. */}
          <Picture picture={background} className={s.lemons} priority />

          {/* Край, на котором белая плашка второго раздела закрывает всё, кроме заголовка
              (data-aic-ip-cover-edge, hooks/use-scroll-steps.ts): форма, а без неё плашки. */}
          {form !== null && (
            <div className={s['form-card']} ref={formRef} data-aic-ip-cover-edge="">
              <p className={s['form-title']}>{formTitle}</p>
              <div className={s['form-slot']}>{form}</div>
            </div>
          )}

          {benefits.length > 0 && (
            <ul className={s.benefits} data-aic-ip-cover-edge={form === null ? '' : undefined}>
              {benefits.map((benefit) => (
                <li key={benefit.id} className={s.benefit}>
                  <Html html={benefit.textHtml} className={s['benefit-text']} />
                  <Icon name={benefit.icon} className={s['benefit-icon']} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
