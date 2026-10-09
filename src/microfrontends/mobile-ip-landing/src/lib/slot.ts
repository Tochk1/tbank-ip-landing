import type { ReactNode } from 'react';

/**
 * Слот из хоста считается пустым, если в нём нечего рендерить: так CMS отдаёт блок,
 * пока банк не подключил свою форму. Пустой слот прячет и всё, что к нему ведёт.
 */
export const hasSlot = (node: ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== '';
