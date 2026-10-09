import cn from 'classnames';
import { useRef } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { useHintNudge } from '../../hooks/use-hint-nudge';
import { useScrollSteps } from '../../hooks/use-scroll-steps';
import { Html, safeHref, toPlainText } from '../../lib/html';
import { Icon } from '../icon/icon';
import { Picture } from '../picture/picture';
import type { Process } from '../../types';
import s from './styles.module.css';

type ProcessSectionProps = {
  id: string;
  process: Process;
  /** null — формы нет: вкладка и кнопка, которые ведут к ней, не рендерятся. */
  onToForm: (() => void) | null;
};

/** Порядок появления в списке подарков: значок, подарки по одному, «Остались вопросы?». */
const revealOrder = (index: number) => ({ '--aic-ip-i': index }) as CSSProperties;

export const ProcessSection = ({ id, process, onToForm }: ProcessSectionProps) => {
  const { steps, gift } = process;
  const statesCount = steps.length + 1;
  const { trackRef, stageRef, cardRef, active, mode, goTo, segments } = useScrollSteps(
    statesCount,
    Boolean(onToForm)
  );
  const list = mode === 'list';
  const giftActive = !list && active === steps.length;
  const withMarker = Boolean(gift.marker?.src);
  const stepLabel = (n: number) => process.stepLabel.replace('{n}', String(n));
  const helpHref = safeHref(gift.help.href);
  const sectionRef = useRef<HTMLElement>(null);
  const peekRef = useRef<HTMLAnchorElement>(null);
  useHintNudge(sectionRef, peekRef);

  /**
   * Корешок ведёт к первому шагу плавной прокруткой, как вкладка к форме. Без JS остаётся
   * обычный якорь. Фокус переходит в раздел, как при переходе по якорю.
   */
  const toSteps = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    goTo(0);
    sectionRef.current?.focus({ preventScroll: true });
  };

  return (
    <section
      ref={sectionRef}
      className={cn(s.process, list && s.list)}
      id={id}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
    >
      {/* Корешок: верхний край раздела, выступает на первый экран и двигается вместе с разделом. */}
      <a ref={peekRef} href={`#${id}`} className={s.peek} onClick={toSteps}>
        {process.title}
      </a>
      <div
        ref={trackRef}
        className={s.track}
        style={{ '--aic-ip-states': statesCount, '--aic-ip-segments': segments } as CSSProperties}
      >
        <div ref={stageRef} className={s.stage} data-aic-ip-stage="">
          <div className={s.frame}>
            {onToForm && (
              <button type="button" className={s.tab} onClick={onToForm}>
                {process.tabLabel}
              </button>
            )}

            <div ref={cardRef} className={s.card}>
              <h2 className={s.title} id={`${id}-title`}>
                {process.title}
              </h2>

              {/* Окно содержимого: на экране подарков плашка стоит, листается то, что внутри. */}
              <div
                className={cn(s.scroller, giftActive && s['scroller-gift'])}
                data-aic-ip-scroll=""
              >
                <div className={s['scroll-content']}>
                  <div className={cn(s.body, giftActive && s['body-gift'])}>
                    <div className={s['deck-row']} data-aic-ip-row="deck">
                      {/* Индикатор слева от карты, как на мобайле. */}
                      <div className={s['deck-area']}>
                        <ol
                          className={s.progress}
                          style={{ '--aic-ip-active': active } as CSSProperties}
                        >
                          {steps.map((step, index) => (
                            <li key={step.id} className={s['progress-item']}>
                              {index === active ? (
                                <span className={s.pill} aria-current="step">
                                  {stepLabel(index + 1)}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className={s.dot}
                                  aria-label={`${stepLabel(index + 1)}: ${toPlainText(
                                    step.titleHtml
                                  )}`}
                                  onClick={() => goTo(index)}
                                />
                              )}
                            </li>
                          ))}
                          {/* Маркер подарка в DOM всегда, чтобы картинка загрузилась заранее и не мигала. */}
                          <li
                            className={cn(
                              s['progress-item'],
                              s['progress-gift'],
                              giftActive && s['progress-gift-active'],
                              withMarker && s['progress-gift-marker']
                            )}
                          >
                            <button
                              type="button"
                              className={cn(s.dot, s['dot-gift'])}
                              aria-label={gift.label}
                              aria-current={giftActive ? 'step' : undefined}
                              onClick={() => goTo(steps.length)}
                            />
                            <Picture
                              picture={gift.marker}
                              className={s['gift-marker']}
                              width={32}
                              height={32}
                            />
                          </li>
                        </ol>

                        {/* Карта одна и стоит на месте, меняется её содержимое (текст шага). */}
                        <ol className={s.deck}>
                          {steps.map((step, index) => (
                            <li
                              key={step.id}
                              className={cn(
                                s['step-card'],
                                !list && (index === active ? s.current : s.waiting)
                              )}
                            >
                              <div className={s['step-body']}>
                                <Html as="h3" html={step.titleHtml} className={s['step-title']} />
                                <Html as="p" html={step.textHtml} className={s['step-text']} />
                              </div>
                              <p className={s.note}>
                                <Icon name={step.noteIcon} size={24} className={s['note-icon']} />
                                <span>{step.note}</span>
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    <div className={s['gift-row']} data-aic-ip-row="gift">
                      <div className={s.gift}>
                        <div className={s['gift-head']} style={revealOrder(0)}>
                          <p className={s['gift-subtitle']}>{gift.subtitle}</p>
                        </div>
                        {gift.items.length > 0 && (
                          <ul className={s['gift-list']}>
                            {gift.items.map((item, index) => (
                              <li
                                key={item.id}
                                className={s['gift-item']}
                                style={revealOrder(index + 1)}
                              >
                                <div className={s['gift-item-text']}>
                                  <h3 className={s['gift-item-title']}>{item.title}</h3>
                                  <p className={s['gift-item-description']}>{item.text}</p>
                                </div>
                                <Picture
                                  picture={item.image}
                                  className={s['gift-item-image']}
                                  width={56}
                                  height={56}
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                        {helpHref ? (
                          <a
                            className={cn(s.help, s['help-link'])}
                            href={helpHref}
                            style={revealOrder(gift.items.length + 1)}
                          >
                            <span className={s['help-title']}>{gift.help.title}</span>
                            <span className={s['help-text']}>{gift.help.text}</span>
                          </a>
                        ) : (
                          <div className={s.help} style={revealOrder(gift.items.length + 1)}>
                            <p className={s['help-title']}>{gift.help.title}</p>
                            <p className={s['help-text']}>{gift.help.text}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {onToForm && (
                    <button type="button" className={s.cta} onClick={onToForm} data-aic-ip-cta="">
                      {process.ctaLabel}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
