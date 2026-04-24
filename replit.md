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
- **Contenu digital privé**: `digitalContent` et `digitalImageUrl` (template livraison auto des produits) sont strippés des routes publiques `/products` et `/products/:id` pour empêcher la lecture du contenu sans achat. Visible seulement via `/admin/products` ou après checkout dans la commande personnelle.

## NexoShop — Système de commandes/livraison

- **Produits auto** (`deliveryType="auto"`): l'admin saisit `digitalContent` (texte long) + `digitalImageUrl` optionnel à la création. Au checkout, l'order passe direct en `status="delivered"` avec `credentials = product.digitalContent`. Le client voit le contenu instantanément dans le dialog post-paiement.
- **Produits manuels** (`deliveryType="manual"`): order créé en `status="pending"`. L'admin livre via panel `/admin` → onglet "Commandes" → bouton "Envoyer la commande" → dialog avec textarea + upload image → `POST /admin/orders/:id/deliver`. L'order passe en `delivered` avec credentials saisies.
- **File d'attente**: `GET /orders/pending-count` renvoie le nombre global de pending. Si ≥5, le dialog post-checkout client affiche un avertissement "file chargée".
- **Page /orders** ("Commandes passées"): toutes les commandes du user, accessible depuis profil → menu, badge statut (Livrée/En cours), bouton "Voir" pour voir credentials/image dans dialog avec lightbox.
- **Tables**: `products.digitalContent` (text), `products.digitalImageUrl` (text). `orders.productEmoji` (default 🛍️), `orders.deliveryImageUrl` (text).

## NexoShop — Système de tickets / Support

- **Schéma**: `tickets` (id serial, userId, category=support|question|replacement, subcategory=basic_fit|other (NULL si non-replacement), subject, body initial, formData JSON, status=open|closed, lastReplyBy=user|admin, createdAt, updatedAt) + `ticket_messages` (ticketId FK, authorId, authorRole=user|admin, body, createdAt).
- **API user**: `GET /tickets` (mes tickets), `GET /tickets/:id` (détail+messages), `POST /tickets` (create — body validation + subcategory obligatoire si replacement), `POST /tickets/:id/messages` (reply, 403 si fermé).
- **API admin**: `GET /admin/tickets?status=open|closed|all` (validé, 400 sinon), `GET /admin/tickets/:id`, `POST /admin/tickets/:id/messages` (403 si fermé, transaction `FOR UPDATE` anti-TOCTOU), `POST /admin/tickets/:id/status` (open/closed).
- **Frontend**: `pages/support.tsx` (3 boutons + dialog catégorie, replacement → choix Basic Fit/Autre puis form dynamique), `pages/support-ticket.tsx` (vue chat, polling 15s), `components/admin-tickets.tsx` (liste filtrable + dialog admin avec reply + close/rouvrir).
- **Champs Basic Fit**: nom, prénom, dateNaissance, dateAchat, dernierMail (tous obligatoires). **Autre**: nomProduit, identifiant (obligatoires) + autresInfos (optionnel). Sauvegardés dans `tickets.formData` JSON, affichés dans card "Infos transmises".
- **Notif visuelle**: pastille violette à côté du ticket si `lastReplyBy=admin` (côté user) ou `lastReplyBy=user` (côté admin).
