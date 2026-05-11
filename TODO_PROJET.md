# Todo projet New App / PrestaShop

Objectif: livrer uniquement les pages demandées, sans menu ni affichage additionnel, avec un workflow cohérent entre le backoffice, le frontoffice et les données importées dans PrestaShop.

## 0. Socle et sécurité

- [ ] Centraliser la configuration API dans `.env` et valider les variables au démarrage.
- [ ] Mettre en place une protection simple des routes backoffice avec login et mot de passe par défaut dans le formulaire.
- [ ] Bloquer l’accès direct aux pages backoffice si la session locale n’est pas validée.
- [ ] Prévoir un rafraîchissement des données après import, reset ou modification d’état pour garder l’ExistingApp synchronisée.

API concernées: aucune API métier obligatoire pour l’auth locale. Si une vérification serveur est nécessaire, utiliser `employees`.

## 1. Backoffice - Réinitialisation des données

- [ ] Créer la page de reset avec un seul bouton d’action.
- [ ] Supprimer proprement les données importées sans casser les références utiles.
- [ ] Réinitialiser les stocks à zéro si nécessaire.
- [ ] Garder les catégories de base et les données de structure si elles servent au front.

API à utiliser:
- `products`
- `categories`
- `combinations`
- `stock_availables`
- `specific_prices`
- `specific_price_rules`
- `images`
- `attachments`
- `order_details` si des commandes de test doivent être nettoyées
- `orders` si le reset doit inclure les commandes de test

## 2. Backoffice - Import des fichiers

- [ ] Créer la page d’import pour les 4 fichiers attendus.
- [ ] Importer les 3 CSV de contenu: catégories, produits, stocks.
- [ ] Importer le ZIP d’images et rattacher les médias aux produits.
- [ ] Afficher le résultat d’import par fichier avec succès / échec.
- [ ] Rejouer l’import de façon idempotente autant que possible.

Mapping attendu:
- `categories.csv` -> catégories
- `products.csv` -> produits
- `stocks.csv` -> stocks
- `images.zip` -> images produits

API à utiliser:
- `categories`
- `products`
- `stock_availables`
- `images`
- `attachments` si certains visuels ou pièces jointes doivent être liés aux produits
- `product_features`
- `product_feature_values`
- `specific_prices` si le CSV contient des promotions ou prix spéciaux
- `taxes` / `tax_rules` / `tax_rule_groups` si les tarifs doivent être recalculés depuis les taxes importées

## 3. Backoffice - Commandes et changement d’état

- [ ] Créer une page listant les commandes.
- [ ] Permettre la modification de l’état d’une commande.
- [ ] Gérer les 3 états demandés: échec paiement, paiement effectué, annulé.
- [ ] Enregistrer l’historique de changement d’état.

API à utiliser:
- `orders`
- `order_histories`
- `order_states`
- `order_details`
- `order_payments`
- `order_invoices`
- `order_slip`

## 4. FrontOffice - Accueil et fiche produit

- [ ] Créer la page d’accueil avec la liste des produits.
- [ ] Créer la fiche produit avec affichage du prix, de l’image et du stock.
- [ ] Gérer la navigation vers la fiche produit depuis la liste.
- [ ] Faire remonter les données importées dans le front sans duplication de logique.

API à utiliser:
- `products`
- `categories`
- `images`
- `stock_availables`
- `search`
- `specific_prices`
- `product_features`
- `product_feature_values`

## 5. FrontOffice - Panier et achat

- [ ] Créer la gestion de panier.
- [ ] Ajouter / retirer / modifier la quantité des articles.
- [ ] Calculer le total avec les données PrestaShop.
- [ ] Valider la commande.
- [ ] Garder uniquement le mode de paiement à la livraison.
- [ ] Supprimer tout frais de livraison visible ou calculé.

API à utiliser:
- `carts`
- `cart_rules`
- `carriers`
- `orders`
- `order_details`
- `order_carriers`
- `order_payments`
- `order_histories`
- `configurations`

## 6. FrontOffice - Mes commandes

- [ ] Créer la page “mes commandes”.
- [ ] Afficher l’état courant de chaque commande.
- [ ] Afficher le détail minimal utile pour relire l’historique.

API à utiliser:
- `orders`
- `order_histories`
- `order_states`
- `order_details`
- `order_invoices`
- `order_payments`

## 7. ExistingApp - Cohérence des données

- [ ] Vérifier que toutes les données importées sont visibles quelque part dans le backoffice PrestaShop.
- [ ] Vérifier qu’une modification dans PrestaShop se reflète dans New App après rafraîchissement.
- [ ] Prévoir un point de synchronisation ou un rechargement des données après action métier.
- [ ] Documenter les dépendances entre produits, catégories, stocks et images.

API à surveiller en priorité:
- `products`
- `categories`
- `stock_availables`
- `images`
- `orders`
- `customers`
- `addresses`

## 8. Critères de validation

- [ ] Le backoffice est inaccessible sans authentification locale.
- [ ] La page de reset fonctionne seule.
- [ ] La page d’import traite les 4 fichiers attendus.
- [ ] La liste des commandes permet de changer l’état.
- [ ] Le front affiche les produits importés et leur fiche.
- [ ] Le parcours panier -> commande fonctionne avec paiement à la livraison uniquement.
- [ ] La page “mes commandes” affiche le bon statut.

## Ordre de réalisation conseillé

1. Sécurité et routes backoffice.
2. Reset.
3. Import CSV + ZIP images.
4. Liste des commandes et changement d’état.
5. Accueil frontoffice et fiche produit.
6. Panier, checkout, paiement à la livraison.
7. Page “mes commandes”.
8. Vérification de cohérence avec l’ExistingApp.