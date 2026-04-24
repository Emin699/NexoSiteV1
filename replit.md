# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## NexoShop — Sécurité

- **Auth**: Bearer token HMAC-signé (`SESSION_SECRET`), middleware `requireAuth`/`requireAdmin` sur toutes les routes sensibles.
- **Headers**: `helmet` + rate limiting (`express-rate-limit`) sur auth/wallet/orders/cart.
- **Atomicité financière**: tous les débits/crédits utilisent `UPDATE ... WHERE balance >= x` + `returning()` (pas de read-then-write race). Vérifié sur `orders/buy`, `cart/checkout`, `loyalty/convert`, `wheel/spin`, `wallet/recharge/crypto/verify`.
- **Recharge crypto LTC**: vérification on-chain via Blockchair (`lib/ltc-verify.ts`), valide hash format, existence, confirmations, adresse destinataire, montant reçu. Index UNIQUE sur `crypto_recharges.tx_hash` (anti-replay).
- **Recharge PayPal**: table `paypal_recharges` (orderId UNIQUE) liée à userId+amount à la création; `/capture` vérifie record + propriété + amount + transition atomique `created → captured`.
- **Erreurs**: handler global masque tout en prod; routes ne renvoient `e.message` qu'avec `e.status` explicite (erreurs métier intentionnelles).
