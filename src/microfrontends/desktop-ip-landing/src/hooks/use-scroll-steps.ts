import { useCallback, useEffect, useRef, useState } from 'react';
import { fitComposition, minScaleFrom } from '../lib/fit';
import { prefersReducedMotion } from '../lib/motion';

/**
 * Шаг переключается, когда пройдено 65% его отрезка: следующее состояние появляется
 * чуть раньше середины, и короткий жест прокрутки уже даёт отклик.
 */
export const SWITCH_AT = 0.65;

/**
 * Запасной путь (браузер без scroll-driven animations, см. setGiftScroll): пауза по часам на чтение
 * первой карточки подарков поверх паузы по прокрутке. 1200 мс = 750 мс появления карточки
 * (задержка, проявление и подъём из таймингов в process/styles.module.css) + 450 мс неподвижности.
 * По часам, а не по пикселям: инерция трекпада за один бросок уносит больше всего пробега подарков.
 */
const GIFT_READ_MS = 1200;

/**
 * Сколько места должна занять экранная клавиатура, чтобы считать её открытой, px.
 * Меньше самой низкой клавиатуры телефона и больше полос Safari, которые тоже меняют
 * visualViewport при прокрутке.
 */
const KEYBOARD_MIN = 160;

/**
 * Открыта ли экранная клавиатура: visual viewport ниже окна на KEYBOARD_MIN. Способность
 * окна, а не платформа — на десктопе клавиатуры нет и быть не может, проверка там всегда
 * ложна. Без visualViewport (старые движки) подъёма тоже нет: он нужен только мобильным.
 */
const keyboardUp = (): boolean => {
  const view = typeof window === 'undefined' ? null : window.visualViewport;
  return Boolean(view) && window.innerHeight - (view as VisualViewport).height > KEYBOARD_MIN;
};

/**
 * Умеет ли браузер CSS scroll-driven animations (animation-timeline: scroll()). Проверяется
 * способность, а не платформа: тогда наезд плашки ведёт сам браузер в потоке прокрутки, без
 * отставания на кадр, как у скрипта по событию scroll.
 */
const scrollDrivenSupported = (): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('animation-timeline: scroll()');

/** Сдвиг элемента по вертикали его собственным transform, px (толчок-подсказка, «потянуть»). */
const ownShiftY = (element: Element): number => {
  const { transform } = getComputedStyle(element);
  if (!transform || transform === 'none' || typeof DOMMatrixReadOnly === 'undefined') return 0;
  return new DOMMatrixReadOnly(transform).m42;
};

/** Постоянная сближения содержимого подарков с целью: на 1 − 1/e пути за столько мс. */
const GIFT_EASE_MS = 120;

/**
 * Предел скорости содержимого подарков, px макета на кадр 60 Гц. Основной текст карточек —
 * --aic-ip-text-body (15px) с интерлиньяжем 20px: 9px — меньше половины строки за кадр,
 * на таком ходе текст читается, а не смазывается. Ограничение держит и бросок трекпада,
 * который иначе проносит весь пробег за один-два кадра.
 */
const GIFT_MAX_STEP = 9;

/**
 * Потолок сдвига за ОДИН кадр, px макета, сколько бы кадр ни длился. Предел скорости выше
 * пересчитывается по времени кадра, и на затянувшемся кадре (сборка мусора, возврат во
 * вкладку, конец паузы на чтение) разрешал бы разом 34.6px — видимый рывок ровно в тот
 * момент, когда содержимое трогается и на него смотрят. 18px — строка текста карточек
 * (интерлиньяж 20px) без малого: за один кадр содержимое не уезжает больше чем на строку.
 */
const GIFT_MAX_JUMP = 18;

/**
 * Экран подарков: плашка стоит, листается её содержимое, и листает сама прокрутка страницы — своего
 * контейнера прокрутки нет, колесо и касание не залипают. Отрезок подарков = пауза (SWITCH_AT
 * отрезка, первая карточка стоит) + ход max(остаток отрезка, переполнение). Пауза по прокрутке, а
 * не по часам: содержимое не едет само, когда палец уже стоит. Та же формула в CSS.
 */
const giftSpan = (total: number, states: number, run: number) => {
  // Пробег трека = (состояния − 1) × отрезок + SWITCH_AT × отрезок + max((1 − SWITCH_AT) × отрезок,
  // run).
  const even = states > 0 ? total / states : 0;
  const rest = 1 - SWITCH_AT;
  const segment =
    run <= rest * even || states <= 1 ? even : (total - run) / (states - 1 + SWITCH_AT);
  const pause = SWITCH_AT * segment;
  const travel = Math.max(rest * segment, run);
  return { segment, pause, travel, span: pause + travel };
};

/**
 * sticky — сцена прилипает, шаги листаются прокруткой.
 * list — sticky у хоста не работает (overflow у предков), шаги стоят списком.
 */
export type StepsMode = 'sticky' | 'list';

const CLIPPING = /(auto|scroll|overlay|hidden)/;
const SCROLLING = /(auto|scroll|overlay)/;

/**
 * Ближайший предок, к которому прилипнет sticky: у него overflow, отличный от visible
 * и clip. null — окно. overflow у body браузер отдаёт окну, если у html он visible.
 */
const findStickyContainer = (element: HTMLElement): HTMLElement | null => {
  const root = document.documentElement;
  const rootStyle = getComputedStyle(root);
  const rootVisible = rootStyle.overflowX === 'visible' && rootStyle.overflowY === 'visible';
  for (let node = element.parentElement; node && node !== root; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node);
    if (!CLIPPING.test(overflowX) && !CLIPPING.test(overflowY)) continue;
    if (node === document.body && rootVisible) continue;
    return node;
  }
  return null;
};

/** Контейнер действительно прокручивается сам: тогда sticky работает внутри него. */
const isScroller = (node: HTMLElement) =>
  SCROLLING.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight;

/**
 * Шаги, которые переключаются прокруткой. Трек — это сцена плюс распорка с отрезком на каждый
 * переход (длина отрезка задана только в CSS). Сцена прилипает внутри трека. Номер шага —
 * насколько сцена уже сдвинута внутри трека, в отрезках. Отрезок читается из DOM:
 * (высота трека − высота сцены) / число переходов. На сервере и до гидрации показан первый шаг.
 *
 * Если сцена выше окна, она прилипает со сдвигом min(0, окно − высота сцены): так видны низ
 * карточки и кнопка. Высоту сцены CSS получает переменной --aic-ip-stage-h. Мерим её только
 * в состояниях шагов. На экране подарков окно содержимого плашки закреплено на высоте шагов
 * (формула в CSS из --aic-ip-body-gap, --aic-ip-deck-h и --aic-ip-cta-block), плашка не растёт,
 * и номер шага не зависит от высоты собственного состояния. Содержимое подарков листается
 * внутри плашки (giftSpan), --aic-ip-gift-scroll — его сдвиг в px макета.
 *
 * Второй экран по высоте окна. Всё, что ниже шапки хоста, масштабируется одним масштабом для
 * всех состояний (lib/fit.ts): макет нарисован под окно --aic-ip-design-viewport с шапкой
 * --aic-ip-design-header. Скрипт ставит сцене --aic-ip-scale, --aic-ip-shift (сдвиг вниз на окне
 * выше макета), --aic-ip-frame-h (высота кадра без масштаба, для компенсации) и --aic-ip-fill
 * (сколько кадр должен занять без масштаба, чтобы карточка дошла до низа окна, нужно мобайлу).
 * Высота окна — минимальная высота сцены (100vh или 100svh) из вычисленных стилей, поэтому
 * zoom хоста не мешает. Блоки карточки наблюдаются, чтобы обновлять высоту кадра.
 *
 * withCta — есть ли кнопка «Оформить ИП» (она есть, только когда есть форма). Окно содержимого
 * и кнопка ищутся при запуске эффекта, а слот формы может появиться или пропасть после
 * монтирования: от withCta эффект перезапускается, кнопку находит заново и наблюдает.
 */
export const useScrollSteps = (statesCount: number, withCta: boolean) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<StepsMode>('sticky');

  const measure = useCallback(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!track || !stage) return null;
    const trackRect = track.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    // Распорка трека — отрезок на каждый переход шагов плюс пробег подарков (giftSpan).
    // Пробег в CSS-пикселях, прямоугольники — в экранных: при zoom хоста приводим к ним.
    const zoom = stage.offsetHeight > 0 ? stageRect.height / stage.offsetHeight : 1;
    const run = (parseFloat(track.style.getPropertyValue('--aic-ip-gift-run')) || 0) * zoom;
    const { segment, pause, travel, span } = giftSpan(
      trackRect.height - stageRect.height,
      statesCount,
      run
    );
    return {
      stage,
      trackRect,
      stageRect,
      segment,
      pause,
      travel,
      span,
      run,
      shifted: stageRect.top - trackRect.top,
    };
  }, [statesCount]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const container = findStickyContainer(stage);
    if (container && !isScroller(container)) {
      setMode('list');
      return undefined;
    }
    scrollerRef.current = container;
    // Наезд ведёт браузер, только когда прокручивается сам документ: анимация привязана к
    // scroll(root). В контейнере прокрутки хоста наезд ведёт скрипт.
    const driven = !container && scrollDrivenSupported();

    const card = cardRef.current;
    const frameNode = card?.offsetParent;
    const px = (style: CSSStyleDeclaration, name: string) =>
      parseFloat(style.getPropertyValue(name)) || 0;
    const set = (name: string, value: string) => {
      if (stage.style.getPropertyValue(name) !== value) stage.style.setProperty(name, value);
    };
    // Высота окна и подъём карточки для перехода первого экрана во второй (см. setMorph).
    let viewportH = 0;
    let morphD = 0;
    // Переполнение содержимого подарков и текущий сдвиг содержимого, оба в px макета (giftSpan).
    let overflow = 0;
    let giftShift = 0;
    // Куда содержимое едет (цель по прокрутке), до какого времени держим паузу на чтение
    // первой карточки, кадр сближения и часы предыдущего кадра. См. easeGift ниже.
    let giftTarget = 0;
    let giftHoldUntil = 0;
    let giftFrame = 0;
    let giftAt = 0;
    let wasInGift = false;
    const reduced = prefersReducedMotion();
    const track = trackRef.current;
    const scroller = card?.querySelector('[data-aic-ip-scroll]');
    const layoutStage = () => {
      const inSteps = activeRef.current < statesCount - 1;
      if (frameNode instanceof HTMLElement) {
        const style = getComputedStyle(stage);
        const viewport = parseFloat(style.minHeight) || 0;
        viewportH = viewport;
        const header = px(style, '--aic-ip-header');
        const { scale, shift } = fitComposition({
          viewport,
          header,
          designViewport: px(style, '--aic-ip-design-viewport'),
          designHeader: px(style, '--aic-ip-design-header'),
          minScale: minScaleFrom(style),
        });
        const top = header + px(style, '--aic-ip-stage-gap') * scale + shift;
        set('--aic-ip-scale', String(Math.round(scale * 10000) / 10000));
        set('--aic-ip-shift', `${Math.round(shift)}px`);
        set('--aic-ip-fill', `${Math.round((viewport - top) / scale)}px`);
        set('--aic-ip-frame-h', `${frameNode.offsetHeight}px`);
        // Высоты колоды и списка подарков: ячейка сетки тела карточки получает их в пикселях,
        // одинаково в любом движке (без fr). Меняется она скачком, пока кнопка погашена (CSS, .body).
        const rowContent = (name: string) =>
          card?.querySelector(`[data-aic-ip-row="${name}"]`)?.firstElementChild;
        const deck = rowContent('deck');
        const gift = rowContent('gift');
        if (deck instanceof HTMLElement) set('--aic-ip-deck-h', `${deck.offsetHeight}px`);
        if (gift instanceof HTMLElement) set('--aic-ip-gift-h', `${gift.offsetHeight}px`);
        // Окно содержимого плашки на экране подарков: отступ над колодой, колода и блок кнопки,
        // как в шагах (формула в CSS, .scroller-gift). Блок кнопки — её высота и зазор над ней.
        const cta = scroller?.querySelector('[data-aic-ip-cta]');
        const ctaH = cta instanceof HTMLElement ? cta.offsetHeight : 0;
        set('--aic-ip-cta-block', `${ctaH > 0 ? ctaH + px(style, '--aic-ip-cta-gap') : 0}px`);
        // Отступ над колодой — верхнее поле окна (--aic-ip-body-gap в CSS, здесь уже в px).
        const bodyGap =
          scroller instanceof HTMLElement
            ? parseFloat(getComputedStyle(scroller).paddingTop) || 0
            : 0;
        const deckH = deck instanceof HTMLElement ? deck.offsetHeight : 0;
        const steps = bodyGap + deckH + (ctaH > 0 ? ctaH + px(style, '--aic-ip-cta-gap') : 0);
        // На экране подарков окно уже закреплено; в шагах оно не меньше формулы (на мобайле
        // окно тянется до низа плашки и бывает выше).
        const view =
          scroller instanceof HTMLElement
            ? inSteps
              ? Math.max(scroller.offsetHeight, steps)
              : scroller.clientHeight
            : steps;
        // Содержимое подарков: отступ, подарки, зазор и кнопка.
        const giftContent =
          bodyGap +
          (gift instanceof HTMLElement ? gift.offsetHeight : 0) +
          (ctaH > 0 ? ctaH + px(style, '--aic-ip-cta-gift-gap') : 0);
        overflow = Math.max(0, Math.ceil(giftContent - view));
        if (track) {
          const run = `${Math.ceil(overflow * scale)}px`;
          if (track.style.getPropertyValue('--aic-ip-gift-run') !== run) {
            track.style.setProperty('--aic-ip-gift-run', run);
          }
        }
        // Насколько карточка в первом экране поднята над своим местом: её верх стоит там,
        // где корешок, над верхом раздела на высоту корешка. offsetTop — до масштаба кадра.
        if (card) {
          const cardTop = (parseFloat(style.paddingTop) || 0) + card.offsetTop * scale;
          morphD = Math.round(cardTop + px(style, '--aic-ip-peek-h'));
          set('--aic-ip-morph-d', `${morphD}px`);
        }
      }
      // Высота сцены — после масштаба: от него зависит высота. Только в шагах (см. выше).
      if (inSteps) set('--aic-ip-stage-h', `${stage.offsetHeight}px`);
    };

    // Всё чтение и запись — в одном кадре анимации: сначала раскладка, если её просили
    // (resize, изменение размеров), потом номер шага по прокрутке.
    let frame = 0;
    let layoutPending = false;
    const update = () => {
      frame = 0;
      if (layoutPending) {
        layoutPending = false;
        layoutStage();
      }
      const geometry = measure();
      if (!geometry) return;
      setMorph(geometry.trackRect.top);
      if (geometry.segment <= 0) return;
      const passed = geometry.shifted / geometry.segment;
      const next = Math.min(statesCount - 1, Math.max(0, Math.floor(passed + (1 - SWITCH_AT))));
      // ref раньше состояния: раскладка в следующем кадре уже видит новый шаг и не мерит подарок.
      activeRef.current = next;
      setActive(next);
      setGiftScroll(geometry, next === statesCount - 1);
    };
    const writeGift = (value: number) => {
      giftShift = Math.round(value * 10) / 10;
      set('--aic-ip-gift-scroll', `${giftShift}px`);
    };
    /**
     * Содержимое подарков догоняет цель за ВРЕМЯ, а не рывком за событие прокрутки: колесо и
     * инерция трекпада приходят редкими крупными порциями с кадрами без движения между ними, и
     * сдвиг, записанный прямо из обработчика, идёт лесенкой. Сближение экспоненциальное с
     * постоянной GIFT_EASE_MS и пределом скорости GIFT_MAX_STEP на кадр. Пока идёт пауза на чтение
     * (GIFT_READ_MS), цель — начало содержимого: карточка стоит. Кадр берётся только пока не
     * сошлись или держим паузу, потом цикл сам останавливается.
     */
    const easeGift = (now: number) => {
      giftFrame = 0;
      const dt = Math.min(64, giftAt ? now - giftAt : 1000 / 60);
      giftAt = now;
      const want = now < giftHoldUntil ? 0 : giftTarget;
      const limit = Math.min((GIFT_MAX_STEP * dt) / (1000 / 60), GIFT_MAX_JUMP);
      const step = (want - giftShift) * (1 - Math.exp(-dt / GIFT_EASE_MS));
      writeGift(giftShift + Math.max(-limit, Math.min(limit, step)));
      if (now < giftHoldUntil) {
        runGift();
        return;
      }
      giftHoldUntil = 0;
      if (Math.abs(want - giftShift) > 0.05) runGift();
      else {
        writeGift(want);
        giftAt = 0;
      }
    };
    type GiftGeometry = {
      trackRect: DOMRect;
      stage: HTMLElement;
      shifted: number;
      segment: number;
      pause: number;
      travel: number;
    };
    /**
     * Сдвиг содержимого на экране подарков: доля пройденного хода (после паузы, см. giftSpan),
     * умноженная на переполнение. При поддержке scroll-driven animations ход ведёт CSS, а скрипт
     * ставит только границы (--aic-ip-gift-from/-to) и переполнение (--aic-ip-gift-max). Иначе
     * скрипт пишет --aic-ip-gift-scroll со сближением по времени (easeGift); при reduced motion —
     * без паузы и сближения.
     */
    const setGiftScroll = (geometry: GiftGeometry, inGift: boolean) => {
      const start = (statesCount - 1) * geometry.segment;
      // Последний пиксель хода — уже конец: прокрутка целая, а трек дробный, и без этого содержимое
      // не доезжало бы в конце на доли пикселя.
      const reach = Math.max(1, geometry.travel - 1);
      const share =
        inGift && geometry.travel > 0
          ? Math.min(1, Math.max(0, (geometry.shifted - start - geometry.pause) / reach))
          : 0;
      giftTarget = Math.round(share * overflow * 10) / 10;
      if (driven && root) {
        // Позиция прокрутки документа, на которой сцена сдвинута в треке на 0 (как в goTo).
        const zoom =
          geometry.stage.offsetHeight > 0
            ? geometry.stage.getBoundingClientRect().height / geometry.stage.offsetHeight
            : 1;
        const stickTop = (parseFloat(getComputedStyle(geometry.stage).top) || 0) * zoom;
        const base =
          geometry.trackRect.top - (section ? ownShiftY(section) : 0) + window.scrollY - stickTop;
        const from = base + start + geometry.pause;
        setRoot('--aic-ip-gift-from', scrollPx(from));
        setRoot('--aic-ip-gift-to', scrollPx(from + reach));
        set('--aic-ip-gift-max', `${overflow}px`);
        if (giftFrame) window.cancelAnimationFrame(giftFrame);
        giftFrame = 0;
        giftShift = giftTarget;
        if (geometry.stage.style.getPropertyValue('--aic-ip-gift-scroll')) {
          geometry.stage.style.removeProperty('--aic-ip-gift-scroll');
        }
        return;
      }
      if (reduced) {
        writeGift(giftTarget);
        return;
      }
      if (inGift && !wasInGift && share < 0.05) giftHoldUntil = performance.now() + GIFT_READ_MS;
      if (!inGift) giftHoldUntil = 0;
      wasInGift = inGift;
      if (giftHoldUntil > 0 || Math.abs(giftTarget - giftShift) > 0.05) runGift();
    };
    const runGift = () => {
      if (!giftFrame) giftFrame = window.requestAnimationFrame(easeGift);
    };
    /**
     * Фокус с клавиатуры на подарке, ссылке или кнопке за краем окна содержимого: прокручиваем
     * страницу так, чтобы элемент встал в окно. Своей прокрутки у окна нет, браузер сам этого
     * не сделает. Ведёт та же прокрутка страницы, что и колесо.
     * Видимая часть окна начинается не у его верха: выше --aic-ip-scroll-top содержимое
     * обрезано, ниже ещё гаснет. Их сумму CSS отдаёт настоящим свойством scroll-padding-top
     * окна (.scroller), его и читаем. Сдвиг не выходит за 0..переполнение: у начала и у конца
     * пробега страница не уходит из подарков.
     */
    const revealFocused = (event: FocusEvent) => {
      const target = event.target;
      if (activeRef.current !== statesCount - 1) return;
      if (!(target instanceof HTMLElement) || !(scroller instanceof HTMLElement)) return;
      if (!scroller.contains(target) || overflow <= 0) return;
      const view = scroller.getBoundingClientRect();
      // Экранных px в px макета: масштаб сцены и zoom хоста вместе.
      const k = scroller.offsetHeight > 0 ? view.height / scroller.offsetHeight : 1;
      const cut = parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0;
      const top = view.top + cut * k;
      const rect = target.getBoundingClientRect();
      let delta = 0;
      if (rect.bottom > view.bottom) delta = Math.min(rect.top - top, rect.bottom - view.bottom);
      else if (rect.top < top) delta = rect.top - top;
      // Считаем от цели, а не от текущего сдвига: содержимое может ещё догонять (easeGift).
      const shift = Math.min(overflow, Math.max(0, giftTarget + delta / k));
      if (Math.abs((shift - giftTarget) * k) < 1) return;
      const geometry = measure();
      if (!geometry || geometry.travel <= 0) return;
      // Нужный сдвиг — доля переполнения — столько же доли хода после паузы (giftSpan).
      const start = (statesCount - 1) * geometry.segment + geometry.pause;
      const want = start + (shift / overflow) * Math.max(1, geometry.travel - 1);
      const options: ScrollToOptions = {
        top: shift > 0 ? want - geometry.shifted : Math.min(0, start - geometry.shifted),
        behavior: 'auto',
      };
      // Фокус с клавиатуры снимает паузу на чтение: пользователь сам выбрал, куда смотреть.
      giftHoldUntil = 0;
      const box = scrollerRef.current;
      if (box) box.scrollBy(options);
      else window.scrollBy(options);
    };
    /**
     * Переход первого экрана во второй: 0, пока верх раздела у низа окна, 1, когда раздел
     * дошёл до верха и сцена прилипла. Ставится на раздел, CSS двигает и расширяет карточку.
     */
    const section = track?.closest('section');
    const root = track?.closest<HTMLElement>('[data-aic-ip-root]');
    /**
     * Фокус в форме первого экрана. Первый экран закреплён, а iOS при фокусе прокручивает документ,
     * чтобы поле встало над клавиатурой, и пользователь может листать с открытой клавиатурой:
     * плашка наезжала бы на поле, а data-aic-ip-covered спрятал бы форму и закрыл клавиатуру. Пока
     * фокус в форме, covered не ставится, а первый экран идёт вместе с документом: на сколько
     * документ ушёл вниз с момента фокуса, на столько поднят верх закрепления (--aic-ip-hero-lift
     * на корне, hero/styles.module.css). Но не дальше, чем ушла плашка (она едет медленнее
     * документа): низ экрана не отрывается от её верха, между ними не проступает фон. Поле при этом
     * остаётся над плашкой. После ухода фокуса подъём не растёт и убывает при прокрутке вверх:
     * экран не прыгает и снова закреплён, когда документ вернулся к месту фокуса. hold — верх корня
     * и подъём в момент фокуса. Предел по плашке — из текущего замера: экран поднимется ещё на
     * столько, на сколько его низ сейчас ниже верха плашки (экран выше окна закрепляется не сразу,
     * поэтому запас из момента фокуса не годится).
     *
     * Подъём включает НЕ фокус сам по себе, а занятое экранной клавиатурой место (keyboardUp): он и
     * нужен только под неё. На десктопе клавиатуры нет, а фокус в форме есть — кнопка «Начать свой
     * бизнес» прокручивает к форме и ставит фокус в первое поле (lib/motion.ts, scrollToForm). Если
     * бы подъём включал сам фокус, он рос бы с документом, пока низ первого экрана не упрётся в
     * верх плашки. Дальше край формы оказался бы ВЫШЕ верха плашки, setReveal читал бы это как
     * «плашка ещё не дошла», --aic-ip-reveal оставался бы 0 — вкладка «Начать свой бизнес» больше
     * не выезжала бы, а фон второго экрана не проявлялся. Поэтому подъём выведен из способности
     * окна, а не из платформы.
     */
    let hold: { rootTop: number; lift: number } | null = null;
    let lift = 0;
    const setLift = (edge: Element | null, focused: boolean, cardTop: number) => {
      if (!root) return;
      const rootTop = root.getBoundingClientRect().top;
      if (focused && !hold) hold = { rootTop, lift };
      if (!hold) return;
      const hero = edge?.closest('section');
      const withDocument = hold.lift + hold.rootTop - rootTop;
      const withCard = hero ? lift + hero.getBoundingClientRect().bottom - cardTop : withDocument;
      const target = Math.max(0, Math.min(withDocument, withCard));
      lift = focused ? target : Math.min(lift, target);
      if (!focused && lift <= 0) hold = null;
      const value = `${Math.round(lift * 10) / 10}px`;
      if (root.style.getPropertyValue('--aic-ip-hero-lift') !== value) {
        root.style.setProperty('--aic-ip-hero-lift', value);
      }
    };
    /**
     * Наезд плашки на первый экран: 0, пока верх карточки ниже края формы (видно не только
     * заголовок), 1, когда карточка встала на место. sectionTop — от верха окна или контейнера
     * прокрутки. Между ними заголовок первого экрана гаснет, проявляется фон второго экрана со
     * свечением. Место карточки в конце перехода — её верх сейчас минус верх раздела плюс
     * оставшийся подъём morphD × (1 − morph). Ставится на корень блока (--aic-ip-reveal);
     * data-aic-ip-covered — форма под плашкой. Край ищется в каждом кадре: слот формы банка может
     * появиться и смениться после монтирования.
     */
    const setRoot = (name: string, value: string) => {
      if (root && root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
    };
    /** Позиция прокрутки в px с точностью до сотой: границы диапазонов анимации. */
    const scrollPx = (value: number) => `${Math.round(value * 100) / 100}px`;
    /**
     * Производные reveal (фон второго экрана, гашение заголовка, вкладка) тоже ведёт браузер, пока
     * reveal — линейная функция прокрутки, то есть пока первый экран закреплён. Начало отрезка —
     * где верх плашки дошёл до края формы: t0 = (край − место плашки) × окно / (окно − morphD),
     * край — в закреплённом положении. Под экранной клавиатурой ведёт скрипт. Возвращает, ведёт ли
     * браузер.
     */
    const setRevealRange = (edge: Element | null, finalTop: number, morphAt: number) => {
      const hero = edge?.closest('section');
      if (!edge || !hero || viewportH <= morphD) return false;
      const scroller = scrollerRef.current;
      const origin = scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
      const stick = (parseFloat(getComputedStyle(hero).top) || 0) + origin;
      const edgePinned =
        edge.getBoundingClientRect().top - hero.getBoundingClientRect().top + stick;
      const span = edgePinned - finalTop;
      if (span <= 1) return false;
      setRoot(
        '--aic-ip-reveal-from',
        scrollPx(morphAt - (span * viewportH) / (viewportH - morphD))
      );
      return true;
    };
    /**
     * Контракт с хостом (INTEGRATION.md, п. 9): --aic-ip-reveal и data-aic-ip-covered на корне
     * пишет скрипт при любом пути. morphAt — позиция прокрутки документа, на которой наезд
     * кончается (только когда его ведёт браузер, иначе null).
     */
    const setReveal = (morph: number, sectionTop: number, morphAt: number | null) => {
      if (!root || !card) return;
      const edge = root.querySelector('[data-aic-ip-cover-edge]');
      const focused = Boolean(edge?.contains(document.activeElement));
      const cardTop = card.getBoundingClientRect().top;
      // Подъём до замера края: край формы зависит от него, верх плашки — нет.
      // Подъём — только под экранную клавиатуру (см. комментарий к setLift), covered —
      // по самому фокусу: поле с фокусом не прячем ни на какой платформе.
      setLift(edge, focused && keyboardUp(), cardTop);
      let reveal = morph;
      const finalTop = cardTop - sectionTop + morphD * (1 - morph);
      if (edge) {
        const edgeTop = edge.getBoundingClientRect().top;
        const span = edgeTop - finalTop;
        reveal = span > 1 ? (edgeTop - cardTop) / span : Number(cardTop <= edgeTop);
      }
      const value = String(Math.round(Math.min(1, Math.max(0, reveal)) * 1000) / 1000);
      setRoot('--aic-ip-reveal', value);
      root.toggleAttribute('data-aic-ip-covered', value !== '0' && !focused);
      if (morphAt === null) return;
      // Место плашки (finalTop) верно, только пока сцена не прилипла (morph < 1): дальше раздел
      // уходит вверх, а карточка стоит. Тогда граница остаётся прежней; reveal там и так 1.
      const current = root.getAttribute('data-aic-ip-scroll-driven');
      let mode = current ?? '';
      if (hold || lift > 0) mode = '';
      else if (morph < 1) mode = setRevealRange(edge, finalTop, morphAt) ? 'reveal' : '';
      if (current !== mode) {
        root.setAttribute('data-aic-ip-scroll-driven', mode);
      }
    };
    /**
     * Наезд. Без поддержки scroll-driven скрипт пишет --aic-ip-morph, и CSS двигает карточку. С
     * поддержкой карточку двигает CSS-анимация на scroll(root), а скрипт ставит только границы
     * диапазона (--aic-ip-morph-from/-to), которые меняются лишь при смене раскладки. Собственный
     * transform раздела (толчок-подсказка) из границ вычтен: прокрутку он не меняет.
     */
    const setMorph = (trackTop: number) => {
      if (!section || viewportH <= 0) return;
      const scroller = scrollerRef.current;
      const origin = scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
      const top = Math.min(viewportH, Math.max(0, trackTop - origin));
      const morph = Math.round((1 - top / viewportH) * 1000) / 1000;
      let morphAt: number | null = null;
      // Без корня и карточки скрипт не поставит режим (setReveal), и CSS-анимация не включится:
      // тогда и наезд остаётся за скриптом.
      if (driven && root && card) {
        morphAt = trackTop - ownShiftY(section) + window.scrollY;
        setRoot('--aic-ip-morph-from', scrollPx(morphAt - viewportH));
        setRoot('--aic-ip-morph-to', scrollPx(morphAt));
        section.style.removeProperty('--aic-ip-morph');
      } else {
        const value = String(morph);
        if (section.style.getPropertyValue('--aic-ip-morph') !== value) {
          section.style.setProperty('--aic-ip-morph', value);
        }
      }
      setReveal(morph, section.getBoundingClientRect().top - origin, morphAt);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const requestLayout = () => {
      layoutPending = true;
      schedule();
    };

    layoutStage();
    schedule();
    // scroll не всплывает, но ловится на погружении: так слышна прокрутка и окна, и контейнера хоста.
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    // Фокус входит в форму и уходит из неё без прокрутки: covered и подъём пересчитываются.
    root?.addEventListener('focusin', schedule);
    root?.addEventListener('focusout', schedule);
    card?.addEventListener('focusin', revealFocused);
    // resize пересчитывает и масштаб: в подарках ResizeObserver сцены может не сработать.
    window.addEventListener('resize', requestLayout);
    // Экранная клавиатура меняет visual viewport, а window.resize при этом бывает молчит:
    // от него зависит подъём первого экрана (keyboardUp), поэтому слушаем и его.
    window.visualViewport?.addEventListener('resize', schedule);
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(requestLayout);
    observer?.observe(stage);
    // Блоки карточки по отдельности: сцена во всё окно не меняет высоту, а композиция меняет.
    Array.from(card?.children ?? []).forEach((child) => observer?.observe(child));
    const cta = scroller?.querySelector('[data-aic-ip-cta]');
    if (cta) observer?.observe(cta);
    card
      ?.querySelectorAll('[data-aic-ip-row] > *')
      .forEach((content) => observer?.observe(content));
    return () => {
      document.removeEventListener('scroll', schedule, { capture: true });
      root?.removeEventListener('focusin', schedule);
      root?.removeEventListener('focusout', schedule);
      card?.removeEventListener('focusin', revealFocused);
      window.removeEventListener('resize', requestLayout);
      window.visualViewport?.removeEventListener('resize', schedule);
      observer?.disconnect();
      // Без скрипта наезд снова ведёт переменная: CSS-анимация выключается вместе с режимом.
      root?.removeAttribute('data-aic-ip-scroll-driven');
      if (frame) window.cancelAnimationFrame(frame);
      if (giftFrame) window.cancelAnimationFrame(giftFrame);
    };
  }, [measure, statesCount, withCta]);

  /**
   * Переход к шагу по клику на индикатор: прокручиваем ближайший прокручиваемый контейнер
   * (или окно) так, чтобы сцена сдвинулась внутри трека ровно на index отрезков. Подарки —
   * к началу их пробега: содержимое плашки с начала.
   */
  const goTo = useCallback(
    (index: number) => {
      const geometry = measure();
      if (!geometry) return;
      const { stage, trackRect, stageRect, segment } = geometry;
      // Отступ прилипания задан в CSS-пикселях; при zoom хоста размеры в DOM масштабированы.
      const zoom = stage.offsetHeight > 0 ? stageRect.height / stage.offsetHeight : 1;
      const stickTop = (parseFloat(getComputedStyle(stage).top) || 0) * zoom;
      const scroller = scrollerRef.current;
      const origin = scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
      const delta = trackRect.top - origin - stickTop + index * segment;
      const options: ScrollToOptions = {
        top: delta,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      };
      if (scroller) scroller.scrollBy(options);
      else window.scrollBy(options);
    },
    [measure]
  );

  return {
    trackRef,
    stageRef,
    cardRef,
    active,
    mode,
    goTo,
    segments: statesCount - 1,
  };
};
