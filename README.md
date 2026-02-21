# 17b Map — Mapbox Integration

Plugin WordPress personnalisé pour intégrer des cartes **Mapbox GL JS** via un Custom Post Type, un bloc Gutenberg et un shortcode.

---

## Sommaire

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Créer une carte](#créer-une-carte)
5. [Intégrer une carte](#intégrer-une-carte)
6. [Référence des réglages](#référence-des-réglages)
   - [Général](#général)
   - [Marker principal](#marker-principal)
   - [Markers multiples](#markers-multiples)
   - [Options avancées](#options-avancées)
   - [Source CPT](#source-cpt)
7. [Layout listing + carte](#layout-listing--carte)
8. [Architecture technique](#architecture-technique)

---

## Prérequis

- WordPress 6.0+
- PHP 8.0+
- Un **Mapbox Access Token** (compte gratuit sur [mapbox.com](https://www.mapbox.com))

---

## Installation

1. Copier le dossier `17b-map` dans `wp-content/plugins/`
2. Activer le plugin depuis **Extensions → Extensions installées**
3. Renseigner le Mapbox Access Token (voir [Configuration](#configuration))

---

## Configuration

Aller dans **Cartes Mapbox → Réglages** et coller votre **Mapbox Access Token** (`pk_…` ou `sk_…`).

Ce token est nécessaire pour :
- Afficher les cartes en frontend et dans l'éditeur
- Utiliser la recherche d'adresse (geocoding) dans l'admin et en frontend
- Calculer des itinéraires en frontend

---

## Créer une carte

1. Aller dans **Cartes Mapbox → Ajouter une nouvelle**
2. Donner un titre à la carte (nom interne, non affiché en frontend)
3. Remplir les réglages dans la meta box **Paramètres de la carte**
4. Publier

---

## Intégrer une carte

### Bloc Gutenberg

Insérer le bloc **Carte Mapbox** (catégorie *Widgets*). Sélectionner la carte dans le menu déroulant. Une prévisualisation live s'affiche dans l'éditeur.

Le bloc supporte :
- Alignement large et pleine largeur
- Marges et paddings (via l'interface Gutenberg)
- Hauteur minimale (`min-height`)

### Shortcode

```
[mapbox_map id="42"]
```

Remplacer `42` par l'ID du post `mapbox_map` souhaité. Plusieurs shortcodes peuvent coexister sur la même page.

---

## Référence des réglages

### Général

| Champ | Description |
|---|---|
| **Latitude** | Latitude du centre de la carte (`-90` à `90`) |
| **Longitude** | Longitude du centre de la carte (`-180` à `180`) |
| **Zoom** | Niveau de zoom initial (`0` à `24`) |
| **Recherche d'adresse** | Geocoder admin pour remplir les coordonnées automatiquement (requiert le token) |

---

### Marker principal

Marker fixe affiché au centre de la carte.

| Champ | Description |
|---|---|
| **Activer** | Affiche/masque le marker central |
| **Titre** | Titre affiché dans la popup |
| **Texte** | Description affichée dans la popup (retours à la ligne conservés) |
| **Couleur** | Couleur du marker (color picker) |
| **URL de l'icône** | Remplace le marker par une image personnalisée (SVG ou raster, médiathèque) |
| **Taille de l'icône** | Taille en px de l'icône personnalisée (`16` à `128`, défaut `40`) |

---

### Markers multiples

Répéteur permettant d'ajouter autant de markers supplémentaires que nécessaire.

Chaque marker dispose de : **latitude**, **longitude**, **titre**, **texte** et **couleur** individuelle (hérite de la couleur du marker principal si laissée vide).

---

### Options avancées

| Option | Description |
|---|---|
| **Style Mapbox** | Choix parmi Streets, Outdoors, Satellite + rues, Light, Dark ou URL personnalisée (Mapbox Studio) |
| **Contrôles de navigation** | Affiche les boutons zoom et rotation sur la carte |
| **Clustering** | Regroupe les markers multiples et CPT en clusters circulaires. Clic sur un cluster → zoom. Clic sur un point individuel → popup |
| **Fit bounds** | Adapte automatiquement le zoom et le centre pour englober tous les markers |
| **Geocoder frontend** | Ajoute un champ de recherche d'adresse sur la carte en frontend. La sélection d'un résultat place un marker temporaire et active le bouton **Itinéraire** dans les popups CPT |

#### Itinéraire (Mapbox Directions)

Lorsque le geocoder frontend est actif, chaque popup de marker CPT affiche un bouton **📍 Itinéraire depuis mon adresse**. Après avoir recherché une adresse, le clic trace le trajet routier sur la carte avec la distance (km) et la durée estimée (min).

---

### Source CPT

Affiche sur la carte les posts d'un Custom Post Type existant qui possèdent des coordonnées géographiques en meta.

| Champ | Description |
|---|---|
| **Activer** | Active la source CPT |
| **Type de post** | Sélecteur parmi les post types publics enregistrés sur le site |
| **Meta key Latitude** | Sélecteur AJAX des meta keys existantes pour le post type choisi |
| **Meta key Longitude** | Idem pour la longitude |
| **Meta key Description** | Meta affichée dans la popup (optionnel — utilise l'extrait du post si vide) |
| **Image à la une** | Affiche la featured image dans la popup |
| **Meta key couleur** | Meta contenant une couleur hex `#rrggbb` par post pour personnaliser le marker |
| **Meta key icône** | Meta contenant une URL d'icône par post pour personnaliser l'apparence du marker |

> **Auto-détection des meta keys** : dès qu'un type de post est sélectionné, les sélecteurs de meta keys se peuplent automatiquement via AJAX avec les clés existantes en base. L'option *Saisir manuellement…* permet de renseigner une clé absente de la liste (ex. champ ACF non encore utilisé).

---

## Layout listing + carte

Activable via le toggle **Afficher la liste des fiches à côté de la carte** dans la section Source CPT (nécessite que la Source CPT soit activée).

Le bloc ou shortcode génère alors un layout **deux colonnes** :

```
┌─────────────────────┬────────────────────────────┐
│  Listing des fiches │                            │
│  ┌───────────────┐  │         Carte Mapbox        │
│  │ 📷  Titre     │  │                            │
│  │ [Localiser]   │  │                            │
│  │ [Voir la fiche│  │                            │
│  └───────────────┘  │                            │
│  ┌───────────────┐  │                            │
│  │ 📷  Titre     │  │                            │
│  │ ...           │  │                            │
└─────────────────────┴────────────────────────────┘
```

**Chaque card affiche :**
- Vignette 64×64 px (si une image à la une est configurée)
- Nom de la fiche
- Bouton **Localiser sur la carte** → centrage de la carte + popup identique à celle du marker
- Bouton **Voir la fiche** → lien vers le post CPT

**Responsive** : sous 640 px, les deux colonnes s'empilent verticalement (listing puis carte).

---

## Architecture technique

```
17b-map/
├── 17b-map.php                    # Point d'entrée, constantes, autoload
├── includes/
│   ├── class-wpmb-plugin.php      # Singleton principal, injection de dépendances, hooks
│   ├── class-wpmb-cpt.php         # Enregistrement du CPT mapbox_map
│   ├── class-wpmb-assets.php      # Enqueue scripts/styles, construction des configs JS
│   ├── class-wpmb-options.php     # Page de réglages (Access Token)
│   └── class-wpmb-blocks.php      # Enregistrement du bloc Gutenberg
├── admin/
│   ├── class-wpmb-admin.php       # Controller admin (save_post, AJAX meta keys)
│   └── class-wpmb-meta-boxes.php  # Rendu et sauvegarde de la meta box
├── public/
│   ├── class-wpmb-frontend.php    # Shortcode + rendu du layout listing
│   ├── js/
│   │   ├── blocks.js              # Bloc Gutenberg (edit)
│   │   ├── editor-preview.js      # Prévisualisation Mapbox dans l'éditeur
│   │   ├── admin.js               # Accordéon, geocoder admin, AJAX meta keys
│   │   └── public.js              # Init cartes, markers, clustering, geocoder, listing
│   └── css/
│       ├── admin.css              # Styles de la meta box
│       └── public.css             # Styles frontend (carte, popups, layout listing, cards)
```

### Flux de données

```
PHP (metas) → WPMB_Assets::build_map_config()
           → wp_localize_script('wpmbMapsConfig')
           → public.js (init Mapbox GL, markers, interactions)
```

### Sécurité

- Toutes les données POST sont sanitisées (`sanitize_text_field`, `sanitize_key`, `esc_url_raw`, `sanitize_hex_color`, `absint`, `filter_var FLOAT`)
- Toutes les sorties PHP sont échappées (`esc_attr`, `esc_html`, `esc_url`, `wp_kses_post`)
- Sauvegarde protégée par nonce (`wpmb_save_map_meta`) et vérification de capacité (`edit_post`)
- Endpoint AJAX protégé par nonce (`wpmb_admin_nonce`) et capacité (`edit_posts`)
- Les assets Mapbox ne sont chargés qu'en présence d'un bloc ou shortcode `mapbox_map` sur la page courante (lazy loading)
