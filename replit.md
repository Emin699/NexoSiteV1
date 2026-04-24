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

## NexoShop — Variantes & pool de stock (style MySellAuth)

- **Tables**: `product_variants` (id, productId, name, durationDays nullable, price numeric, sortOrder, isActive) + `stock_items` (id, variantId, content, status=available|sold, soldOrderId, soldAt). Index UNIQUE `stock_items_variant_content_uniq` sur `(variantId, content)` (anti-doublon).
- **Cart/Checkout**: `cart_items.variantId` + `orders.variantId/variantName/stockItemId`. Si une variante est sélectionnée et `deliveryType=auto`, le checkout consomme 1 row `stock_items` via `SELECT ... FOR UPDATE SKIP LOCKED LIMIT N` puis `UPDATE status='sold'` dans la même transaction (pas de double consommation en concurrent).
- **Routes admin**: `/admin/products/:id/variants[...]` + `/admin/products/:id/variants/:variantId/stock[...]`. Toutes les routes vérifient via `ensureVariantInProduct(productId, variantId)` que la variante appartient bien au produit (anti cross-product). Bulk POST stock dédoublonne en payload + utilise `ON CONFLICT DO NOTHING`.
- **Backward compat**: les produits sans variantes utilisent toujours le `digitalContent` legacy.
- **Admin UI**: `components/admin-product-modal.tsx` avec 3 onglets (Infos / Variantes / Stock). Onglets Variantes/Stock désactivés tant que le produit n'est pas sauvegardé. Ajout rapide variantes par boutons preset (1/3/6/12 mois) + custom. Stock : selecteur de variante, bulk paste (1 code/ligne), liste avec suppression individuelle, stats Disponibles/Vendus en temps réel.

## NexoShop — Système de tickets / Support

- **Schéma**: `tickets` (id serial, userId, category=support|question|replacement, subcategory=basic_fit|other (NULL si non-replacement), subject, body initial, formData JSON, status=open|closed, lastReplyBy=user|admin, createdAt, updatedAt) + `ticket_messages` (ticketId FK, authorId, authorRole=user|admin, body, createdAt).
- **API user**: `GET /tickets` (mes tickets), `GET /tickets/:id` (détail+messages), `POST /tickets` (create — body validation + subcategory obligatoire si replacement), `POST /tickets/:id/messages` (reply, 403 si fermé).
- **API admin**: `GET /admin/tickets?status=open|closed|all` (validé, 400 sinon), `GET /admin/tickets/:id`, `POST /admin/tickets/:id/messages` (403 si fermé, transaction `FOR UPDATE` anti-TOCTOU), `POST /admin/tickets/:id/status` (open/closed).
- **Frontend**: `pages/support.tsx` (3 boutons + dialog catégorie, replacement → choix Basic Fit/Autre puis form dynamique), `pages/support-ticket.tsx` (vue chat, polling 15s), `components/admin-tickets.tsx` (liste filtrable + dialog admin avec reply + close/rouvrir).
- **Champs Basic Fit**: nom, prénom, dateNaissance, dateAchat, dernierMail (tous obligatoires). **Autre**: nomProduit, identifiant (obligatoires) + autresInfos (optionnel). Sauvegardés dans `tickets.formData` JSON, affichés dans card "Infos transmises".
- **Notif visuelle**: pastille violette à côté du ticket si `lastReplyBy=admin` (côté user) ou `lastReplyBy=user` (côté admin).
