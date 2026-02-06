# RAPPORT WORKFLOW COMPLET - GESTION DE PRODUCTION BATTERIES

## Vue d'ensemble du système

Ce document décrit le workflow complet de gestion de production des batteries reconditionnées, depuis la création en usine jusqu'à la gestion ERP.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE GLOBALE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   [1] UI PRODUCTION (Raspberry Pi)                                              │
│        │                                                                         │
│        │  printed_serials.csv                                                   │
│        │  sav_batteries.csv                                                     │
│        │                                                                         │
│        ▼  CRON 19h00 quotidien                                                  │
│   [2] SCRIPT SYNC (sync_to_mongo.py)                                            │
│        │                                                                         │
│        │  MongoDB Atlas                                                         │
│        │                                                                         │
│        ▼                                                                         │
│   [3] ERP (Node.js/Vue.js)                                                      │
│        │                                                                         │
│        └─► CRON  : Déduction stock automatique                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 1 : UI DE PRODUCTION (Raspberry Pi + Scanette)

### 1.1 Description générale

L'interface de production tourne sur un **Raspberry Pi** équipé d'une **scanette** (pas de clavier/souris). Elle gère tout le cycle de vie de la batterie en usine via des commandes scannées.

**Fichiers principaux :**

- `ui.py` - Interface graphique principale (Tkinter)
- `printer.py` - Service d'impression (écoute MQTT)
- `src/ui/scan_manager.py` - Machine à états pour les commandes
- `src/labels/csv_serial_manager.py` - Gestion des CSV
- `src/labels/label_templates.py` - Templates ZPL des étiquettes

### 1.2 Types de batteries (A, B, C, D, E)

Les lettres représentent le **type de batterie source** (usagée) utilisée pour fabriquer les batteries reconditionnées :

| Type | Capacités possibles              | Usage         |
| ---- | -------------------------------- | ------------- |
| A    | 13 kWh (271Ah) ou 12 kWh (250Ah) | Source type A |
| B    | 13 kWh (271Ah) ou 12 kWh (250Ah) | Source type B |
| C    | 13 kWh (271Ah) ou 12 kWh (250Ah) | Source type C |
| D    | 8.6 kWh (179Ah) uniquement       | Source type D |
| E    | 8.6 kWh (179Ah) uniquement       | Source type E |

**Important :** Chaque type a une **BOM différente** côté ERP car les pièces nécessaires varient selon la source.

---

### 1.3 Cycle de vie complet d'une batterie (côté Production)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CYCLE DE VIE - UI PRODUCTION                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ÉTAPE 1: CRÉATION                                                              │
│  ════════════════                                                               │
│  Commande: "create <A|B|C|D|E>"                                                 │
│                                                                                  │
│  Actions:                                                                        │
│  ├─► Génère numéro séquentiel (0000-9999)                                       │
│  ├─► Crée serial temporaire: "RW-48vXXX0210" (XXX = capacité inconnue)          │
│  ├─► Génère CodeAleatoireQR (6 caractères)                                      │
│  ├─► Écrit dans CSV: TimestampImpression, NumeroSerie, CodeAleatoireQR, type    │
│  └─► Imprime étiquette V1 (interne à la batterie)                               │
│                                                                                  │
│  CSV ÉCRIT:                                                                      │
│  ┌────────────────────┬─────────────────┬───────────────┬──────┬─────────┐      │
│  │TimestampImpression │ NumeroSerie     │CodeAleatoireQR│ type │ version │      │
│  ├────────────────────┼─────────────────┼───────────────┼──────┼─────────┤      │
│  │2025-01-21T10:30:00 │ RW-48vXXX0210   │ LlC2dn        │ B    │ 1.0.5.1 │      │
│  └────────────────────┴─────────────────┴───────────────┴──────┴─────────┘      │
│                                                                                  │
│                              ▼                                                   │
│                                                                                  │
│  ÉTAPE 2: TEST PHYSIQUE                                                         │
│  ══════════════════════                                                         │
│  (Hors système - test manuel de la batterie)                                    │
│                                                                                  │
│                              ▼                                                   │
│                                                                                  │
│  ÉTAPE 3: VALIDATION (FINISH)                                                   │
│  ════════════════════════════                                                   │
│  Commande: "finish <13|12|8.6>"                                                 │
│  Puis: Scan du QR interne (V1)                                                  │
│  Puis: Confirmation "finish <13|12|8.6>"                                        │
│                                                                                  │
│  Validations:                                                                    │
│  ├─► Vérifie compatibilité type/capacité (A,B,C→13,12 | D,E→8.6)               │
│  └─► Rejette si incompatible                                                    │
│                                                                                  │
│  Actions:                                                                        │
│  ├─► Remplace XXX par capacité réelle (271, 250, ou 179)                        │
│  ├─► Serial final: "RW-48v2710210"                                              │
│  ├─► Écrit TimestampTestDone                                                    │
│  └─► Imprime étiquettes Main + Shipping (ou 3 si downgrade détecté)             │
│                                                                                  │
│  CSV MIS À JOUR:                                                                 │
│  ┌─────────────────┬─────────────────────┐                                      │
│  │ NumeroSerie     │ RW-48v2710210       │ (XXX → 271)                          │
│  │ TimestampTestDone│ 2025-01-21T14:00:00│                                      │
│  └─────────────────┴─────────────────────┘                                      │
│                                                                                  │
│                              ▼                                                   │
│                                                                                  │
│  ÉTAPE 4: EXPÉDITION                                                            │
│  ═══════════════════                                                            │
│  Commande: "expedition"                                                         │
│  Puis: Scan des serials à expédier (multiples possibles)                        │
│  Puis: Confirmation "expedition"                                                │
│                                                                                  │
│  Validations:                                                                    │
│  ├─► Batterie doit être testée (pas de XXX)                                     │
│  ├─► Détecte si batterie en SAV → traitement spécial                            │
│  └─► Pas de doublons                                                            │
│                                                                                  │
│  Actions:                                                                        │
│  ├─► Écrit TimestampExpedition                                                  │
│  ├─► Si SAV: met sav_status = "False", update TimestampDepart dans sav_csv      │
│  └─► Envoie email récapitulatif                                                 │
│                                                                                  │
│  CSV MIS À JOUR:                                                                 │
│  ┌─────────────────────┬─────────────────────┐                                  │
│  │ TimestampExpedition │ 2025-01-22T09:00:00 │                                  │
│  │ sav_status          │ False               │ (si était en SAV)                │
│  └─────────────────────┴─────────────────────┘                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.4 Gestion SAV (côté Production)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW SAV - UI PRODUCTION                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ENTRÉE SAV                                                                     │
│  ══════════                                                                     │
│  Commande: "sav"                                                                │
│  Puis: Scan du serial de la batterie retournée                                  │
│                                                                                  │
│  Actions:                                                                        │
│  ├─► Vérifie que le serial existe dans printed_serials.csv                      │
│  ├─► Crée entrée dans sav_batteries.csv (TimestampArrivee, NumeroSerie)         │
│  └─► Met sav_status = "True" dans printed_serials.csv                           │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐            │
│  │ sav_batteries.csv                                               │            │
│  ├─────────────────────┬─────────────────┬───────────────────────┤            │
│  │ TimestampArrivee    │ NumeroSerie     │ TimestampDepart       │            │
│  ├─────────────────────┼─────────────────┼───────────────────────┤            │
│  │ 2025-01-20T10:00:00 │ RW-48v2710127   │ (vide = encore en SAV)│            │
│  └─────────────────────┴─────────────────┴───────────────────────┘            │
│                                                                                  │
│  SORTIE SAV                                                                     │
│  ══════════                                                                     │
│  Via commande "expedition" (détection automatique)                              │
│                                                                                  │
│  Actions:                                                                        │
│  ├─► Détecte sav_status = "True"                                                │
│  ├─► Met sav_status = "False" dans printed_serials.csv                          │
│  └─► Écrit TimestampDepart dans sav_batteries.csv                               │
│                                                                                  │
│  ⚠️  NOTE IMPORTANTE:                                                           │
│  L'UI Production contrôle le statut SAV RÉEL (true/false).                      │
│  L'ERP gère les DÉTAILS (motif, pièces, statut intermédiaire).                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.5 Commandes disponibles (UI Production)

| Commande               | Description             | Données écrites                                                        |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------- |
| `create <A-E>`         | Créer nouvelle batterie | TimestampImpression, NumeroSerie (XXX), CodeAleatoireQR, type, version |
| `finish <13\|12\|8.6>` | Valider après test      | NumeroSerie (capacité réelle), TimestampTestDone                       |
| `expedition`           | Expédier batterie(s)    | TimestampExpedition, sav_status (si SAV)                               |
| `sav`                  | Entrée SAV              | sav_status=True, entrée sav_batteries.csv                              |
| `reprint`              | Réimprimer étiquettes   | (aucune donnée modifiée)                                               |
| `new qr`               | Générer QR personnalisé | (aucune donnée modifiée)                                               |

---

### 1.6 Structure des fichiers CSV (Production)

#### printed_serials.csv

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CHAMP               │ TYPE          │ ÉCRIT PAR      │ DESCRIPTION              │
├─────────────────────┼───────────────┼────────────────┼──────────────────────────┤
│ TimestampImpression │ ISO DateTime  │ create         │ Date/heure création      │
│ NumeroSerie         │ String        │ create/finish  │ Serial (XXX puis réel)   │
│ CodeAleatoireQR     │ String (6ch)  │ create         │ Code QR unique           │
│ TimestampTestDone   │ ISO DateTime  │ finish         │ Date/heure validation    │
│ TimestampExpedition │ ISO DateTime  │ expedition     │ Date/heure expédition    │
│ type                │ Char (A-E)    │ create         │ Type batterie source     │
│ version             │ String        │ create         │ Version logiciel         │
│ sav_status          │ "True"/"False"│ sav/expedition │ En SAV actuellement ?    │
│ score               │ Float         │ script externe │ Score qualité (optionnel)│
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### sav_batteries.csv

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CHAMP               │ TYPE          │ ÉCRIT PAR      │ DESCRIPTION              │
├─────────────────────┼───────────────┼────────────────┼──────────────────────────┤
│ TimestampArrivee    │ ISO DateTime  │ sav            │ Entrée en SAV            │
│ NumeroSerie         │ String        │ sav            │ Batterie concernée       │
│ TimestampDepart     │ ISO DateTime  │ expedition     │ Sortie SAV (vide si en cours)│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.7 Étiquettes imprimées

| Étiquette             | Moment     | Contenu principal                            |
| --------------------- | ---------- | -------------------------------------------- |
| **V1 (Interne)**      | Création   | Serial temporaire, version, date fabrication |
| **Main (Produit)**    | Validation | Serial final, capacité, specs, QR passport   |
| **Shipping (Carton)** | Validation | Serial, specs, instructions transport        |

---

## PARTIE 2 : SCRIPT DE SYNCHRONISATION

### 2.1 Description

**Fichier :** `2_script_sync/sync_to_mongo.py`

**Exécution :** CRON sur le Raspberry Pi, **tous les jours à 19h00**

**Fonction :** Synchronise les données CSV de production vers MongoDB Atlas

### 2.2 Flux de synchronisation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SYNC CSV → MONGODB (19h00 quotidien)                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [Raspberry Pi]                              [MongoDB Atlas]                     │
│                                                                                  │
│  printed_serials.csv ─────┐                                                     │
│                           │                                                      │
│  sav_batteries.csv ───────┼──► sync_to_mongo.py ──► Collection: printed_serial  │
│                           │                                                      │
│                           │    Transformations:                                  │
│                           │    ├─► sav_status: "True"/"False" → boolean         │
│                           │    ├─► Gestion XXX → capacité réelle                │
│                           │    ├─► Construction sav_history[]                   │
│                           │    └─► Initialisation stock_deducted=false          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Transformations appliquées

| Transformation               | Détail                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| **Anti-duplication serial**  | Si serial avec XXX existe, le remplace par la version avec capacité réelle |
| **Conversion sav_status**    | String "True"/"False" → Boolean true/false                                 |
| **Construction sav_history** | Fusionne les entrées de sav_batteries.csv en tableau d'historique          |
| **Initialisation stock**     | `stock_deducted: false` pour les nouvelles batteries uniquement            |

### 2.4 Champs écrits dans MongoDB

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CHAMP MONGODB       │ SOURCE            │ TRANSFORMATION                        │
├─────────────────────┼───────────────────┼───────────────────────────────────────┤
│ NumeroSerie         │ CSV               │ Gestion XXX → réel                    │
│ CodeAleatoireQR     │ CSV               │ Copie directe                         │
│ TimestampImpression │ CSV               │ Copie directe                         │
│ TimestampTestDone   │ CSV               │ Copie ou null si vide                 │
│ TimestampExpedition │ CSV               │ Copie ou null si vide                 │
│ type                │ CSV               │ Copie directe                         │
│ version             │ CSV               │ Copie directe                         │
│ sav_status          │ CSV               │ String → Boolean                      │
│ score               │ CSV               │ Copie directe                         │
│ sav_history         │ sav_batteries.csv │ Construction tableau                  │
│ stock_deducted      │ (initialisé)      │ false sur INSERT uniquement           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 3 : ERP (Node.js/Vue.js)

### 3.1 Description

L'ERP est une application web complète permettant la gestion des batteries, du stock de pièces détachées, et des BOM (nomenclatures).

**Stack technique :**

- Backend : Node.js + Express + MongoDB
- Frontend : Vue.js

### 3.1.1 Système d'authentification et autorisations

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SYSTÈME DE RÔLES ET SCOPES                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  RÔLES UTILISATEUR:                                                             │
│  ══════════════════                                                             │
│  • user              - Utilisateur standard (production/lecture)                │
│  • moderator         - Modérateur (stocks/BOM)                                  │
│  • superadmin        - Super administrateur (tous accès)                        │
│  • external_provider - Prestataire externe (accès limité API)                   │
│                                                                                  │
│  SCOPES D'ACCÈS:                                                                │
│  ═══════════════                                                                │
│  • ERP_USER  - Accès complet à l'ERP (routes /api/*)                           │
│  • PROVIDER  - Accès limité aux routes prestataires (/api/provider/*)          │
│                                                                                  │
│  ATTRIBUTION AUTOMATIQUE:                                                       │
│  ┌─────────────────────┬────────────────┐                                      │
│  │ Rôle                │ Scopes         │                                      │
│  ├─────────────────────┼────────────────┤                                      │
│  │ user                │ [ERP_USER]     │                                      │
│  │ moderator           │ [ERP_USER]     │                                      │
│  │ superadmin          │ [ERP_USER]     │                                      │
│  │ external_provider   │ [PROVIDER]     │                                      │
│  └─────────────────────┴────────────────┘                                      │
│                                                                                  │
│  PROTECTION DES ROUTES:                                                         │
│  ══════════════════════                                                         │
│  • /api/auth/*       → Publique (avec rate limiting)                           │
│  • /api/batteries/*  → verifyToken + authorizeScope("ERP_USER")                │
│  • /api/spare-parts/*→ verifyToken + authorizeScope("ERP_USER")                │
│  • /api/stocks/*     → verifyToken + authorizeScope("ERP_USER")                │
│  • /api/locations/*  → verifyToken + authorizeScope("ERP_USER")                │
│  • /api/bom/*        → verifyToken + authorizeScope("ERP_USER")                │
│  • /api/sav/*        → verifyToken + authorizeScope("ERP_USER")                │
│  • /api/provider/*   → verifyToken + authorizeScope("PROVIDER")                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1.2 Prestataires externes (external_provider)

Les prestataires externes sont des utilisateurs ayant un accès limité au système. Ils ne peuvent pas accéder à l'ERP mais disposent de routes API dédiées pour :

- **Consulter les batteries expédiées** (filtrage par `TimestampExpedition` non null)
- **Modifier la version des batteries** (avec validation du format et historique)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ROUTES PRESTATAIRES (/api/provider)                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  GET  /api/provider/batteries                                                   │
│       → Liste des batteries expédiées (TimestampExpedition ≠ null)              │
│       → Champs retournés : NumeroSerie, TimestampExpedition, sav_history,       │
│                            sav_status, version, isWarrantyRevoked,              │
│                            version_history                                       │
│                                                                                  │
│  GET  /api/provider/batteries/:id                                               │
│       → Détails d'une batterie par NumeroSerie (si expédiée)                    │
│       → Mêmes champs que la liste                                               │
│                                                                                  │
│  PATCH /api/provider/batteries/:id/version                                      │
│       → Mise à jour de la version d'une batterie expédiée                       │
│       → Body: { version: "1.2.3", reason: "Mise à jour firmware" }              │
│       → Validation format version : uniquement chiffres et points               │
│         (regex: /^\d+(\.\d+)*$/)                                                │
│       → Exemples valides : "1.03", "1.3.22.1", "2.0"                            │
│       → Historique conservé dans version_history[]                              │
│                                                                                  │
│  SÉCURITÉ:                                                                      │
│  ─────────                                                                      │
│  • Toutes les routes requièrent : verifyToken + authorizeScope("PROVIDER")      │
│  • Les prestataires ne peuvent voir QUE les batteries expédiées                 │
│  • Les prestataires ne peuvent modifier QUE les batteries expédiées             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Données en LECTURE SEULE (venant de la Production)

Ces champs sont synchronisés depuis le CSV et **NE PEUVENT PAS** être modifiés dans l'ERP :

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CHAMPS LECTURE SEULE (SOURCE: PRODUCTION)                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  • NumeroSerie          - Serial unique de la batterie                          │
│  • CodeAleatoireQR      - Code QR pour le passport                              │
│  • TimestampImpression  - Date de création                                      │
│  • TimestampTestDone    - Date de validation/test                               │
│  • TimestampExpedition  - Date d'expédition                                     │
│  • type                 - Type de batterie source (A-E)                         │
│  • score                - Score qualité                                         │
│  • sav_status           - Statut SAV réel (contrôlé par UI Prod)               │
│  • sav_history[].date_arrivee  - Dates entrées SAV                             │
│  • sav_history[].date_depart   - Dates sorties SAV                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Données ÉDITABLES dans l'ERP

Ces champs sont gérés uniquement côté ERP :

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CHAMPS ÉDITABLES (ERP UNIQUEMENT)                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  BATTERIE:                                                                       │
│  ─────────                                                                       │
│  • version              - Version logiciel (modifiable via ERP avec historique)│
│  • version_history[]    - Historique des modifications de version              │
│  • commentary           - Notes/commentaires libres                             │
│  • isCanceled           - Marquer comme annulée/rebut                           │
│  • isWarrantyRevoked    - Révoquer la garantie (ouverture client, etc.)        │
│  • sav_history[].motif  - Raison de l'intervention SAV                          │
│  • sav_history[].status - Statut intermédiaire ("en cours" / "réparée")        │
│  • sav_history[].parts_used - Pièces utilisées [{sku, qty}]                    │
│                                                                                  │
│  SYSTÈME:                                                                        │
│  ────────                                                                        │
│  • stock_deducted       - Flag déduction stock (auto par CRON prévu)           │
│  • status               - Calculé depuis timestamps                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Calcul du statut batterie (ERP)

Le statut est **calculé automatiquement** basé sur les timestamps :

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CALCUL DU STATUT BATTERIE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Condition                                      │ Statut affiché                │
│  ───────────────────────────────────────────────┼───────────────────────────────│
│  sav_status = true                              │ "En SAV"                      │
│  isCanceled = true                              │ "Annulée"                     │
│  TimestampExpedition existe                     │ "Expédiée"                    │
│  TimestampTestDone existe (pas d'expédition)    │ "En stock" (testée, prête)    │
│  Seulement TimestampImpression                  │ "En production"               │
│                                                                                  │
│  Priorité: SAV > Annulée > Expédiée > En stock > En production                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4.1 Révocation de garantie (ERP)

La révocation de garantie est une fonctionnalité **indépendante du statut** de la batterie.
Elle permet de marquer une batterie comme n'ayant plus droit à la garantie constructeur.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         RÉVOCATION DE GARANTIE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP: isWarrantyRevoked (Boolean, défaut: false)                             │
│                                                                                  │
│  CAS D'USAGE:                                                                   │
│  ─────────────                                                                  │
│  • Ouverture non autorisée par le client                                       │
│  • Mauvaise utilisation avérée                                                 │
│  • Modification du produit par un tiers                                        │
│  • Conditions de garantie non respectées                                       │
│                                                                                  │
│  COMPORTEMENT:                                                                  │
│  ─────────────                                                                  │
│  • Si isWarrantyRevoked = true :                                               │
│    → Affiche "RÉVOQUÉE" en rouge à la place de la date de fin de garantie     │
│    → La batterie n'est plus éligible au SAV sous garantie                     │
│                                                                                  │
│  • Si isWarrantyRevoked = false :                                              │
│    → Affichage normal de la date de fin de garantie                           │
│                                                                                  │
│  PERMISSIONS:                                                                   │
│  ────────────                                                                   │
│  • Action réservée aux administrateurs (authStore.isAdmin)                     │
│  • Réversible : possibilité de rétablir la garantie                           │
│                                                                                  │
│  API:                                                                           │
│  ────                                                                           │
│  POST /api/batteries/battery/:serial/warranty-revocation                        │
│  Body: { isRevoked: true|false }                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4.2 Modification de version (ERP + Prestataires)

La version d'une batterie peut être modifiée depuis l'ERP ou par un prestataire externe, avec conservation de l'historique complet des changements.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MODIFICATION DE VERSION                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMPS:                                                                        │
│  ───────                                                                        │
│  • version (String) - Version actuelle de la batterie                          │
│  • version_history[] - Historique des modifications                            │
│    ├─ previous_version: Version avant modification                             │
│    ├─ new_version: Nouvelle version appliquée                                  │
│    ├─ date: Date de la modification                                            │
│    ├─ updated_by: Utilisateur ayant fait la modification (ref User)            │
│    └─ reason: Motif du changement                                              │
│                                                                                  │
│  CAS D'USAGE:                                                                   │
│  ─────────────                                                                  │
│  • Correction d'une version mal renseignée à la production                     │
│  • Mise à jour après intervention technique (prestataire)                      │
│  • Alignement avec une nouvelle nomenclature                                   │
│                                                                                  │
│  COMPORTEMENT:                                                                  │
│  ─────────────                                                                  │
│  • Chaque modification archive l'ancienne version dans version_history         │
│  • L'historique est affiché dans la fiche batterie (ordre antéchronologique)   │
│  • La version actuelle reste affichée en évidence                              │
│  • Si aucune version initiale, "N/A" est enregistré comme previous_version     │
│                                                                                  │
│  API:                                                                           │
│  ────                                                                           │
│  ERP:       POST  /api/batteries/battery/:serial/version                        │
│  Provider:  PATCH /api/provider/batteries/:serial/version                       │
│  Body: { version: "1.2.3", reason: "Correction après diagnostic" }             │
│                                                                                  │
│  VALIDATIONS:                                                                   │
│  ────────────                                                                   │
│  • version est requis                                                           │
│  • La nouvelle version doit être différente de l'actuelle                      │
│  • Format version (prestataire): uniquement chiffres et points                 │
│    → Regex: /^\d+(\.\d+)*$/                                                    │
│    → Exemples valides: "1.03", "1.3.22.1", "2.0"                               │
│  • Prestataires: uniquement batteries expédiées (TimestampExpedition ≠ null)   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Workflow SAV côté ERP

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            WORKFLOW SAV - ERP                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. RÉCEPTION (automatique via sync)                                            │
│     ════════════════════════════════                                            │
│     - sav_status = true (depuis CSV)                                            │
│     - sav_history[] contient {date_arrivee} (depuis sav_batteries.csv)          │
│                                                                                  │
│  2. DIAGNOSTIC & RÉPARATION (manuel dans ERP)                                   │
│     ══════════════════════════════════════════                                  │
│     L'opérateur peut ajouter :                                                  │
│     - motif : "Défaut BMS", "Cellule HS", etc.                                  │
│     - status : "en cours" → "réparée"                                           │
│     - parts_used : [{sku: "BMS-001", qty: 1}, ...]                              │
│                                                                                  │
│  3. SORTIE SAV (automatique via sync)                                           │
│     ═══════════════════════════════════                                         │
│     - Quand UI Prod fait "expedition" sur batterie SAV                          │
│     - sav_status revient à false                                                │
│     - date_depart est renseignée                                                │
│                                                                                  │
│  ⚠️  IMPORTANT:                                                                 │
│  Le statut "réparée" dans l'ERP est INTERMÉDIAIRE.                             │
│  Seule l'UI Production contrôle le statut SAV RÉEL via sav_status.             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Déduction automatique de stock (CRON prévu)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DÉDUCTION STOCK AUTOMATIQUE (en développement)               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Script: back/scripts/triggerProductionDeduction.js                             │
│  Exécution prévue: CRON quotidien côté Node.js                                  │
│                                                                                  │
│  PROCESSUS:                                                                      │
│  ══════════                                                                      │
│                                                                                  │
│  1. Recherche batteries avec:                                                    │
│     - stock_deducted = false                                                    │
│     - isCanceled = false                                                        │
│     - type existe (A, B, C, D, E)                                               │
│                                                                                  │
│  2. Pour chaque batterie trouvée:                                               │
│     ┌─────────────────────────────────────────────────────────────┐             │
│     │ a. Récupérer BOM active pour ce type                        │             │
│     │    (ex: BOM type "B" → liste des pièces nécessaires)        │             │
│     │                                                              │             │
│     │ b. Pour chaque pièce dans la BOM:                           │             │
│     │    - Créer mouvement stock négatif (sortie)                 │             │
│     │    - reason: "production"                                    │             │
│     │    - battery_serial: <serial de la batterie>                │             │
│     │    - Décrémenter SparePartStock.quantity                    │             │
│     │                                                              │             │
│     │ c. Marquer batterie: stock_deducted = true                  │             │
│     └─────────────────────────────────────────────────────────────┘             │
│                                                                                  │
│  3. Transaction: tout réussit ou tout annulé                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.7 Modèle de données ERP

#### Collection: printed_serial (Batteries)

```javascript
{
  _id: ObjectId,

  // ══════════════════════════════════════════════════════════════
  // DONNÉES PRODUCTION (lecture seule, venant du CSV)
  // ══════════════════════════════════════════════════════════════
  NumeroSerie: "RW-48v2710210",        // Unique
  CodeAleatoireQR: "LlC2dn",
  TimestampImpression: "2025-01-21T10:30:00",
  TimestampTestDone: "2025-01-21T14:00:00",
  TimestampExpedition: "2025-01-22T09:00:00",
  type: "B",                            // A, B, C, D, E
  version: "1.0.5.1",                   // Modifiable via ERP
  score: 103.2,                         // Optionnel, via script externe
  sav_status: false,                    // Contrôlé par UI Prod

  // ══════════════════════════════════════════════════════════════
  // DONNÉES ERP (éditables dans l'ERP)
  // ══════════════════════════════════════════════════════════════
  status: "En production",              // Calculé depuis timestamps
  commentary: "RAS",                    // Notes libres
  isCanceled: false,                    // Annulation
  isWarrantyRevoked: false,             // Révocation de garantie
  stock_deducted: true,                 // Flag déduction stock

  // Historique des modifications de version
  version_history: [
    {
      previous_version: "1.0.4.0",      // Version avant modification
      new_version: "1.0.5.1",           // Nouvelle version
      date: "2025-01-20T14:30:00",      // Date de modification
      updated_by: ObjectId("..."),       // Utilisateur (ref User)
      reason: "Correction après diagnostic"
    }
  ],

  // Historique SAV (mixte: dates=CSV, détails=ERP)
  sav_history: [
    {
      date_arrivee: "2025-02-10T10:00:00",   // CSV
      date_depart: "2025-02-15T14:00:00",    // CSV
      motif: "Défaut BMS",                   // ERP
      status: "réparée",                     // ERP
      parts_used: [                          // ERP
        { sku: "BMS-001", qty: 1 }
      ]
    }
  ]
}
```

#### Collection: boms (Nomenclatures)

```javascript
{
  _id: ObjectId,
  batteryType: "B",                     // A, B, C, D, E
  location: "REVAW",                    // Lieu de production
  version: "v1",
  warrantyDuration: 2,                  // Années de garantie
  isActive: true,

  items: [
    { sparePart: ObjectId("..."), quantity: 1 },  // BMS
    { sparePart: ObjectId("..."), quantity: 14 }, // Cellules
    { sparePart: ObjectId("..."), quantity: 1 },  // Câblage
    // ...
  ]
}
```

---

## PARTIE 4 : SYNTHÈSE - QUI ÉCRIT QUOI ?

### 4.1 Tableau récapitulatif complet

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MATRICE DE RESPONSABILITÉ DES DONNÉES                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP                  │ CRÉATION       │ MODIFICATION     │ SUPPRESSION       │
│  ═══════════════════════╪════════════════╪══════════════════╪═══════════════════│
│                                                                                  │
│  --- DONNÉES BATTERIE (identification) ---                                      │
│  NumeroSerie            │ UI Prod        │ UI Prod (finish) │ Jamais            │
│  CodeAleatoireQR        │ UI Prod        │ Jamais           │ Jamais            │
│  type                   │ UI Prod        │ Jamais           │ Jamais            │
│  version                │ UI Prod        │ ERP / Provider   │ Jamais            │
│  version_history        │ ERP / Provider │ ERP / Provider   │ Jamais            │
│                                                                                  │
│  --- TIMESTAMPS (cycle de vie) ---                                              │
│  TimestampImpression    │ UI Prod        │ Jamais           │ Jamais            │
│  TimestampTestDone      │ UI Prod        │ Jamais           │ Jamais            │
│  TimestampExpedition    │ UI Prod        │ Jamais           │ Jamais            │
│                                                                                  │
│  --- STATUT SAV ---                                                             │
│  sav_status             │ UI Prod        │ UI Prod          │ N/A (bool)        │
│  sav_history[].date_*   │ UI Prod        │ UI Prod          │ Jamais            │
│  sav_history[].motif    │ ERP            │ ERP              │ ERP               │
│  sav_history[].status   │ ERP            │ ERP              │ N/A               │
│  sav_history[].parts    │ ERP            │ ERP              │ ERP               │
│                                                                                  │
│  --- DONNÉES ERP UNIQUEMENT ---                                                 │
│  commentary             │ ERP            │ ERP              │ ERP               │
│  isCanceled             │ ERP            │ ERP              │ N/A (bool)        │
│  isWarrantyRevoked      │ ERP            │ ERP              │ N/A (bool)        │
│  status (affiché)       │ Auto (calculé) │ Auto (calculé)   │ N/A               │
│  stock_deducted         │ Sync (init)    │ CRON ERP         │ N/A (bool)        │
│                                                                                  │
│  --- SCORE ---                                                                  │
│  score                  │ Script externe │ Script externe   │ Jamais            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Flux de données simplifié

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FLUX DE DONNÉES GLOBAL                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                        ┌──────────────────┐                                     │
│                        │   UI PRODUCTION  │                                     │
│                        │  (Raspberry Pi)  │                                     │
│                        └────────┬─────────┘                                     │
│                                 │                                                │
│                    Écrit: Serial, Type, QR,                                     │
│                    Timestamps, sav_status                                       │
│                                 │                                                │
│                                 ▼                                                │
│                     ┌───────────────────────┐                                   │
│                     │   printed_serials.csv │                                   │
│                     │   sav_batteries.csv   │                                   │
│                     └───────────┬───────────┘                                   │
│                                 │                                                │
│                        CRON 19h00 quotidien                                     │
│                                 │                                                │
│                                 ▼                                                │
│                     ┌───────────────────────┐                                   │
│                     │    SCRIPT SYNC        │                                   │
│                     │  sync_to_mongo.py     │                                   │
│                     └───────────┬───────────┘                                   │
│                                 │                                                │
│                    Transforme: sav_status→bool,                                 │
│                    Construit: sav_history[],                                    │
│                    Init: stock_deducted=false                                   │
│                                 │                                                │
│                                 ▼                                                │
│                     ┌───────────────────────┐                                   │
│                     │    MONGODB ATLAS      │                                   │
│                     │  printed_serial       │                                   │
│                     └───────────┬───────────┘                                   │
│                                 │                                                │
│              ┌──────────────────┼──────────────────┐                            │
│              │                  │                  │                            │
│              ▼                  ▼                  ▼                            │
│       ┌────────────┐    ┌────────────┐    ┌────────────┐                        │
│       │  ERP Vue   │    │ ERP CRON   │    │ ERP API    │                        │
│       │ (lecture)  │    │ (stock)    │    │ (édition)  │                        │
│       └────────────┘    └────────────┘    └────────────┘                        │
│              │                  │                  │                            │
│         Affiche:         Modifie:           Modifie:                            │
│         - Statut         - stock_deducted   - commentary                        │
│         - Historique     - SparePartStock   - isCanceled                        │
│         - Stats          - Movements        - isWarrantyRevoked                 │
│                                             - version + historique              │
│                                             - sav détails                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 5 : POINTS D'ATTENTION & RECOMMANDATIONS

### 5.1 Points critiques

| Point                      | Description                                | Impact                                                              |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| **Sync unidirectionnelle** | Données vont uniquement de Prod → ERP      | Modifications ERP (commentary, etc.) ne reviennent jamais vers Prod |
| **Délai sync**             | CRON à 19h = données visibles le lendemain | Pas de visibilité temps réel dans l'ERP                             |
| **sav_status autorité**    | UI Prod = source de vérité                 | ERP ne peut pas "forcer" une sortie SAV                             |
| **stock_deducted**         | CRON pas encore actif                      | Stock non déduit automatiquement actuellement                       |
| **Score**                  | Entrée via script externe                  | Pas intégré au workflow principal                                   |

### 5.2 Recommandations

1. **Documenter le script de score** - Comment est-il exécuté ? Quelle fréquence ?
2. **Activer le CRON de déduction stock** - Essentiel pour la gestion des pièces
3. **Considérer sync plus fréquente** - Si besoin de visibilité temps réel
4. **Backup CSV** - Les CSV sont la source de vérité, prévoir sauvegarde

---

## ANNEXE : Fichiers de référence

### UI Production (1_ui)

- `ui.py` - Interface principale
- `printer.py` - Service impression MQTT
- `src/ui/scan_manager.py` - Machine à états commandes
- `src/labels/csv_serial_manager.py` - Gestion CSV
- `src/labels/label_templates.py` - Templates ZPL

### Script Sync (2_script_sync)

- `sync_to_mongo.py` - Synchronisation CSV → MongoDB

### ERP (3_erp)

- `back/src/services/batteries.service.js` - Logique métier batteries
- `back/src/services/production.service.js` - Déduction stock
- `back/src/services/stock.service.js` - Mouvements stock
- `back/src/services/bom.service.js` - Gestion BOM
- `back/src/models/Battery.model.js` - Schéma batterie
- `back/src/models/BOM.model.js` - Schéma nomenclature
- `front/src/views/Batterie-views/` - Vues batteries
- `front/src/components/batteries/` - Composants batteries

---

_Document généré le 30/01/2026_
_Version 1.3 - Ajout système prestataires externes (scopes, routes /api/provider)_
