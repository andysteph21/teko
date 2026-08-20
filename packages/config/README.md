# @teko/config

Configurations partagées du monorepo Teko : **TypeScript**, **ESLint** (flat config, ESLint 9) et **Prettier**. Source unique de vérité pour l'outillage qualité, consommée par tous les packages et apps.

## Contenu

| Export                                     | Fichier                       | Usage                                                                      |
| ------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `@teko/config/tsconfig/base.json`          | `tsconfig/base.json`          | Base stricte commune (target ES2022, strict, `noUncheckedIndexedAccess`…). |
| `@teko/config/tsconfig/react-library.json` | `tsconfig/react-library.json` | Packages compilés (`dist/`), JSX.                                          |
| `@teko/config/tsconfig/nextjs.json`        | `tsconfig/nextjs.json`        | App admin Next.js.                                                         |
| `@teko/config/tsconfig/react-native.json`  | `tsconfig/react-native.json`  | Apps Expo (client & chauffeur) — étend `expo/tsconfig.base`.               |
| `@teko/config/eslint`                      | `eslint/base.js`              | Base JS + TS + Prettier.                                                   |
| `@teko/config/eslint/next`                 | `eslint/next.js`              | Variante admin (Next).                                                     |
| `@teko/config/eslint/react-native`         | `eslint/react-native.js`      | Variante mobile (Expo).                                                    |
| `@teko/config/prettier`                    | `prettier/index.js`           | Config Prettier.                                                           |

## Utilisation dans un package

`tsconfig.json` :

```json
{ "extends": "@teko/config/tsconfig/react-library.json", "include": ["src"] }
```

`eslint.config.js` :

```js
export { default } from "@teko/config/eslint";
```

`package.json` (Prettier) :

```json
{ "prettier": "@teko/config/prettier" }
```

## Notes

- Les variantes ESLint `next` et `react-native` sont pour l'instant de simples extensions de la base ; les plugins spécifiques (`eslint-config-next`, `eslint-config-expo`) seront ajoutés à la création des apps correspondantes (lots 3-5).
- Les versions des dépendances d'outillage sont figées via les **catalogs** pnpm (`pnpm-workspace.yaml`).
