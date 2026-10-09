import heroBackground from './assets/hero_mobile.jpg';
import heroBackground2x from './assets/hero_mobile@2x.jpg';
import giftCard from './assets/gift_card.png';
import giftCard2x from './assets/gift_card@2x.png';
import giftAccounting from './assets/gift_accounting.png';
import giftAccounting2x from './assets/gift_accounting@2x.png';
import giftCurrency from './assets/gift_currency.png';
import giftCurrency2x from './assets/gift_currency@2x.png';
import giftMarker from './assets/gift_emoji.png';
import giftMarker2x from './assets/gift_emoji@2x.png';
import type { MobileIpLandingProps } from '../types';

/**
 * Демо-контент по макету. На проде эти поля заполняет CMS банка, картинки лежат на S3 банка.
 * Неразрывные пробелы после предлогов и союзов расставлены вручную.
 */
const nbsp = ' ';

export const content: Omit<MobileIpLandingProps, 'di' | 'form'> = {
  titleHtml: `Начните получать лимоны – откройте ИП в${nbsp}Т-Банке`,
  heroBackground: { src: heroBackground, src2x: heroBackground2x, alt: '' },
  formTitle: `Телефон нам${nbsp}нужен, чтобы${nbsp}вы${nbsp}могли вернуться к${nbsp}заявке в${nbsp}любое время`,
  benefits: [
    { id: 'duty', textHtml: 'Госпошлину<br>платить не нужно', icon: 'briefcase' },
    { id: 'account', textHtml: `Счет — 0${nbsp}₽<br>первые 2${nbsp}месяца`, icon: 'gift' },
  ],
  process: {
    title: 'Как происходит оформление?',
    tabLabel: 'Начать свой бизнес',
    stepLabel: 'Шаг {n}',
    ctaLabel: 'Оформить ИП',
    steps: [
      {
        id: 'apply',
        titleHtml: 'Заполните заявку',
        textHtml: 'С вас – заполнить короткую форму,<br>а с нас все остальное',
        note: `Из${nbsp}документов нужен только паспорт и${nbsp}СНИЛС`,
        noteIcon: 'briefcase',
      },
      {
        id: 'sign',
        titleHtml: 'Подпишите<br>документы',
        textHtml: 'Назначим удобное для вас время для приезда представителя',
        note: 'В тот же день подадим документы в налоговую',
        noteIcon: 'docs',
      },
      {
        id: 'done',
        titleHtml: 'ИП<br>оформлено!',
        textHtml: `Налоговая подтвердит регистрацию за${nbsp}<nobr>3-5</nobr>${nbsp}рабочих дней`,
        note: `Выписку из${nbsp}ЕГРИП пришлем на${nbsp}почту`,
        noteIcon: 'note',
      },
    ],
    gift: {
      label: 'Что вы получите бесплатно',
      marker: { src: giftMarker, src2x: giftMarker2x, alt: '' },
      subtitle: 'Бесплатно для вашего бизнеса',
      items: [
        {
          id: 'cards',
          title: 'Карты для бизнеса',
          text: `Для${nbsp}личных и${nbsp}бизнес-расходов. Можно добавить в${nbsp}Mir Pay и${nbsp}платить смартфоном`,
          image: { src: giftCard, src2x: giftCard2x, alt: '' },
        },
        {
          id: 'accounting',
          title: 'Онлайн-бухгалтерия',
          text: `Сервис рассчитывает налоги, формирует декларацию и${nbsp}напоминает о сроках`,
          image: { src: giftAccounting, src2x: giftAccounting2x, alt: '' },
        },
        {
          id: 'currency',
          title: 'Валютные счета',
          text: `Для${nbsp}работы с${nbsp}зарубежными партнёрами. Открытие любого количества счетов${nbsp}— 0${nbsp}₽`,
          image: { src: giftCurrency, src2x: giftCurrency2x, alt: '' },
        },
      ],
      help: {
        title: 'Остались вопросы?',
        text: `Ответим на${nbsp}все на${nbsp}бесплатной бизнес-консультации`,
        // Адрес консультации задаёт CMS банка; в историях ведёт в раздел бизнеса.
        href: 'https://www.tbank.ru/business/',
      },
    },
  },
};
