import type { FC, ReactNode } from 'react';
import type { StoryFn, StoryObj } from '@storybook/react';
import DesktopIpLanding, { type DesktopIpLandingProps } from '../index';
import type { DiMap } from '../types';
import { content } from './content';
import { DemoForm } from './demo-form';
import { HostHeader } from './host-header';

type StoryProps = Omit<DesktopIpLandingProps, 'di' | 'form'> & {
  layout: 'desktop' | 'mobile';
  /** Заглушка шапки хоста: липкая, как в макете второго экрана. */
  withHostHeader: boolean;
  /** Подключена ли форма банка в слот. */
  withForm: boolean;
  /** Обёртка хоста с overflow: так sticky не работает и блок встаёт списком. */
  hostOverflow: boolean;
};

function get<T extends keyof DiMap>(this: DiMap, key: T): DiMap[T] {
  return this[key];
}

const HostOverflow = ({ children }: { children: ReactNode }) => (
  <div style={{ overflow: 'hidden' }}>{children}</div>
);

const Block: StoryFn<FC<StoryProps>> = ({
  layout,
  withHostHeader,
  withForm,
  hostOverflow,
  ...props
}: StoryProps) => {
  const values: DiMap = { layout };
  const page = (
    <DesktopIpLanding
      {...props}
      form={withForm ? <DemoForm layout="desktop" /> : undefined}
      di={{ get: get.bind(values) as typeof get }}
    />
  );

  return (
    <>
      {withHostHeader && <HostHeader height={props.headerOffset ?? 96} />}
      {hostOverflow ? <HostOverflow>{page}</HostOverflow> : page}
    </>
  );
};

const base: StoryProps = {
  ...content,
  headerOffset: 96,
  // Заглушка шапки в историях липкая: фон первого экрана заходит под неё.
  bleedUnderHeader: true,
  layout: 'desktop',
  withHostHeader: true,
  withForm: true,
  hostOverflow: false,
};

const parameters = { layout: 'fullscreen' };

export const Default: StoryObj<typeof Block> = {
  render: Block,
  args: base,
  argTypes: {
    layout: {
      control: 'radio',
      options: ['desktop', 'mobile'],
    },
  },
  parameters,
  name: 'default',
};

/** Пустой слот формы: так блок выглядит в CMS, пока банк не подключил форму. */
export const WithoutForm: StoryObj<typeof Block> = {
  render: Block,
  args: { ...base, withForm: false },
  parameters,
  name: 'without-form',
};

const triple = (text: string) => [text, text, text].join(' ');

/** Тексты CMS втрое длиннее макетных, заголовок блока в три строки. */
export const LongTexts: StoryObj<typeof Block> = {
  render: Block,
  args: {
    ...base,
    benefits: base.benefits.map((benefit) => ({
      ...benefit,
      textHtml: triple(benefit.textHtml.replace(/<br>/g, ' ')),
    })),
    process: {
      ...base.process,
      title: triple(base.process.title),
      tabLabel: 'Начать свой бизнес прямо сейчас, без визита в налоговую',
      steps: base.process.steps.map((step) => ({
        ...step,
        textHtml: triple(step.textHtml),
        note: triple(step.note),
      })),
      gift: {
        ...base.process.gift,
        items: base.process.gift.items.map((item) => ({ ...item, text: triple(item.text) })),
        help: { ...base.process.gift.help, text: triple(base.process.gift.help.text) },
      },
    },
  },
  parameters,
  name: 'long-texts',
};

/** CMS не прислала ни одной картинки: блок без img и без пустых мест под ними. */
export const NoImages: StoryObj<typeof Block> = {
  render: Block,
  args: {
    ...base,
    heroBackground: { src: '', alt: '' },
    process: {
      ...base.process,
      gift: {
        ...base.process.gift,
        marker: undefined,
        items: base.process.gift.items.map((item) => ({ ...item, image: undefined })),
      },
    },
  },
  parameters,
  name: 'no-images',
};

export const EmptyBenefits: StoryObj<typeof Block> = {
  render: Block,
  args: { ...base, benefits: [] },
  parameters,
  name: 'empty-benefits',
};

/** Пустой список подарков: остаются значок, подзаголовок и блок вопросов. */
export const EmptyGiftItems: StoryObj<typeof Block> = {
  render: Block,
  args: {
    ...base,
    process: { ...base.process, gift: { ...base.process.gift, items: [] } },
  },
  parameters,
  name: 'empty-gift-items',
};

/** «Остались вопросы?» без ссылки в CMS: текст без рамки, не карточка-действие. */
export const HelpWithoutLink: StoryObj<typeof Block> = {
  render: Block,
  args: {
    ...base,
    process: {
      ...base.process,
      gift: { ...base.process.gift, help: { ...base.process.gift.help, href: undefined } },
    },
  },
  parameters,
  name: 'help-without-link',
};

/**
 * В CMS ссылка с опасной схемой (javascript:). Белый список safeHref её не пропускает:
 * блок «Остались вопросы?» рендерится текстом без ссылки, как без href.
 */
export const HelpUnsafeLink: StoryObj<typeof Block> = {
  render: Block,
  args: {
    ...base,
    process: {
      ...base.process,
      gift: {
        ...base.process.gift,
        help: { ...base.process.gift.help, href: 'javascript:alert(document.domain)' },
      },
    },
  },
  parameters,
  name: 'help-unsafe-link',
};

/**
 * Ссылка с обратной косой чертой после слеша: браузер читает «/\host» как «//host», то есть
 * переход на чужой сайт. safeHref её отклоняет: блок без ссылки.
 */
export const HelpBackslashLink: StoryObj<typeof Block> = {
  render: Block,
  args: {
    ...base,
    process: {
      ...base.process,
      gift: {
        ...base.process.gift,
        help: { ...base.process.gift.help, href: '/\\evil.example/consult' },
      },
    },
  },
  parameters,
  name: 'help-backslash-link',
};

/** У хоста overflow на обёртке: sticky не работает, шаги и подарки стоят списком. */
export const HostOverflowList: StoryObj<typeof Block> = {
  render: Block,
  args: { ...base, hostOverflow: true },
  parameters,
  name: 'host-overflow-list',
};

/**
 * Reduced motion, десктоп. Storybook не включает медиазапрос из истории: история показывает
 * обычный блок, режим включается в браузере (DevTools, Rendering, «Emulate CSS media feature
 * prefers-reduced-motion: reduce»). Что меняется по коду (process/styles.module.css, блок
 * prefers-reduced-motion: reduce; hooks/use-hint-nudge.ts; hooks/use-scroll-steps.ts):
 * - текст карты шага сменяется сразу, без угасания и сдвига снизу;
 * - смена шага на подарки, подарки по одному и свечение — без переходов;
 * - подсказка «ниже есть ещё» не запускается, раздел стоит на месте;
 * - прокрутка по корешку, точкам и вкладке мгновенная, без плавности;
 * - точка на наведение темнеет, а не растёт; у вкладки и кнопки нет перехода цвета.
 * Наезд плашки на первый экран и листание подарков внутри плашки идут вровень с прокруткой,
 * а не по времени, поэтому остаются.
 */
export const ReducedMotion: StoryObj<typeof Block> = {
  render: Block,
  args: base,
  parameters: {
    ...parameters,
    docs: {
      description: {
        story:
          'Включите prefers-reduced-motion: reduce в DevTools (Rendering). Десктоп: текст карты сменяется сразу, без угасания и сдвига; подарки и свечение появляются без переходов; подсказка у корешка не запускается; прокрутка по корешку, точкам и вкладке мгновенная; точка на наведение темнеет, а не растёт. Наезд плашки и листание подарков идут вровень с прокруткой.',
      },
    },
  },
  name: 'reduced-motion',
};

export default {
  title: 'microfrontends/pages/desktop-ip-landing/default',
};
