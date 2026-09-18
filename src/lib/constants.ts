// Zero-dependency constants/types shared by the app. Kept separate from schema.ts
// so importing these never pulls Zod into the client bundle.
export const LANGS = ['pl', 'en'] as const;
export const AUDIENCES = ['kids', 'adults'] as const;
export type Lang = (typeof LANGS)[number];
export type Audience = (typeof AUDIENCES)[number];
