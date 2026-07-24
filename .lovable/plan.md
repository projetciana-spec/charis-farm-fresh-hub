# Plan : Charis FERME — Application web

## Vue d'ensemble

Site vitrine + boutique en ligne pour Charis FERME (Zogbodomè), avec commandes invité, notification WhatsApp automatique vers +22955345916, et espace admin sécurisé pour gérer produits, bannières et commandes.

## Stack technique

- Frontend : TanStack Start (déjà en place), Tailwind, style inspiré du template ORGN (vert nature, typographie Inter, cards produits, hero pleine largeur).
- Base de données : Lovable Cloud (Supabase managé).
- Notifications WhatsApp : intégration Twilio via connecteur Lovable (envoi automatique) + lien wa.me visible dans l'admin en secours.
- Authentification : admin uniquement (email/mot de passe). Clients = commande invité.

## Structure des pages (routes publiques)

```
/                    Accueil (hero, catégories, produits vedettes, à propos, témoignages, CTA)
/produits            Catalogue complet, filtres par catégorie
/produits/$slug      Détail produit + bouton "Commander"
/visites             Page dédiée aux visites de la ferme (tarifs, réservation)
/notre-histoire      À propos (activités depuis 2018, valeurs)
/contact             Coordonnées + formulaire suggestion
/panier              Panier + tunnel de commande
/commande/confirmee  Confirmation post-commande
```

Chaque route a son propre `head()` (title, description, og).

## Espace admin (routes protégées)

```
/auth                    Login admin (email + mot de passe)
/_authenticated/admin                     Tableau de bord (résumé commandes, suggestions)
/_authenticated/admin/produits            Liste, ajout, édition, suppression + upload images
/_authenticated/admin/categories          Gestion catégories
/_authenticated/admin/bannieres           Bannières promo/offres exclusives (image + texte + lien + actif)
/_authenticated/admin/commandes           Toutes les commandes avec statut (nouveau, en cours, livré, annulé)
/_authenticated/admin/commandes/$id       Détail commande + bouton "Ouvrir WhatsApp"
/_authenticated/admin/suggestions         Messages/suggestions clients
/_authenticated/admin/parametres          Coordonnées ferme, numéro WhatsApp destinataire
```

Rôle admin stocké dans une table `user_roles` séparée avec fonction `has_role` (security definer).

## Base de données SuperBase uniquement

Tables :

- `categories` (id, nom, slug, ordre)
- `produits` (id, nom, slug, description, prix, unite, categorie_id, image_url, en_stock, mis_en_avant, created_at)
- `bannieres` (id, titre, sous_titre, image_url, cta_texte, cta_lien, actif, ordre)
- `commandes` (id, nom, prenom, whatsapp, email, adresse, notes, total, statut, created_at)
- `commande_items` (id, commande_id, produit_id, nom_snapshot, prix_snapshot, quantite)
- `suggestions` (id, nom, email, whatsapp, message, lu, created_at)
- `parametres` (id, cle, valeur) — pour numéro WhatsApp admin, coordonnées
- `user_roles` (id, user_id, role) + enum `app_role` + fonction `has_role`

RLS :

- `produits`, `categories`, `bannieres` : SELECT anon (actif=true uniquement pour bannières), ALL admin
- `commandes`, `commande_items`, `suggestions` : INSERT anon (public peut commander), SELECT/UPDATE admin uniquement
- Storage bucket `farm-images` public en lecture, écriture admin.

## Catalogue produits initial (seed migration)

Volailles : Œufs frais bio (1 500/douzaine), Poulet fermier (4 000/kg), Pintade, Lapin
Bovins : Viande de bœuf (3 500/kg), Lait frais (500/l), Wagashi (1 000/pièce)
Porcins : Viande de porc (2 800/kg), Charcuterie (3 500/kg)
Élevage spécial : Agoutis, Poisson
Maraîchage : Panier légumes bio 5kg (3 000), Légumes à l'unité (prix variable)
Visites : Individuel (5 000/pers), Couple (10 000)

Les produits sans prix fixe (Lapin, Pintade, Agoutis, Poisson, légumes à l'unité) affichent "Prix sur demande" avec commande via formulaire.

## Flux de commande client (invité)

1. Client ajoute des produits au panier (localStorage).
2. Sur `/panier` → formulaire : nom, prénom, WhatsApp*, email, adresse, notes.
3. Deux boutons :
  - **"Valider la commande"** : POST vers un TanStack server route qui :
    - Valide (Zod : longueurs, format email, format WhatsApp)
    - Insère `commandes` + `commande_items` via `supabaseAdmin`
    - Appelle l'API Twilio (gateway Lovable) pour envoyer un WhatsApp formaté au +22955345916 avec récap commande + coordonnées client
    - Retourne succès → redirection `/commande/confirmee`
  - **"Commander via WhatsApp"** : ouvre `wa.me/22955345916` avec message pré-rempli (produits + quantités + coordonnées saisies). Commande également enregistrée en base pour l'admin.

Si Twilio échoue silencieusement, la commande reste visible dans l'admin et un lien wa.me est disponible côté admin.

## Notification Twilio WhatsApp

- Utilisation du connecteur Twilio via gateway Lovable (nécessitera de lier une connexion Twilio configurée avec un sender WhatsApp).
- Server route `/api/orders` construit le message :
  ```
  🌱 Nouvelle commande Charis FERME
  Client : {prenom} {nom}
  WhatsApp : {whatsapp}
  Email : {email}
  Adresse : {adresse}
  ─────────────
  {liste produits × quantité — prix}
  ─────────────
  Total : {total} XOF
  Notes : {notes}
  ```
- Envoi vers `whatsapp:+22955345916` depuis un numéro Twilio WhatsApp (à configurer).
- En cas d'échec Twilio, log l'erreur mais retourne succès au client (la commande est enregistrée).

## Design (inspiré du template ORGN, adapté ferme africaine)

- Palette : vert nature (primary), terre/beige (secondary), blanc cassé (background). Tokens définis dans `src/styles.css` en oklch.
- Typographie : Inter (chargée via link dans __root).
- Hero : image ferme + baseline "Direct de la ferme à votre table", CTAs "Commander" et "Nos produits".
- Sections : bandeaux confiance (Bio, Local, Frais, Livraison), grille produits vedettes, section "Depuis 2018", visites de la ferme, témoignages, CTA newsletter (optionnel), footer avec coordonnées.
- Bannière dynamique tirée de la table `bannieres` sur la home.

## Détails techniques

- Server functions dans `src/lib/*.functions.ts` pour lectures publiques (produits, bannières) via client publishable.
- Server route `/api/orders` (POST) pour créer commande + notifier Twilio.
- Server route `/api/suggestions` (POST) pour le formulaire de contact.
- Server functions protégées (`requireSupabaseAuth` + vérification rôle admin) pour toutes les opérations admin.
- Upload images via Supabase Storage, bucket `farm-images`.
- Logo : placeholder généré (à remplacer par le logo validé par le papa).

## Étapes d'implémentation

1. Activer Lovable Cloud.
2. Migration SQL : enum, tables, RLS, grants, fonction `has_role`, bucket storage, seed produits/catégories/paramètres.
3. Design system : mise à jour `src/styles.css` (tokens verts terre) + typographie Inter dans `__root.tsx`.
4. Composants partagés : Header (nav + panier), Footer, ProductCard, BannerHero, CartDrawer.
5. Routes publiques : /, /produits, /produits/$slug, /visites, /notre-histoire, /contact, /panier, /commande/confirmee.
6. Panier via Zustand + localStorage.
7. Route auth : `/auth` (login admin).
8. Layout `_authenticated` (managé par intégration Supabase) + gate rôle admin dans chaque page admin.
9. Pages admin : dashboard, produits (CRUD + upload), catégories, bannières, commandes, suggestions, paramètres.
10. Connecteur Twilio + server route `/api/orders` avec envoi WhatsApp.
11. Server route `/api/suggestions`.
12. Head/SEO par page, favicon.
13. Créer le premier compte admin (via inscription puis attribution manuelle du rôle dans la migration ou par server fn ponctuelle).

## Ce qui reste à confirmer plus tard

- Logo (en attente de validation du papa) → placeholder pour l'instant.
- Compte Twilio : je préparerai le code, mais l'envoi WhatsApp réel nécessitera que vous connectiez Twilio (compte + sender WhatsApp approuvé) via l'écran de connecteurs. En attendant, les commandes s'enregistrent et le lien wa.me fonctionne.
- Email de l'admin pour créer le premier compte.