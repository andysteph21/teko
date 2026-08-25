# @teko/config

Configurations **TypeScript** partagées du monorepo Teko — source unique de vérité, consommée par tous les packages et apps.

**Lint & format : [Biome](https://biomejs.dev)**, configuré à la **racine du dépôt** (`biome.json`, config monorepo native : les packages qui ont besoin d'une surcharge posent un `biome.json` local avec `"extends": "//"`). Les règles et garde-fous sont actés dans [docs/architecture/10-regles-ingenierie.md](../../docs/architecture/10-regles-ingenierie.md) §2. ESLint et Prettier ont été retirés le 25 août 2026.

## Contenu

| Export                                     | Fichier                       | Usage                                                                      |
| ------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `@teko/config/tsconfig/base.json`          | `tsconfig/base.json`          | Base stricte commune (target ES2022, strict, `noUncheckedIndexedAccess`…). |
| `@teko/config/tsconfig/react-library.json` | `tsconfig/react-library.json` | Packages compilés (`dist/`), JSX.                                          |
| `@teko/config/tsconfig/nextjs.json`        | `tsconfig/nextjs.json`        | App admin Next.js.                                                         |
| `@teko/config/tsconfig/react-native.json`  | `tsconfig/react-native.json`  | Apps Expo (client & driver) — étend `expo/tsconfig.base`.                  |

## Utilisation dans un package

`tsconfig.json` :

```json
{ "extends": "@teko/config/tsconfig/react-library.json", "include": ["src"] }
```

Lint/format : rien à configurer dans le package — `pnpm lint` à la racine couvre tout le dépôt.
