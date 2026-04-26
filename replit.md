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

## NexoShop — Catégories dynamiques + Stock illimité + Markdown

- **Table `categories`**: id serial, name unique, slug unique (slugify), icon text, sortOrder int. Seed initial des 6 catégories d'origine.
- **Routes**: `GET /categories` (public), `GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/:id` (admin). DELETE refusé si produits liés (409). PATCH propage le rename vers `products.category` dans une transaction.
- **Frontend**: `useGetCategories` partout (home, modal admin, fallback hardcodé si pending). Page admin onglet "Catégories" → `components/admin-categories-manager.tsx` (CRUD avec inline edit).
- **Stock illimité** : `products.unlimitedStock` boolean. Toggle dans modal admin onglet Infos. Si activé : checkout `cart.ts` skip la réservation `stock_items` même si variantId présent → livre via `digitalContent` (template). Pas de FOR UPDATE consommé.
- **Markdown produit** : `lib/markdown.tsx` (mini parseur maison **gras** *italique* `code` + paragraphes + listes `- `). Page `/product/:id` rend la description longue avec `<Markdown source={...}>`. Helper visible dans le textarea description du modal admin.
- **Sélecteur de variantes côté client** : page `/product/:id` montre la liste des variantes actives en cards cliquables (highlight primary border quand sélectionnée), prix + stock par variante, prix total live. Bouton "Acheter" avec variante = ajout panier + redirect `/cart` (la route `/buy` ne supporte pas variantId). "Choisissez une variante" requis avant action.
- **Cards refondues** : `product-card-holo.tsx` retire le badge "✦ Catégorie" et le label "Livraison instantanée/manuelle". Description plus grande (`text-[13px]`, line-clamp-3, min-h-[54px]).

## NexoShop — Animation MERCI + Reviews avec validation

- **Schema `reviews.is_auto`** boolean. **Plusieurs avis par (user, product) sont autorisés** — pas de contrainte unique.
- **POST /reviews** : validation `comment` minLength=10 (zod + front), contrôle d'éligibilité (l'utilisateur doit avoir au moins 1 commande livrée pour le `productId`, sinon 403). Toujours +1 spin gratuit après succès. Pas de blocage si l'utilisateur a déjà reviewé.
- **GET /reviews/me** (auth) : retourne les reviews du user courant `[{productId, rating, comment, isAuto, createdAt}]`. Conservé pour l'historique mais plus utilisé pour gating front (le bouton "Laisser un avis" est désormais toujours affiché sur les commandes livrées).
- **Auto-review sweep** : fonction `maybeRunAutoReviewSweep()` rate-limited 60s, déclenchée en arrière-plan sur GET /reviews et /reviews/me. Scanne les commandes `delivered_at <= now()-24h` sans review existante, insère une review 5 étoiles avec `isAuto=true` et un message random parmi 5 templates positifs.
- **Order.productId** ajouté au schema OpenAPI Order (requis). Côté API, `GET /orders`, `POST /orders/buy` et `POST /orders/:id/customer-info` exposent `productId` (sinon 500 zod parse).
- **Frontend** :
  - `components/thank-you-modal.tsx` : modal "MERCI !" avec cœur fuchsia animé `heartbeat` + sparkles flottants. Phase 1 = animation seule (~1.4s), phase 2 = boutons "Plus tard" / "Laisser un avis". Cleanup setTimeout au unmount.
  - `components/review-modal.tsx` : prop `onSubmitted` optionnelle (sinon `onClose`), bouton submit `disabled` si `comment.trim().length < 10`, compteur live "Encore X caractères requis" → "Commentaire suffisant ✓" en vert, compteur 500 max.
  - Flow checkout : `cart.tsx` (panier), `home.tsx` (achat rapide depuis card), `product-detail.tsx` (achat direct) → ThankYouModal → soit `/orders` soit ReviewModal → `/orders` après envoi/skip.
  - `pages/orders.tsx` : `useGetMyReviews` → `Set` des productId déjà reviewés. Pour chaque commande livrée : bouton fuchsia "Laisser un avis" si non reviewé, sinon badge vert "Avis déjà publié". Le bouton "Modifier mes infos" est masqué quand `status='delivered'`.

## NexoShop — Bot Telegram (`artifacts/telegram-bot`)

- **Stack** : `telegraf` v4 + Drizzle (table partagée `bot_subscribers` dans `lib/db/src/schema/bot_subscribers.ts` — clé primaire `telegram_id` bigint).
- **Build** : esbuild → `dist/index.mjs`. La logo `artifacts/nexoshop/public/nexoshop-icon.png` est copiée dans `dist/logo.png` au build pour le fallback local.
- **Commandes** :
  - `/start` : insère/met à jour le subscriber (upsert sur `telegram_id`), envoie photo (logo) + caption HTML « Salut <b>X</b> / 🆔 ID / 👤 Pseudo / texte d'intro » + 3 boutons inline (Boutique / Canal / Preuves).
  - `/sayall` : admin uniquement (whitelist `TELEGRAM_ADMIN_ID` CSV). Active un mode diffusion (Set en mémoire). Le **prochain message** envoyé par l'admin (n'importe quel type — texte formaté, photo, vidéo, GIF, sticker, audio, document, emoji animé Telegram) est diffusé à tous les `bot_subscribers` non bloqués via `copyMessage` (préserve format + média, pas de header « Forwarded from »). Throttle 50ms entre envois (~20 msg/s, sous la limite Telegram). Codes 403/400 → marque subscriber `blocked=true`.
  - `/cancel` : sort du mode diffusion.
- **Variables d'env requises** (`.env` du VPS, jamais stockées sur Replit) :
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_ID` (CSV possible), `TELEGRAM_SHOP_URL`, `TELEGRAM_CHANNEL_URL`, `TELEGRAM_PROOFS_URL`.
  - Optionnels : `TELEGRAM_WELCOME_TEXT` (HTML), `TELEGRAM_LOGO_URL` (URL ou chemin absolu, défaut = logo bundlé), `TELEGRAM_SHOP_BUTTON_TEXT`, `TELEGRAM_CHANNEL_BUTTON_TEXT`, `TELEGRAM_PROOFS_BUTTON_TEXT`.
- **Déploiement VPS** : `pnpm --filter @workspace/telegram-bot run build` puis `pm2 start /var/www/nexosite/artifacts/telegram-bot/dist/index.mjs --name nexoshop-bot --update-env` (ou existant `pm2 restart nexoshop-bot --update-env`). Partage la même `DATABASE_URL` que l'API.

## NexoShop — Refonte DA logo (avril 2026)

- **Palette CSS** (`src/index.css`) : `--primary: 211 100% 56%` (bleu logo `#1E90FF`), `--secondary: 28 100% 55%` (orange logo `#FF8C00`), `--accent` = orange. Cards/bg ajustés `222 35% 13%`.
- **Logos** dans `public/` : `nexoshop-icon.png` (carré favicon + header) + `nexoshop-logo.png` (wordmark).
- **`index.html`** : favicon `/nexoshop-icon.png`, theme-color `#1E90FF`.
- **`layout.tsx`** : header centré, `<Link href="/">` avec icône 7×7 + wordmark h-6.
- **Remplacements globaux** `fuchsia/pink/purple/violet` → `primary/secondary` dans : thank-you-modal, orders, product-detail, product-card-holo, markdown, profile, admin-product-modal, admin-logs, admin-users, admin-tickets, support, support-ticket, wheel (sauf segments roue qui gardent leurs couleurs sémantiques individuelles).
- **product-card-holo** : `CATEGORY_GRADIENTS` repensés sur palette bleu/orange + halo conique `#1E90FF / #FF8C00`.
