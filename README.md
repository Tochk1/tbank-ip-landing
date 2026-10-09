# Короткий лендинг «Откройте ИП»: микрофронты для бизнес-лендингов Т-Банка

Репозиторий собран на шаблоне банка для подрядчиков (`monorep-template`). Конфиги, `src/styles`,
`src/microfrontends/_template` и `tools` шаблона не изменены. Правила шаблона —
в `docs/development-conventions.md`.

## Блоки

| Блок                 | Что это                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `desktop-ip-landing` | Лендинг «Откройте ИП», десктоп: первый экран с формой, шаги прокруткой, подарки |
| `mobile-ip-landing`  | То же для мобильного веба                                                       |

Каждый блок самодостаточен, общих пакетов между ними нет. Пропсы сериализуемые, их задаёт CMS;
описание пропсов — `src/types.ts` блока. Форма заявки приходит слотом `form`, в Storybook на её
месте демо-форма. Картинки приходят ссылками из CMS, растр в бандл блока не попадает: ассеты
в `src/__stories__/assets` нужны только историям.

## Запуск

Yarn 1 включается через `corepack enable`.

```bash
yarn install
yarn storybook        # Storybook на http://localhost:3040
yarn check:all        # типы, ESLint (--max-warnings=0), Stylelint
yarn storybook:build  # статическая сборка в public/storybook
```

Истории:

| Блок    | История                                           |
| ------- | ------------------------------------------------- |
| Десктоп | `microfrontends/pages/desktop-ip-landing/default` |
| Мобайл  | `microfrontends/pages/mobile-ip-landing/default`  |

Кроме основной, у каждого блока есть истории граничных случаев: без формы, длинные тексты,
без картинок, пустые списки, ссылка «Остались вопросы?» без адреса и с небезопасным адресом,
хост с `overflow` (шаги списком), reduced motion.

## Сборка пакета для интеграции

```bash
yarn prepare-integration desktop-ip-landing
yarn prepare-integration mobile-ip-landing
```

Пакет появляется в `integration-ready/<блок>`: имя `@growth-blocks/<блок>`, `dependencies` сняты,
в `peerDependencies` добавлены `@growth-blocks/mocks` и `classnames`.

## Условия для хоста

Высота шапки, липкая шапка, `overflow` у предков, слот формы, санитайзер
`isomorphic-dompurify@^2` (peer-зависимость, ставит хост) и подложка шапки при прокрутке —
в [INTEGRATION.md](INTEGRATION.md).
