import { useEffect, useLayoutEffect, useState } from 'react';

const BRAND_HEADING = 'dsHeading';
/** Заголовки блока набраны в 500: плотный интервал безопасен, только если загружено оно. */
const HEADING_WEIGHT = 500;

/** Вес FontFace: «500», «normal» или диапазон «400 700» у переменного шрифта. */
const coversHeadingWeight = (weight: string): boolean => {
  const [from = Number.NaN, to = from] = weight
    .split(/\s+/)
    .map((part) => (part === 'normal' ? 400 : part === 'bold' ? 700 : Number(part)));
  return from <= HEADING_WEIGHT && HEADING_WEIGHT <= to;
};

/** На сервере useLayoutEffect предупреждает и не выполняется: там достаточно useEffect. */
const useIsomorphicLayoutEffect = typeof document === 'undefined' ? useEffect : useLayoutEffect;

const brandHeadingLoaded = (fonts: FontFaceSet): boolean => {
  let loaded = false;
  fonts.forEach((face) => {
    if (
      face.family.replace(/["']/g, '') === BRAND_HEADING &&
      coversHeadingWeight(face.weight) &&
      face.status === 'loaded'
    ) {
      loaded = true;
    }
  });
  return loaded;
};

/**
 * Загружено ли начертание 500 фирменного шрифта заголовков. Макет мобайла нарисован на
 * TinkoffSans с плотным интервалом (h1 36/0.9), а на мобильном вебе банк отдаёт системные
 * шрифты: на SF Pro и Roboto такой интервал склеивает строки. CSS не умеет спросить, каким
 * шрифтом из цепочки набран текст (ни @supports, ни font-size-adjust этого не делают),
 * поэтому спрашиваем FontFaceSet.
 *
 * initial — что рендерить на сервере и до проверки. По умолчанию false: безопасный интервал
 * 1.1. Хост, который точно отдаёт dsHeading 500 на мобайле, передаёт true (проп brandFont),
 * и тогда SSR сразу рисует интервал макета. Проверка идёт в layout-эффекте, до отрисовки:
 * на клиенте интервал не прыгает после гидрации. Остаток: если хост передал true, а шрифт
 * не загрузился, первый кадр после SSR будет плотным, затем интервал станет 1.1.
 */
export const useBrandHeading = (initial = false) => {
  const [brand, setBrand] = useState(initial);

  useIsomorphicLayoutEffect(() => {
    const fonts = typeof document === 'undefined' ? undefined : document.fonts;
    if (!fonts) return undefined;
    let alive = true;
    const check = () => {
      if (alive) setBrand(brandHeadingLoaded(fonts));
    };
    // Шрифт из кэша браузер подключает при первой раскладке текста. Layout-эффект идёт до неё,
    // и без принудительной раскладки шрифт ещё числится незагруженным: интервал переключился бы
    // кадром позже, уже на загруженном шрифте.
    void document.documentElement.offsetHeight;
    check();
    fonts.addEventListener('loadingdone', check);
    fonts.ready.then(check).catch(() => undefined);
    return () => {
      alive = false;
      fonts.removeEventListener('loadingdone', check);
    };
  }, []);

  return brand;
};
