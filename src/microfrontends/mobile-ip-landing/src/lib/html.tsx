import purify from 'isomorphic-dompurify';
import { useMemo } from 'react';
import type { ElementType } from 'react';

/**
 * Из визивига CMS пропускаем только разметку текста: переносы и начертание. Жёлтого выделения в
 * макете нет: mark в список не входит, санитайзер снимает тег и оставляет текст, выделение из CMS
 * читается обычным текстом.
 */
const ALLOWED_TAGS = ['br', 'b', 'strong', 'em', 'nobr'];

/**
 * Визивиг заворачивает каждую строку в абзац. Внутри заголовков и подписей абзацы не нужны:
 * стык абзацев превращаем в перенос строки, а сами теги p санитайзер снимает, оставив текст.
 */
const PARAGRAPH_JOINT = /<\/p>\s*<p(?:\s[^>]*)?>/gi;

export const sanitize = (html: string): string =>
  purify.sanitize(html.replace(PARAGRAPH_JOINT, '<br>'), { ALLOWED_TAGS, ALLOWED_ATTR: [] });

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
};

/**
 * Текст поля CMS без разметки, для подписей вроде aria-label. Результат попадает только
 * в атрибут, который React экранирует сам, поэтому HTML здесь не исполняется.
 */
export const toPlainText = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (_, name: string) => ENTITIES[name] ?? '')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();

/**
 * Ссылка из CMS попадает в href как есть, санитайзер HTML её не видит. Пропускаем только
 * https/http, mailto, tel, путь от корня сайта и якорь. Ссылка разбирается тем же парсером
 * URL, что у браузера: путь и якорь должны остаться на своём сайте (origin не меняется),
 * поэтому «//host» и «/\host» отклоняются. Обратная косая черта и управляющие символы
 * (браузер их выбрасывает или читает как «/») отклоняются сразу. Иначе — блок без ссылки.
 */
const SAFE_SCHEMES = ['https:', 'http:', 'mailto:', 'tel:'];
const SAME_SITE = 'https://aic-ip.invalid';
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;

export const safeHref = (href?: string): string | undefined => {
  const value = href?.trim();
  if (!value || UNSAFE_CHARS.test(value)) return undefined;
  let url: URL;
  try {
    url = new URL(value, SAME_SITE);
  } catch {
    return undefined;
  }
  if (value.startsWith('/') || value.startsWith('#')) {
    return url.origin === SAME_SITE ? value : undefined;
  }
  const absolute = /^[a-z][a-z0-9+.-]*:/i.test(value);
  return absolute && SAFE_SCHEMES.includes(url.protocol) ? value : undefined;
};

type HtmlProps = {
  html: string;
  as?: ElementType;
  className?: string;
  id?: string;
};

/** Текст из CMS. Любой HTML проходит через санитайзер (требование банка). */
export const Html = ({ html, as: Tag = 'span', className, id }: HtmlProps) => {
  const __html = useMemo(() => sanitize(html), [html]);
  return <Tag className={className} id={id} dangerouslySetInnerHTML={{ __html }} />;
};
