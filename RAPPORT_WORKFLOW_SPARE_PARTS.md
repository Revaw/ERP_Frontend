# RAPPORT WORKFLOW COMPLET - GESTION DES PIÈCES DÉTACHÉES (SPARE PARTS)

## Vue d'ensemble du système

Ce document décrit le workflow complet de gestion des pièces détachées, depuis le catalogue jusqu'à la déduction automatique de stock lors de la production ou du SAV.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE SPARE PARTS                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │   CATALOGUE     │  Référentiel des pièces (SKU, nom, fournisseur)           │
│   │   SparePart     │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                     │
│            │  Référencé par                                                      │
│            ▼                                                                     │
│   ┌─────────────────┐         ┌─────────────────┐                               │
│   │      BOM        │◄────────│   Location      │                               │
│   │ (Nomenclature)  │         │  (Entrepôts)    │                               │
│   └────────┬────────┘         └────────┬────────┘                               │
│            │                           │                                         │
│            │  Définit les besoins      │  Organise le stock                     │
│            │  par type de batterie     │  par emplacement                       │
│            ▼                           ▼                                         │
│   ┌─────────────────────────────────────────────┐                               │
│   │            SparePartStock                    │                               │
│   │      (Stock par SKU + Location)             │                               │
│   └────────────────────┬────────────────────────┘                               │
│                        │                                                         │
│                        │  Modifié UNIQUEMENT via                                │
│                        ▼                                                         │
│   ┌─────────────────────────────────────────────┐                               │
│   │         SparePartMovement                    │                               │
│   │    (Journal d'audit immuable)               │                               │
│   │                                              │                               │
│   │  Sources:                                    │                               │
│   │  ├─► Manuel (ERP)                           │                               │
│   │  ├─► Inventaire (ajustement)                │                               │
│   │  ├─► Production (CRON automatique)          │                               │
│   │  └─► SAV (intervention technique)           │                               │
│   └─────────────────────────────────────────────┘                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 1 : CATALOGUE DES PIÈCES (SparePart)

### 1.1 Description

Le catalogue des pièces est le **référentiel maître** de toutes les pièces disponibles dans le système. Chaque pièce est identifiée de manière unique par son **SKU** (Stock Keeping Unit).

### 1.2 Structure de données

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MODÈLE SparePart                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP           │ TYPE        │ REQUIS │ DÉFAUT    │ DESCRIPTION               │
│  ════════════════╪═════════════╪════════╪═══════════╪═══════════════════════════│
│  sku             │ String      │ Oui    │ -         │ Identifiant unique        │
│  name            │ String      │ Oui    │ -         │ Nom/description pièce     │
│  supplier        │ String      │ Non    │ -         │ Nom du fournisseur        │
│  supplier_url    │ String      │ Non    │ -         │ URL site fournisseur      │
│  unit            │ String      │ Non    │ "piece"   │ Unité de mesure           │
│  active          │ Boolean     │ Non    │ true      │ Pièce active (soft-delete)│
│  delivery_delay  │ Number      │ Non    │ 0         │ Délai livraison (jours)   │
│  createdAt       │ Date        │ Auto   │ now()     │ Date création             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Contraintes et règles

| Règle | Description |
|-------|-------------|
| **SKU unique** | Deux pièces ne peuvent pas avoir le même SKU |
| **Format SKU** | Lettres, chiffres et tirets uniquement (regex: `^[a-zA-Z0-9-]+$`) |
| **Soft-delete** | La suppression met `active: false` au lieu de supprimer |
| **Blocage si stock** | Impossible de désactiver une pièce ayant du stock positif (tous lieux confondus) |
| **Blocage si BOM** | Impossible de désactiver une pièce utilisée dans une BOM active |
| **Pas de cascade** | Supprimer une pièce n'affecte pas le stock existant |

### 1.4 Exemples de SKU

| SKU | Nom | Unité | Fournisseur |
|-----|-----|-------|-------------|
| `BMS-001` | Battery Management System v2 | piece | Supplier A |
| `CELL-18650` | Cellule Li-Ion 18650 3.7V | piece | Supplier B |
| `CABLE-MAIN` | Câblage principal 48V | piece | Supplier C |
| `FUSE-50A` | Fusible 50A | piece | Supplier A |

### 1.5 API Catalogue

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ENDPOINTS CATALOGUE                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  GET    /api/spare-parts              Liste toutes les pièces actives           │
│  GET    /api/spare-parts/inactive     Liste pièces inactives (archives)         │
│  GET    /api/spare-parts/:sku         Récupère une pièce par SKU                │
│  POST   /api/spare-parts              Crée une nouvelle pièce                   │
│  PUT    /api/spare-parts/:sku         Met à jour une pièce                      │
│  DELETE /api/spare-parts/:sku         Désactive une pièce (soft-delete)         │
│  PATCH  /api/spare-parts/:sku/reactivate   Réactive une pièce désactivée        │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  DELETE /api/spare-parts/:sku - Désactivation                                       │
│  ─────────────────────────────────────────                                      │
│  Désactive une pièce (soft-delete: active = false)                              │
│                                                                                  │
│  Bloqué si:                                                                     │
│  • La pièce a du stock positif (quelque soit le lieu) → Erreur 409             │
│  • La pièce est utilisée dans une BOM active → Erreur 409                      │
│                                                                                  │
│  Messages d'erreur:                                                             │
│  • "Impossible de supprimer : Cette pièce a encore du stock positif."          │
│  • "Impossible de supprimer : Cette pièce est utilisée dans une BOM active."   │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  GET /api/spare-parts/inactive - Liste des pièces inactives                         │
│  ───────────────────────────────────────────────────────                        │
│  Récupère toutes les pièces désactivées (archives/corbeille)                    │
│                                                                                  │
│  Réponse:                                                                       │
│  • Liste triée par date de modification (plus récent en premier)               │
│  • Contient SKU, nom, et autres infos de la pièce                              │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  PATCH /api/spare-parts/:sku/reactivate - Réactivation                              │
│  ─────────────────────────────────────────────────────                          │
│  Réactive une pièce précédemment désactivée (active = true)                     │
│                                                                                  │
│  Réponse succès:                                                                │
│  • { success: true, data: <pièce réactivée> }                                  │
│                                                                                  │
│  Erreur 404:                                                                    │
│  • "Pièce détachée introuvable" si le SKU n'existe pas                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 2 : LOCALISATIONS (Location)

### 2.1 Description

Les localisations représentent les **entrepôts ou sites de production** où les pièces sont stockées. Le stock est toujours géré **par pièce ET par localisation**.

### 2.2 Structure de données

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MODÈLE Location                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP           │ TYPE        │ REQUIS │ DÉFAUT    │ DESCRIPTION               │
│  ════════════════╪═════════════╪════════╪═══════════╪═══════════════════════════│
│  code            │ String      │ Oui    │ -         │ Code court (UPPERCASE)    │
│  name            │ String      │ Oui    │ -         │ Nom complet               │
│  active          │ Boolean     │ Non    │ true      │ Localisation active       │
│  createdAt       │ Date        │ Auto   │ now()     │ Date création             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Format et contraintes

| Règle | Description | Exemple |
|-------|-------------|---------|
| **Code UPPERCASE** | Toujours en majuscules | `REVAW`, `WAREHOUSE-01` |
| **Code unique** | Pas de doublons | - |
| **Nom unique** | Pas de doublons | - |

### 2.4 Relation avec les autres entités

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    LOCATION - RELATIONS                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Location                                                                        │
│     │                                                                            │
│     ├──► BOM.location          Une BOM est liée à UNE localisation              │
│     │                          (déduction stock sur ce site)                    │
│     │                                                                            │
│     └──► SparePartStock.location   Le stock est géré PAR localisation           │
│                                    (même pièce = stocks différents/site)        │
│                                                                                  │
│  Exemple:                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐             │
│  │ Pièce BMS-001:                                                 │             │
│  │   • Stock REVAW: 50 unités                                     │             │
│  │   • Stock WAREHOUSE-01: 120 unités                             │             │
│  │   → Total global: 170 unités                                   │             │
│  └────────────────────────────────────────────────────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 3 : GESTION DU STOCK (SparePartStock)

### 3.1 Description

Le stock représente la **quantité actuelle** d'une pièce dans une localisation donnée. C'est une **vue calculée** qui ne doit **jamais être modifiée directement**.

### 3.2 Structure de données

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MODÈLE SparePartStock                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP           │ TYPE        │ REQUIS │ DÉFAUT    │ DESCRIPTION               │
│  ════════════════╪═════════════╪════════╪═══════════╪═══════════════════════════│
│  sku             │ String      │ Oui    │ -         │ Référence pièce           │
│  location        │ String      │ Oui    │ -         │ Code localisation (UPPER) │
│  quantity        │ Number      │ Non    │ 0         │ Quantité actuelle         │
│  criticalStock   │ Number      │ Non    │ null      │ Seuil alerte stock bas    │
│  last_unit_price │ Number      │ Non    │ -         │ Dernier prix unitaire     │
│  updatedAt       │ Date        │ Auto   │ now()     │ Dernière mise à jour      │
│                                                                                  │
│  INDEX UNIQUE: { sku, location }                                                │
│  → Une seule ligne de stock par pièce et par localisation                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Règle fondamentale

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  RÈGLE CRITIQUE : MODIFICATION DU STOCK                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Le stock ne doit JAMAIS être modifié directement.                              │
│                                                                                  │
│  ❌ INTERDIT:                                                                   │
│     SparePartStock.updateOne({ sku: "BMS-001" }, { quantity: 50 })              │
│                                                                                  │
│  ✅ CORRECT:                                                                    │
│     Toute modification passe par un SparePartMovement                           │
│     → Le service incrémente/décrémente automatiquement                          │
│                                                                                  │
│  POURQUOI ?                                                                     │
│  → Traçabilité complète de chaque mouvement                                     │
│  → Audit trail immuable                                                         │
│  → Possibilité de reconstruire l'historique                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Seuil critique (criticalStock)

| Situation | Comportement |
|-----------|--------------|
| `criticalStock = null` | Pas d'alerte configurée |
| `quantity > criticalStock` | Stock OK |
| `quantity <= criticalStock` | **Alerte stock bas** |

### 3.5 API Stock

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ENDPOINTS STOCK                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  GET  /api/stocks                    Liste stock (filtrable par location)       │
│  GET  /api/stocks/catalog            Catalogue enrichi avec stock global        │
│                                                                                  │
│  Paramètres GET /api/stocks:                                                        │
│  • location (optionnel) : Filtre par localisation                               │
│                                                                                  │
│  GET /api/stocks/catalog:                                                           │
│  • Retourne uniquement les pièces ACTIVES (active = true)                       │
│  • Les pièces désactivées ne sont pas incluses dans le catalogue                │
│                                                                                  │
│  Réponse enrichie:                                                              │
│  • Inclut les infos SparePart (name, delivery_delay, etc.)                      │
│  • Inclut criticalStock pour alertes                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 4 : MOUVEMENTS DE STOCK (SparePartMovement)

### 4.1 Description

Les mouvements de stock constituent le **journal d'audit immuable** de toutes les opérations sur le stock. Chaque entrée, sortie ou transfert crée un enregistrement.

### 4.2 Structure de données

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      MODÈLE SparePartMovement                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP           │ TYPE        │ REQUIS │ DESCRIPTION                           │
│  ════════════════╪═════════════╪════════╪═══════════════════════════════════════│
│  sku             │ String      │ Oui    │ Référence pièce                       │
│  qty             │ Number      │ Oui    │ Quantité (+entrée, -sortie)           │
│  reason          │ String      │ Oui    │ Type de mouvement (voir ci-dessous)   │
│  location        │ String      │ Non    │ Localisation (mvt simple)             │
│  from_location   │ String      │ Non    │ Source (transfert)                    │
│  to_location     │ String      │ Non    │ Destination (transfert)               │
│  unit_price      │ Number      │ Non    │ Prix unitaire au moment du mvt        │
│  battery_serial  │ String      │ Non    │ Lien vers batterie (prod/SAV)         │
│  event_id        │ ObjectId    │ Non    │ Référence événement lié               │
│  intervention_id │ ObjectId    │ Non    │ Référence intervention SAV            │
│  inventory_id    │ ObjectId    │ Non    │ Référence inventaire                  │
│  comment         │ String      │ Non    │ Notes/commentaires                    │
│  createdBy       │ String      │ Non    │ Utilisateur ou système                │
│  createdAt       │ Date        │ Auto   │ Timestamp (IMMUABLE)                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Types de mouvements (reason)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      TYPES DE MOUVEMENTS                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  REASON                │ QTY      │ DESCRIPTION                                 │
│  ══════════════════════╪══════════╪═════════════════════════════════════════════│
│  manual                │ +/-      │ Saisie manuelle via ERP                     │
│                        │          │ (entrée fournisseur, sortie diverse)        │
│  ──────────────────────┼──────────┼─────────────────────────────────────────────│
│  inventory_adjustment  │ +/-      │ Correction suite à inventaire physique      │
│                        │          │ (écart entre stock système et réel)         │
│  ──────────────────────┼──────────┼─────────────────────────────────────────────│
│  production            │ -        │ Déduction automatique (CRON)                │
│                        │          │ lors de la fabrication d'une batterie       │
│  ──────────────────────┼──────────┼─────────────────────────────────────────────│
│  sav_replacement       │ -        │ Pièces consommées lors d'une                │
│                        │          │ intervention SAV/garantie                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Types d'opérations

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    OPÉRATIONS DE STOCK                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. ENTRÉE (IN)                                                                 │
│  ═══════════════                                                                │
│  • qty > 0                                                                      │
│  • location renseigné                                                           │
│  • Exemple: Réception fournisseur                                               │
│                                                                                  │
│  {                                                                              │
│    sku: "BMS-001",                                                              │
│    qty: +10,                      // Positif = entrée                           │
│    reason: "manual",                                                            │
│    location: "REVAW",                                                           │
│    unit_price: 45.00,                                                           │
│    comment: "Réception commande #1234"                                          │
│  }                                                                              │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  2. SORTIE (OUT)                                                                │
│  ════════════════                                                               │
│  • qty < 0                                                                      │
│  • location renseigné                                                           │
│  • Exemple: Consommation production                                             │
│                                                                                  │
│  {                                                                              │
│    sku: "BMS-001",                                                              │
│    qty: -1,                       // Négatif = sortie                           │
│    reason: "production",                                                        │
│    location: "REVAW",                                                           │
│    battery_serial: "RW-48v2710210",                                             │
│    comment: "Prod Auto: B (BOM v1)"                                             │
│  }                                                                              │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  3. TRANSFERT (TRANSFER)                                                        │
│  ════════════════════════                                                       │
│  • from_location ET to_location renseignés                                      │
│  • qty = quantité transférée (positive)                                         │
│  • Opération ATOMIQUE (débit + crédit)                                          │
│                                                                                  │
│  {                                                                              │
│    sku: "BMS-001",                                                              │
│    qty: 5,                        // Quantité transférée                        │
│    reason: "manual",                                                            │
│    from_location: "WAREHOUSE-01",                                               │
│    to_location: "REVAW",                                                        │
│    comment: "Réapprovisionnement site production"                               │
│  }                                                                              │
│                                                                                  │
│  Effet:                                                                         │
│  • WAREHOUSE-01: -5 unités                                                      │
│  • REVAW: +5 unités                                                             │
│  • Total conservé (transaction ACID)                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Flux de création d'un mouvement

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   WORKFLOW CRÉATION MOUVEMENT                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Requête API (POST /api/stocks/movement)                                            │
│       │                                                                          │
│       ▼                                                                          │
│  ┌─────────────────────────────────┐                                            │
│  │ 1. VALIDATION                   │                                            │
│  │    • SKU existe ?               │                                            │
│  │    • qty ≠ 0 ?                  │                                            │
│  │    • reason valide ?            │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 2. DÉBUT TRANSACTION MONGODB    │                                            │
│  │    (Garantie ACID)              │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 3. ROUTAGE                      │                                            │
│  │                                 │                                            │
│  │  from_location + to_location ?  │                                            │
│  │       │              │          │                                            │
│  │      OUI            NON         │                                            │
│  │       │              │          │                                            │
│  │       ▼              ▼          │                                            │
│  │  TRANSFERT      MOUVEMENT       │                                            │
│  │  (2 updates)    SIMPLE          │                                            │
│  │                 (1 update)      │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 4. MISE À JOUR STOCK            │                                            │
│  │    • Incrémente/décrémente qty  │                                            │
│  │    • Met à jour last_unit_price │                                            │
│  │    • Met à jour criticalStock   │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 5. CRÉATION MOUVEMENT           │                                            │
│  │    (Enregistrement audit)       │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 6. COMMIT TRANSACTION           │                                            │
│  │    (ou ROLLBACK si erreur)      │                                            │
│  └─────────────────────────────────┘                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.6 API Mouvements

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ENDPOINTS MOUVEMENTS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  POST /api/stocks/movement          Créer un mouvement (in/out/transfer)        │
│  GET  /api/stocks/movements         Historique paginé avec filtres              │
│  GET  /api/stocks/movements/recent  10 derniers mouvements                      │
│                                                                                  │
│  Filtres GET /api/stocks/movements:                                                 │
│  • page, limit     : Pagination                                                 │
│  • sku             : Recherche par SKU (regex)                                  │
│  • source          : manual | inventory | sav | production | all               │
│  • types           : in,out,transfer (séparés par virgule)                      │
│  • dateStart       : Date début (ISO)                                           │
│  • dateEnd         : Date fin (ISO)                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 5 : NOMENCLATURES (BOM - Bill of Materials)

### 5.1 Description

La BOM (Bill of Materials) définit la **liste des pièces nécessaires** pour fabriquer une batterie d'un type donné, dans une localisation donnée. C'est le référentiel utilisé pour la **déduction automatique de stock** lors de la production.

### 5.2 Rappel : Types de batteries

Les lettres représentent le **type de batterie source** (usagée) utilisée pour fabriquer les batteries reconditionnées :

| Type | Capacités possibles | Usage |
|------|---------------------|-------|
| A | 13 kWh (271Ah) ou 12 kWh (250Ah) | Source type A |
| B | 13 kWh (271Ah) ou 12 kWh (250Ah) | Source type B |
| C | 13 kWh (271Ah) ou 12 kWh (250Ah) | Source type C |
| D | 8.6 kWh (179Ah) uniquement | Source type D |
| E | 8.6 kWh (179Ah) uniquement | Source type E |

**Important :** Chaque type a une **BOM différente** car les pièces nécessaires varient selon la source.

### 5.3 Structure de données

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MODÈLE BOM                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP             │ TYPE        │ REQUIS │ DESCRIPTION                         │
│  ══════════════════╪═════════════╪════════╪═════════════════════════════════════│
│  batteryType       │ String      │ Oui    │ Type batterie (A, B, C, D, E)       │
│  location          │ String      │ Oui    │ Localisation production (UPPERCASE) │
│  version           │ String      │ Non    │ Version BOM (défaut: "v1")          │
│  warrantyDuration  │ Number      │ Oui    │ Durée garantie en années            │
│  isActive          │ Boolean     │ Non    │ BOM active ? (défaut: true)         │
│  comment           │ String      │ Non    │ Notes/commentaires                  │
│  items             │ Array       │ Oui    │ Liste des pièces (voir ci-dessous)  │
│  createdAt         │ Date        │ Auto   │ Date création                       │
│  updatedAt         │ Date        │ Auto   │ Date modification                   │
│                                                                                  │
│  ITEMS (sous-document):                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  sparePart      │ ObjectId    │ Oui    │ Référence vers SparePart       │   │
│  │  quantity       │ Number      │ Oui    │ Quantité requise (min: 0)      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│  INDEX UNIQUE PARTIEL:                                                          │
│  { batteryType, location } WHERE isActive = true                                │
│  → Une seule BOM ACTIVE par couple type/localisation                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Formats attendus des champs

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   FORMATS ET VALIDATION BOM                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CHAMP             │ FORMAT              │ EXEMPLE          │ NOTES             │
│  ══════════════════╪═════════════════════╪══════════════════╪═══════════════════│
│  batteryType       │ 1 caractère         │ "A", "B", "C"    │ Auto UPPERCASE    │
│                    │ Lettre majuscule    │ "D", "E"         │ trim() appliqué   │
│  ──────────────────┼─────────────────────┼──────────────────┼───────────────────│
│  location          │ String UPPERCASE    │ "REVAW"          │ Auto UPPERCASE    │
│                    │ Code entrepôt       │ "WAREHOUSE-01"   │ trim() appliqué   │
│  ──────────────────┼─────────────────────┼──────────────────┼───────────────────│
│  version           │ String libre        │ "v1", "v2.1"     │ Doit différer     │
│                    │                     │ "2024-01"        │ de la précédente  │
│  ──────────────────┼─────────────────────┼──────────────────┼───────────────────│
│  warrantyDuration  │ Entier >= 0         │ 2                │ En années         │
│  ──────────────────┼─────────────────────┼──────────────────┼───────────────────│
│  items             │ Array non vide      │ [...]            │ Min 1 élément     │
│  items[].sparePart │ ObjectId MongoDB    │ "507f1f77..."    │ Réf. SparePart    │
│  items[].quantity  │ Entier >= 0         │ 14               │ Quantité/batterie │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 Relation BOM ↔ Location

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   RELATION BOM - LOCATION                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  POURQUOI UNE BOM EST LIÉE À UNE LOCATION ?                                     │
│  ═══════════════════════════════════════════                                    │
│                                                                                  │
│  1. Multi-sites de production                                                   │
│     → Chaque site peut avoir des pièces différentes disponibles                 │
│     → Les BOM peuvent varier selon le site                                      │
│                                                                                  │
│  2. Déduction de stock automatique                                              │
│     → Quand une batterie type "B" est produite                                  │
│     → Le système cherche la BOM active pour (type=B, location=REVAW)            │
│     → Le stock est déduit de la localisation REVAW                              │
│                                                                                  │
│  EXEMPLE:                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐             │
│  │ Site REVAW produit une batterie type B                         │             │
│  │                                                                 │             │
│  │ 1. Recherche BOM: { batteryType: "B", location: "REVAW",       │             │
│  │                     isActive: true }                            │             │
│  │                                                                 │             │
│  │ 2. BOM trouvée (v2):                                           │             │
│  │    items: [                                                     │             │
│  │      { sparePart: "BMS-001", quantity: 1 },                    │             │
│  │      { sparePart: "CELL-18650", quantity: 14 },                │             │
│  │      { sparePart: "CABLE-MAIN", quantity: 1 }                  │             │
│  │    ]                                                            │             │
│  │                                                                 │             │
│  │ 3. Déduction stock REVAW:                                      │             │
│  │    • BMS-001: -1                                                │             │
│  │    • CELL-18650: -14                                            │             │
│  │    • CABLE-MAIN: -1                                             │             │
│  └────────────────────────────────────────────────────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.6 Règles métier BOM

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RÈGLES MÉTIER BOM                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. UNE SEULE BOM ACTIVE PAR TYPE/LOCATION                                      │
│  ═══════════════════════════════════════════                                    │
│  • Index unique partiel sur { batteryType, location } où isActive=true          │
│  • Erreur 409 si tentative de créer une BOM active pour combo existant          │
│                                                                                  │
│  2. PAS DE DOUBLONS DANS LES ITEMS                                              │
│  ═════════════════════════════════════                                          │
│  • Une même pièce ne peut pas apparaître 2 fois dans une BOM                    │
│  • Erreur 400 si doublon détecté                                                │
│  • Regrouper les quantités sur une seule ligne                                  │
│                                                                                  │
│  3. VERSIONING OBLIGATOIRE                                                      │
│  ═════════════════════════════                                                  │
│  • Modifier une BOM = créer une NOUVELLE version                                │
│  • L'ancienne version est désactivée (isActive: false)                          │
│  • La nouvelle version doit avoir un numéro différent                           │
│  • Historique complet conservé                                                  │
│                                                                                  │
│  4. MINIMUM 1 ITEM                                                              │
│  ═════════════════════                                                          │
│  • Une BOM vide n'a pas de sens                                                 │
│  • Erreur 400 si items vide                                                     │
│                                                                                  │
│  5. SUPPRESSION = DÉSACTIVATION                                                 │
│  ══════════════════════════════════                                             │
│  • On ne supprime jamais une BOM                                                │
│  • On la désactive (isActive: false)                                            │
│  • Permet de garder l'historique pour les batteries déjà produites              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.7 Workflow de modification BOM (Versioning)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   WORKFLOW MODIFICATION BOM                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Utilisateur clique "Modifier la BOM" (BOM type B, location REVAW, version v1)  │
│       │                                                                          │
│       ▼                                                                          │
│  ┌─────────────────────────────────┐                                            │
│  │ 1. MODE ÉDITION                 │                                            │
│  │    • Saisie nouvelle version    │  ← Obligatoire, doit différer de "v1"      │
│  │    • Modification garantie      │                                            │
│  │    • Ajout/suppression pièces   │                                            │
│  │    • Modification quantités     │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 2. VALIDATION FRONTEND          │                                            │
│  │    • Version renseignée ?       │                                            │
│  │    • Pas de pièces vides ?      │                                            │
│  │    • Quantités > 0 ?            │                                            │
│  │    • Pas de doublons ?          │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 3. APPEL API (replaceBOM)       │                                            │
│  │    POST /bom/:id/replace        │                                            │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 4. VALIDATION BACKEND           │                                            │
│  │    • Version différente ?       │  ← Erreur 409 si version identique         │
│  │    • Version pas déjà utilisée? │  ← Erreur 409 si version existe déjà       │
│  │    • Pas de doublons pièces ?   │  ← Erreur 400 si doublon                   │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 5. OPÉRATION ATOMIQUE           │                                            │
│  │    a) Désactiver ancienne BOM   │  → isActive: false                         │
│  │    b) Créer nouvelle BOM        │  → isActive: true, version: "v2"           │
│  └─────────────┬───────────────────┘                                            │
│                │                                                                 │
│                ▼                                                                 │
│  ┌─────────────────────────────────┐                                            │
│  │ 6. RÉSULTAT                     │                                            │
│  │    • Ancienne BOM (v1): inactive│                                            │
│  │    • Nouvelle BOM (v2): active  │                                            │
│  │    • Redirection vers new BOM   │                                            │
│  └─────────────────────────────────┘                                            │
│                                                                                  │
│  ÉTAT FINAL EN BASE:                                                            │
│  ┌────────────────────────────────────────────────────────────────┐             │
│  │ { batteryType: "B", location: "REVAW", version: "v1",          │             │
│  │   isActive: false, items: [...] }                  ← HISTORIQUE              │
│  │                                                                 │             │
│  │ { batteryType: "B", location: "REVAW", version: "v2",          │             │
│  │   isActive: true, items: [...] }                   ← ACTIVE                  │
│  └────────────────────────────────────────────────────────────────┘             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.8 API BOM

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ENDPOINTS BOM                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  GET    /api/bom                    Liste toutes les BOM (avec coût estimé)     │
│  POST   /api/bom                    Créer une nouvelle BOM                      │
│  GET    /api/bom/active/:batteryType Récupérer la BOM active pour un type       │
│  PATCH  /api/bom/:id/deactivate     Désactiver une BOM                          │
│  POST   /api/bom/:id/replace        Remplacer par nouvelle version              │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  POST /api/bom - Création                                                           │
│  Body:                                                                          │
│  {                                                                              │
│    "batteryType": "B",              // Requis, 1 char, auto-UPPERCASE           │
│    "location": "REVAW",             // Requis, auto-UPPERCASE                   │
│    "version": "v1",                 // Optionnel, défaut "v1"                   │
│    "warrantyDuration": 2,           // Requis, en années                        │
│    "items": [                       // Requis, min 1 élément                    │
│      { "sparePart": "ObjectId", "quantity": 1 },                                │
│      { "sparePart": "ObjectId", "quantity": 14 }                                │
│    ],                                                                           │
│    "comment": "BOM initiale"        // Optionnel                                │
│  }                                                                              │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  POST /api/bom/:id/replace - Modification                                           │
│  Body:                                                                          │
│  {                                                                              │
│    "version": "v2",                 // Requis, doit différer                    │
│    "warrantyDuration": 3,           // Requis                                   │
│    "items": [...],                  // Requis, nouvelle liste                   │
│    "comment": "Ajout fusible"       // Optionnel                                │
│  }                                                                              │
│                                                                                  │
│  ───────────────────────────────────────────────────────────────────────────────│
│                                                                                  │
│  GET /api/bom - Réponse enrichie avec coût estimé                                   │
│  ─────────────────────────────────────────────                                  │
│  Chaque BOM retournée inclut un champ calculé `totalCost` représentant          │
│  le coût estimé de production d'une batterie selon cette nomenclature.          │
│                                                                                  │
│  Calcul du coût:                                                                │
│  • Pour chaque pièce, on récupère le `last_unit_price` du stock                │
│  • Si une pièce existe dans plusieurs entrepôts, on prend le prix              │
│    le plus récent (basé sur `updatedAt`)                                       │
│  • totalCost = Σ (unitPrice × quantity) pour chaque item                       │
│                                                                                  │
│  Champs ajoutés dans la réponse:                                               │
│  • bom.totalCost : Coût total estimé (€)                                       │
│  • bom.items[].unitPrice : Prix unitaire de la pièce                           │
│  • bom.items[].totalLinePrice : Prix × quantité pour cette ligne               │
│                                                                                  │
│  Note: Si une pièce n'a jamais eu de mouvement avec prix,                      │
│  son unitPrice sera 0 (coût potentiellement sous-estimé).                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.9 Exemple complet de BOM

```javascript
// Exemple de document BOM en base de données
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  batteryType: "B",
  location: "REVAW",
  version: "v2",
  warrantyDuration: 2,
  isActive: true,
  comment: "Ajout fusible de protection",
  items: [
    { sparePart: ObjectId("..."), quantity: 1 },   // BMS-001
    { sparePart: ObjectId("..."), quantity: 14 },  // CELL-18650
    { sparePart: ObjectId("..."), quantity: 1 },   // CABLE-MAIN
    { sparePart: ObjectId("..."), quantity: 2 }    // FUSE-50A (nouveau)
  ],
  createdAt: ISODate("2025-01-22T10:30:00Z"),
  updatedAt: ISODate("2025-01-22T10:30:00Z")
}
```

---

## PARTIE 6 : DÉDUCTION AUTOMATIQUE DE STOCK (CRON)

### 6.1 Description

Un processus automatique (CRON) déduit le stock des pièces lorsqu'une batterie est produite. Ce processus utilise la BOM active pour déterminer les pièces à déduire.

### 6.2 Workflow de déduction production

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                DÉDUCTION STOCK AUTOMATIQUE (PRODUCTION)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CRON quotidien                                                                  │
│       │                                                                          │
│       ▼                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐                │
│  │ 1. RECHERCHE BATTERIES À TRAITER                            │                │
│  │    Critères:                                                 │                │
│  │    • stock_deducted ≠ true                                  │                │
│  │    • isCanceled ≠ true                                      │                │
│  │    • type existe (A, B, C, D, E)                            │                │
│  └─────────────────────────┬───────────────────────────────────┘                │
│                            │                                                     │
│                            ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐                │
│  │ 2. POUR CHAQUE BATTERIE                                     │                │
│  │                                                              │                │
│  │    a) Récupérer BOM active pour battery.type                │                │
│  │       → getActiveBOMByTypeService(battery.type)             │                │
│  │                                                              │                │
│  │    b) Récupérer location depuis BOM                         │                │
│  │       → bom.location (ex: "REVAW")                          │                │
│  │                                                              │                │
│  │    c) Pour chaque pièce dans BOM.items:                     │                │
│  │       ┌──────────────────────────────────────────────────┐  │                │
│  │       │ performStockMovement({                           │  │                │
│  │       │   sku: item.sparePart.sku,                       │  │                │
│  │       │   qty: -item.quantity,        // Négatif         │  │                │
│  │       │   reason: "production",                          │  │                │
│  │       │   location: bom.location,                        │  │                │
│  │       │   battery_serial: battery.NumeroSerie,           │  │                │
│  │       │   createdBy: "system_cron",                      │  │                │
│  │       │   comment: "Prod Auto: {type} (BOM {version})"   │  │                │
│  │       │ })                                                │  │                │
│  │       └──────────────────────────────────────────────────┘  │                │
│  │                                                              │                │
│  │    d) Marquer batterie comme traitée                        │                │
│  │       → battery.stock_deducted = true                       │                │
│  │                                                              │                │
│  └─────────────────────────────────────────────────────────────┘                │
│                                                                                  │
│  RÉSULTAT:                                                                       │
│  • N mouvements créés (1 par pièce × nombre de batteries)                       │
│  • Stock décrémenté pour chaque pièce                                           │
│  • Traçabilité complète (battery_serial lié)                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Workflow de déduction SAV

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                DÉDUCTION STOCK SAV (INTERVENTION)                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Technicien SAV saisit intervention dans ERP                                    │
│       │                                                                          │
│       ▼                                                                          │
│  ┌─────────────────────────────────────────────────────────────┐                │
│  │ PAYLOAD INTERVENTION                                        │                │
│  │ {                                                           │                │
│  │   serial: "RW-48v2710210",                                  │                │
│  │   motif: "Défaut BMS",                                      │                │
│  │   status: "réparée",                                        │                │
│  │   parts: [                                                  │                │
│  │     { sku: "BMS-001", quantity: 1 }                         │                │
│  │   ]                                                         │                │
│  │ }                                                           │                │
│  └─────────────────────────┬───────────────────────────────────┘                │
│                            │                                                     │
│                            ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐                │
│  │ SERVICE saveInterventionService                             │                │
│  │                                                              │                │
│  │ 1. Récupérer batterie par NumeroSerie                       │                │
│  │ 2. Trouver dernière date d'arrivée SAV                      │                │
│  │ 3. Récupérer BOM active pour battery.type                   │                │
│  │ 4. Récupérer location depuis BOM                            │                │
│  │                                                              │                │
│  │ 5. Pour chaque pièce déclarée:                              │                │
│  │    ┌──────────────────────────────────────────────────┐     │                │
│  │    │ performStockMovement({                           │     │                │
│  │    │   sku: part.sku,                                 │     │                │
│  │    │   qty: -part.quantity,       // Négatif          │     │                │
│  │    │   reason: "sav_replacement",                     │     │                │
│  │    │   location: bom.location,                        │     │                │
│  │    │   battery_serial: serial,                        │     │                │
│  │    │   createdBy: "tech_sav",                         │     │                │
│  │    │   comment: "SAV: {motif}"                        │     │                │
│  │    │ })                                                │     │                │
│  │    └──────────────────────────────────────────────────┘     │                │
│  │                                                              │                │
│  │ 6. Enregistrer intervention dans SavIntervention            │                │
│  │ 7. Ajouter pièces à parts_used (cumulatif)                  │                │
│  │                                                              │                │
│  └─────────────────────────────────────────────────────────────┘                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 7 : SYNTHÈSE - QUI ÉCRIT QUOI ?

### 7.1 Matrice de responsabilité

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MATRICE DE RESPONSABILITÉ SPARE PARTS                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ENTITÉ           │ CRÉATION        │ MODIFICATION      │ SUPPRESSION           │
│  ═════════════════╪═════════════════╪═══════════════════╪═══════════════════════│
│                                                                                  │
│  --- CATALOGUE ---                                                              │
│  SparePart        │ Admin ERP       │ Admin ERP         │ Soft-delete (active)  │
│  Location         │ Admin ERP       │ Admin ERP         │ Soft-delete (active)  │
│                                                                                  │
│  --- BOM ---                                                                    │
│  BOM              │ Admin ERP       │ Versioning (new)  │ Désactivation         │
│  BOM.items        │ Admin ERP       │ Via versioning    │ Via versioning        │
│                                                                                  │
│  --- STOCK ---                                                                  │
│  SparePartStock   │ Auto (1er mvt)  │ Via Movement ONLY │ Jamais                │
│  SparePartMovement│ Manuel/Auto     │ Jamais (immuable) │ Jamais                │
│                                                                                  │
│  --- SOURCES MOUVEMENTS ---                                                     │
│  reason=manual    │ Utilisateur ERP │ -                 │ -                     │
│  reason=inventory │ Utilisateur ERP │ -                 │ -                     │
│  reason=production│ CRON système    │ -                 │ -                     │
│  reason=sav       │ Tech SAV        │ -                 │ -                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Flux de données global

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FLUX DE DONNÉES SPARE PARTS                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                      ┌──────────────────┐                                       │
│                      │  ADMIN ERP       │                                       │
│                      │  (Configuration) │                                       │
│                      └────────┬─────────┘                                       │
│                               │                                                  │
│              ┌────────────────┼────────────────┐                                │
│              │                │                │                                 │
│              ▼                ▼                ▼                                 │
│      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                         │
│      │  SparePart   │ │   Location   │ │     BOM      │                         │
│      │  (Catalogue) │ │  (Entrepôts) │ │(Nomenclature)│                         │
│      └──────┬───────┘ └──────┬───────┘ └──────┬───────┘                         │
│             │                │                │                                  │
│             └────────────────┼────────────────┘                                  │
│                              │                                                   │
│                              ▼                                                   │
│                    ┌──────────────────┐                                         │
│                    │  SparePartStock  │                                         │
│                    │ (État actuel)    │                                         │
│                    └────────┬─────────┘                                         │
│                             │                                                    │
│                             │ Modifié par                                        │
│                             │                                                    │
│         ┌───────────────────┼───────────────────┐                               │
│         │                   │                   │                                │
│         ▼                   ▼                   ▼                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                          │
│  │   MANUEL    │    │    CRON     │    │    SAV      │                          │
│  │ (ERP User)  │    │ (Production)│    │  (Tech)     │                          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                          │
│         │                  │                  │                                  │
│         └──────────────────┼──────────────────┘                                  │
│                            │                                                     │
│                            ▼                                                     │
│                  ┌──────────────────┐                                           │
│                  │ SparePartMovement│                                           │
│                  │ (Audit immuable) │                                           │
│                  └──────────────────┘                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 8 : MODÈLES DE DONNÉES COMPLETS

### 8.1 Collection: spare_parts (Catalogue)

```javascript
{
  _id: ObjectId,
  sku: "BMS-001",              // Unique
  name: "Battery Management System v2",
  supplier: "Supplier A",
  supplier_url: "https://supplier-a.com",
  unit: "piece",
  active: true,
  delivery_delay: 14,          // Jours
  createdAt: ISODate("2025-01-01T00:00:00Z")
}
```

### 8.2 Collection: locations (Entrepôts)

```javascript
{
  _id: ObjectId,
  code: "REVAW",               // Unique, UPPERCASE
  name: "Site Production Revaw",
  active: true,
  createdAt: ISODate("2025-01-01T00:00:00Z")
}
```

### 8.3 Collection: spare_part_stocks (Stock actuel)

```javascript
{
  _id: ObjectId,
  sku: "BMS-001",
  location: "REVAW",
  quantity: 45,
  criticalStock: 10,           // Alerte si qty <= 10
  last_unit_price: 45.00,
  updatedAt: ISODate("2025-01-22T14:30:00Z")
}
// Index unique: { sku, location }
```

### 8.4 Collection: spare_part_movements (Journal)

```javascript
{
  _id: ObjectId,
  sku: "BMS-001",
  qty: -1,                     // Négatif = sortie
  reason: "production",
  location: "REVAW",
  battery_serial: "RW-48v2710210",
  comment: "Prod Auto: B (BOM v2)",
  createdBy: "system_cron",
  createdAt: ISODate("2025-01-22T19:00:00Z")  // IMMUABLE
}
```

### 8.5 Collection: boms (Nomenclatures)

```javascript
{
  _id: ObjectId,
  batteryType: "B",
  location: "REVAW",
  version: "v2",
  warrantyDuration: 2,
  isActive: true,
  comment: "Ajout fusible de protection",
  items: [
    { sparePart: ObjectId("..."), quantity: 1 },
    { sparePart: ObjectId("..."), quantity: 14 },
    { sparePart: ObjectId("..."), quantity: 1 },
    { sparePart: ObjectId("..."), quantity: 2 }
  ],
  createdAt: ISODate("2025-01-22T10:30:00Z"),
  updatedAt: ISODate("2025-01-22T10:30:00Z")
}
// Index unique partiel: { batteryType, location } WHERE isActive = true
```

---

## PARTIE 9 : FAQ TECHNIQUE

### 9.1 Questions fréquentes

| Question | Réponse |
|----------|---------|
| **Comment ajouter une nouvelle pièce au catalogue ?** | POST /api/spare-parts avec sku, name. Le SKU doit être unique et contenir uniquement des lettres, chiffres et tirets. |
| **Comment faire une entrée de stock ?** | POST /api/stocks/movement avec qty positif, location, reason: "manual" |
| **Comment faire une sortie de stock ?** | POST /api/stocks/movement avec qty négatif, location, reason approprié |
| **Comment transférer du stock entre sites ?** | POST /api/stocks/movement avec from_location et to_location |
| **Comment créer une BOM ?** | POST /api/bom avec batteryType (1 char), location, items[], warrantyDuration |
| **Comment modifier une BOM ?** | POST /api/bom/:id/replace avec nouvelle version et nouveaux items |
| **Pourquoi ma BOM ne se crée pas ?** | Vérifier : pas de BOM active existante pour ce type/location, pas de doublons dans items |
| **Comment désactiver une BOM ?** | PATCH /api/bom/:id/deactivate |
| **Comment est calculé le coût estimé d'une BOM ?** | Somme de (prix unitaire × quantité) pour chaque pièce. Le prix unitaire est le `last_unit_price` le plus récent du stock. |
| **Le stock peut-il devenir négatif ?** | Oui, le système ne bloque pas les sorties même si stock insuffisant |
| **Comment voir l'historique d'une pièce ?** | GET /api/stocks/movements?sku=XXX |
| **Comment configurer une alerte stock bas ?** | Mettre à jour criticalStock dans SparePartStock via un mouvement |
| **Pourquoi je ne peux pas supprimer une pièce ?** | Elle a encore du stock positif ou est utilisée dans une BOM active. Vider le stock et/ou retirer la pièce des BOMs d'abord. |
| **Les pièces désactivées apparaissent-elles dans le catalogue ?** | Non, GET /api/stocks/catalog ne retourne que les pièces actives. |
| **Comment voir les pièces désactivées ?** | GET /api/spare-parts/inactive retourne la liste des pièces archivées (active = false). |
| **Comment réactiver une pièce désactivée ?** | PATCH /api/spare-parts/:sku/reactivate remet la pièce en état actif (active = true). |

### 9.2 Codes d'erreur courants

| Code | Situation | Solution |
|------|-----------|----------|
| **400** | Champs requis manquants | Vérifier payload (sku, qty, reason, etc.) |
| **400** | Doublons dans BOM items | Regrouper les quantités sur une seule ligne |
| **400** | BOM items vide | Ajouter au moins une pièce |
| **404** | SKU inexistant | Créer la pièce d'abord |
| **404** | BOM introuvable | Vérifier l'ID ou créer une BOM |
| **409** | BOM active existe déjà | Modifier l'existante via replace ou la désactiver |
| **409** | Version BOM déjà utilisée | Choisir une version différente |
| **409** | SKU déjà existant | Utiliser un autre SKU |
| **409** | Pièce a du stock positif | Vider le stock avant de désactiver la pièce |
| **409** | Pièce utilisée dans BOM active | Retirer la pièce des BOMs actives avant de la désactiver |

---

## ANNEXE : Fichiers de référence

### Backend (back-end/src/)

**Modèles:**
- `models/SparePart.model.js` - Catalogue pièces
- `models/SparePartStock.model.js` - Stock par localisation
- `models/SparePartMovement.model.js` - Journal mouvements
- `models/BOM.model.js` - Nomenclatures
- `models/Location.model.js` - Localisations
- `models/SavIntervention.model.js` - Interventions SAV

**Services:**
- `services/sparePart.service.js` - CRUD catalogue
- `services/stock.service.js` - Gestion stock et mouvements
- `services/bom.service.js` - Gestion BOM
- `services/production.service.js` - Déduction auto production
- `services/sav.service.js` - Déduction SAV

**Routes:**
- `routes/SpareParts.routes.js` - API catalogue
- `routes/Stock.routes.js` - API stock/mouvements
- `routes/bom.routes.js` - API BOM

### Frontend (front-end/src/)

**Services:**
- `services/spareParts.js` - API client catalogue
- `services/stock.js` - API client stock
- `services/bom.js` - API client BOM

**Vues Admin:**
- `views/Admin/AdminBomView.vue` - Liste BOM
- `views/Admin/AdminBomDetailsView.vue` - Détail/édition BOM

---

_Document généré le 30/01/2026_
_Version 1.4 - Mise à jour routes API avec préfixe /api/_
