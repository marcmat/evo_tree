// Zero-dependency constants/types shared by the app. Kept separate from schema.ts
// so importing these never pulls Zod into the client bundle.
// Only Polish and the kids register are reachable. The data files still carry
// `en` and `adults` text, but nothing can select them — not the toolbar, and not
// a crafted ?lang=/?aud= link, because initLang/initAudience run every candidate
// through pick() against these lists and fall back when it is not present.
// Re-enabling either is a one-word change here plus restoring its toolbar group.
export const LANGS = ['pl'] as const;
export const AUDIENCES = ['kids'] as const;
export type Lang = (typeof LANGS)[number];
export type Audience = (typeof AUDIENCES)[number];
