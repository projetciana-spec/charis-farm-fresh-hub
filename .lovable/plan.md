## Objectif

Ajouter l'espace d'administration sécurisé de Charis FERME, entièrement connecté à la base de données ( Supabase) : aucune donnée en dur, tout est lu et écrit en base.  
j'exige uniquement supabase 

## Ce qui existe déjà

- Tables en base : `categories`, `produits`, `bannieres`, `commandes`, `commande_items`, `suggestions`, `parametres`, `user_roles` + fonction `has_role`.
- Bucket de stockage privé `farm-images`.
- Site public déjà branché en lecture sur la base (`src/lib/catalog.functions.ts`).
- Il n'existe encore aucune page `/auth` ni `/admin`.

## Pages à créer

```
/auth                          Connexion admin (email + mot de passe)
/admin                         Tableau de bord (chiffres clés)
/admin/produits                Liste + création + édition + suppression
/admin/categories              Gestion des catégories
/admin/bannieres               Bannières d'accueil (image, texte, CTA, actif)
/admin/commandes               Liste filtrable par statut
/admin/commandes/$id           Détail commande + changement de statut + lien WhatsApp
/admin/suggestions             Messages clients, marquer comme lus, supprimer
/admin/parametres              Coordonnées ferme et numéro WhatsApp destinataire
```

Toutes les pages admin vivent sous le layout protégé `_authenticated` (redirection vers `/auth` si non connecté), plus une vérification du rôle `admin` côté serveur à chaque opération.

## Fonctionnalités par écran

**Tableau de bord** : nombre de commandes du jour / en attente, chiffre d'affaires du mois, suggestions non lues, derniers messages et commandes, accès rapides.

**Produits** : tableau avec recherche et filtre par catégorie ; formulaire (nom, description, prix ou « prix sur demande », unité, catégorie, en stock, mis en avant, ordre) ; upload d'image vers le stockage ; slug généré automatiquement ; suppression avec confirmation.

**Catégories** : création, renommage, ordre d'affichage, suppression (bloquée si des produits y sont rattachés).

**Bannières** : image, titre, sous-titre, texte et lien du bouton, activation/désactivation, ordre. Les bannières actives s'affichent sur l'accueil.

**Commandes** : liste (numéro, client, total, statut, date), filtres par statut, détail avec les articles commandés, changement de statut (nouvelle → en cours → livrée / annulée), bouton « Ouvrir WhatsApp » pré-rempli vers le client.

**Suggestions** : liste des messages, marquage lu/non lu, suppression, réponse par WhatsApp ou e-mail en un clic.

**Paramètres** : numéro WhatsApp destinataire des commandes, téléphone public, adresse, horaires — stockés dans `parametres` et utilisés par le site public et les notifications.

## Détails techniques

- Toutes les écritures passent par des server functions protégées (`requireSupabaseAuth`) qui vérifient d'abord `has_role(userId, 'admin')` avant d'agir ; aucune écriture admin depuis le navigateur.
- Lectures admin via TanStack Query (`useQuery`) + invalidation après chaque mutation.
- Upload d'images : URL signée générée côté serveur, envoi direct dans le bucket `farm-images`, URL enregistrée sur le produit ou la bannière.
- Le site public passe entièrement sur les données de la base : bannières d'accueil, coordonnées du footer et numéro WhatsApp tirés de `parametres`.
- Une migration ajoutera si besoin une politique de lecture publique sur `parametres` (clés non sensibles) et le déclencheur de rôle admin.

## Création du premier compte admin

1. Vous créez un compte sur `/auth` avec votre e-mail.
2. Je vous attribue le rôle `admin` sur ce compte (une ligne dans `user_roles`).
3. Les inscriptions publiques restent désactivées pour l'espace admin : seuls les comptes avec le rôle `admin` accèdent au dashboard.

Dites-moi l'e-mail à utiliser pour ce compte administrateur, ou créez-le après la mise en ligne des pages et je le promeus ensuite.