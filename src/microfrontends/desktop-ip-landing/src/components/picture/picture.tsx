import type { Picture as PictureData } from '../../types';

type PictureProps = {
  picture?: PictureData;
  className?: string;
  width?: number;
  height?: number;
  /**
   * Только для фона первого экрана: грузится сразу и с высоким приоритетом.
   * Остальной растр грузится лениво.
   */
  priority?: boolean;
};

/**
 * React 18 не знает свойства fetchPriority и предупреждает о нём, поэтому атрибут
 * передаётся в нижнем регистре: такие атрибуты React отдаёт в DOM как есть.
 * При переходе хоста на React 19 вернуть camelCase `fetchPriority`: там он стандартный,
 * а нижний регистр даёт предупреждение «Did you mean fetchPriority?».
 */
const HIGH_PRIORITY = { fetchpriority: 'high' } as const;

/** Пустая ссылка из CMS не рендерит img: вместо битой картинки места просто нет. */
export const Picture = ({ picture, className, width, height, priority = false }: PictureProps) => {
  if (!picture?.src) return null;
  return (
    <img
      className={className}
      src={picture.src}
      srcSet={picture.src2x ? `${picture.src} 1x, ${picture.src2x} 2x` : undefined}
      alt={picture.alt ?? ''}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? undefined : 'async'}
      {...(priority ? HIGH_PRIORITY : {})}
    />
  );
};
