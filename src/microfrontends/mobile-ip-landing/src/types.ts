import type { ReactNode } from 'react';

export interface UserAgent {
  browser?: {
    browserEngine?: 'safari' | 'chrome' | 'firefox' | 'other';
  };
  device?: {
    /**
     * Possible type:
     * console, mobile, tablet, smarttv, wearable, embedded
     */
    type:
      | 'console'
      | 'mobile'
      | 'tablet'
      | 'smarttv'
      | 'wearable'
      | 'embedded'
      | string
      | undefined;
  };
  os?: {
    /**
     * Possible 'os.name'
     * AIX, Amiga OS, Android, Arch, Bada, BeOS, BlackBerry, CentOS, Chromium OS, Contiki,
     * Fedora, Firefox OS, FreeBSD, Debian, DragonFly, Gentoo, GNU, Haiku, Hurd, iOS,
     * Joli, Linpus, Linux, Mac OS, Mageia, Mandriva, MeeGo, Minix, Mint, Morph OS, NetBSD,
     * Nintendo, OpenBSD, OpenVMS, OS/2, Palm, PCLinuxOS, Plan9, Playstation, QNX, RedHat,
     * RIM Tablet OS, RISC OS, Sailfish, Series40, Slackware, Solaris, SUSE, Symbian, Tizen,
     * Ubuntu, UNIX, VectorLinux, WebOS, Windows [Phone/Mobile], Zenwalk
     */
    name: 'Android' | 'iOS' | string | undefined;
    version: string | undefined;
  };
}

type Layout = 'desktop' | 'mobile';

export type DiMap = {
  userAgent?: UserAgent;
  layout?: Layout;
};

type Di = {
  get<T extends keyof DiMap>(key: T): DiMap[T];
};

/** Картинка с S3 банка: ссылки приходят из CMS, в бандл блока растр не попадает. */
export type Picture = {
  src: string;
  src2x?: string;
  /** Пустая строка у декоративных картинок. */
  alt?: string;
};

/** SVG-иконки живут внутри микрофронта, CMS выбирает их по имени. */
export type IconName = 'briefcase' | 'gift' | 'docs' | 'note';

export type Benefit = {
  id: string;
  /** HTML из визивига CMS: допускаются `br` и `nbsp`. */
  textHtml: string;
  icon: IconName;
};

export type Step = {
  id: string;
  /** HTML из визивига CMS: перенос строки в заголовке карты задаётся `br`. */
  titleHtml: string;
  /**
   * HTML из визивига CMS. Выделение маркером (`mark`) не показывается: текст без подложки.
   * Фрагмент, который нельзя переносить (например, «3-5» рвётся на дефисе), — в `nobr`.
   */
  textHtml: string;
  note: string;
  noteIcon: IconName;
};

export type GiftItem = {
  id: string;
  title: string;
  text: string;
  /** Без картинки текст карточки занимает всю ширину. */
  image?: Picture;
};

export type Process = {
  title: string;
  /** Подпись вкладки, которая возвращает к форме. */
  tabLabel: string;
  /** Шаблон подписи шага, `{n}` заменяется номером. */
  stepLabel: string;
  /**
   * Шаги процесса. Раскладка рассчитана на 3–5 шагов: на мобайле при 7 и больше пройденные
   * точки индикатора поднимаются выше карты шага и заходят на заголовок.
   */
  steps: Step[];
  ctaLabel: string;
  gift: {
    /** Подпись точки подарка в индикаторе шагов. */
    label: string;
    /** Маркер подарка в индикаторе, когда открыт список подарков. Без него остаётся точка. */
    marker?: Picture;
    subtitle: string;
    items: GiftItem[];
    help: {
      title: string;
      text: string;
      /**
       * Куда ведёт блок «Остались вопросы?». Без ссылки блок остаётся текстом без рамки.
       * Допустимы https/http, mailto, tel, путь от корня и якорь; иная схема считается пустой.
       */
      href?: string;
    };
  };
};

export type MobileIpLandingProps = {
  di: Di;
  /** Заголовок страницы, единственный h1. HTML из визивига. */
  titleHtml: string;
  heroBackground: Picture;
  formTitle: string;
  /**
   * Слот формы заявки. Форму делает банк отдельным блоком, этот блок решает только, где её
   * отрендерить. В Storybook сюда передаётся демо-форма. Без формы блок прячет её карточку и всё,
   * что к ней ведёт: вкладку и кнопку под шагами.
   */
  form?: ReactNode;
  benefits: Benefit[];
  process: Process;
  /**
   * Высота шапки хоста в px. Первый экран вместе с корешком занимает окно минус эта высота, второй
   * экран оставляет под шапку место сверху. Чтобы второй экран выглядел как макет (логотип хоста
   * над вкладкой), шапка должна быть sticky или fixed с z-index не меньше 1 и стоять прямо над
   * блоком; если шапка не липкая, второй экран будет без логотипа. Блок шапку не рисует. Условия
   * для хоста: INTEGRATION.md в корне репозитория.
   */
  headerOffset?: number;
  /**
   * Фон первого экрана заходит под шапку хоста до верха окна, как в макете (лимоны от y0,
   * логотип поверх). По умолчанию false: фон обрезан по верху блока. Включать, только если
   * шапка sticky или fixed с z-index не меньше 1 и стоит прямо над блоком: иначе фон ляжет
   * поверх шапки. Непрозрачная шапка фон просто закроет.
   */
  bleedUnderHeader?: boolean;
  /**
   * Хост отдаёт на мобайле фирменный шрифт заголовков (dsHeading 500). Тогда сервер сразу
   * рендерит плотный интервал макета, без скачка после гидрации. По умолчанию false:
   * интервал 1.1, безопасный для системных шрифтов; блок сам проверит шрифт в браузере.
   */
  brandFont?: boolean;
};
