import type { Lang } from './constants';
import { i18n } from './data';
import type { I18nStrings } from './schema';

export function strings(lang: Lang): I18nStrings {
  return i18n[lang];
}
