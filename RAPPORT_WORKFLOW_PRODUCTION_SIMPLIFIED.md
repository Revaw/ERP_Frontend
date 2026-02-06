# WORKFLOW PRODUCTION BATTERIES - Guide Simplifié

> **Document destiné aux équipes non techniques**
> Version simplifiée du workflow de gestion des batteries reconditionnées.

---

## Vue d'ensemble

Le système de suivi des batteries fonctionne avec **3 éléments** qui communiquent entre eux :

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   PRODUCTION    │ ──────► │  SYNCHRONISATION│ ──────► │      ERP        │
│  (Raspberry Pi) │  19h00  │   (Automatique) │         │  (Application)  │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
     Scanette                   Tous les soirs            Interface web
```

| Élément | Où ? | Qui l'utilise ? | Pour quoi faire ? |
|---------|------|-----------------|-------------------|
| **Production** | Atelier (Raspberry Pi + scanette) | Techniciens production | Créer, tester, expédier les batteries |
| **Synchronisation** | Automatique (invisible) | Personne (automatique) | Transférer les données vers l'ERP |
| **ERP** | Navigateur web | Tous (admin, SAV, commerce) | Consulter, gérer SAV, commenter |

---

## Le parcours d'une batterie

### Étape 1 : Création (Production)

Le technicien scanne la commande `create` + le type de batterie (A, B, C, D ou E).

**Résultat :**
- Un numéro de série temporaire est généré (ex: `RW-48vXXX0210`)
- Une étiquette interne (V1) est imprimée
- La batterie existe maintenant dans le système

### Étape 2 : Test physique (Hors système)

Le technicien teste la batterie manuellement. Cette étape n'est pas enregistrée dans le système.

### Étape 3 : Validation (Production)

Après le test réussi, le technicien scanne `finish` + la capacité (13, 12 ou 8.6 kWh).

**Résultat :**
- Le numéro de série devient définitif (ex: `RW-48v2710210`)
- Les étiquettes produit et carton sont imprimées
- La batterie est prête à être expédiée

### Étape 4 : Expédition (Production)

Le technicien scanne `expedition` puis les batteries à expédier.

**Résultat :**
- La date d'expédition est enregistrée
- Un email récapitulatif est envoyé
- La batterie quitte l'atelier

---

## Cycle SAV

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│              │      │              │      │              │      │              │
│   RETOUR     │ ───► │  DIAGNOSTIC  │ ───► │  RÉPARATION  │ ───► │ RÉ-EXPÉDITION│
│  (Scanette)  │      │    (ERP)     │      │    (ERP)     │      │  (Scanette)  │
│              │      │              │      │              │      │              │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
   Production            Équipe SAV           Équipe SAV           Production
```

1. **Retour** : Le technicien scanne `sav` + le numéro de série → La batterie entre en SAV
2. **Diagnostic** : L'équipe SAV renseigne le motif dans l'ERP
3. **Réparation** : L'équipe SAV note les pièces utilisées et passe le statut à "réparée"
4. **Ré-expédition** : Le technicien scanne `expedition` → La batterie sort du SAV

---

## Les statuts d'une batterie

| Statut | Signification | Comment on y arrive ? |
|--------|---------------|----------------------|
| **En production** | Batterie créée, pas encore testée | Après scan `create` |
| **En stock** | Batterie testée, prête à partir | Après scan `finish` |
| **Expédiée** | Batterie envoyée au client | Après scan `expedition` |
| **En SAV** | Batterie retournée pour réparation | Après scan `sav` |
| **Annulée** | Batterie mise au rebut | Action manuelle dans l'ERP |

**Priorité d'affichage** : En SAV > Annulée > Expédiée > En stock > En production

---

## Révocation de garantie

La révocation de garantie est une action **manuelle** réalisée dans l'ERP par un administrateur.

### Quand révoquer une garantie ?

| Situation | Action |
|-----------|--------|
| Le client a ouvert la batterie lui-même | Révoquer |
| Mauvaise utilisation constatée | Révoquer |
| Modification par un tiers non autorisé | Révoquer |
| Conditions de stockage non respectées | Révoquer |

### Comment ça fonctionne ?

- **Garantie active** : La date de fin de garantie s'affiche normalement
- **Garantie révoquée** : Affiche "RÉVOQUÉE" en rouge à la place de la date

### Qui peut le faire ?

Seuls les **administrateurs** peuvent révoquer ou rétablir une garantie.

L'action est **réversible** : on peut rétablir la garantie si nécessaire.

---

## Modification de version

La version d'une batterie peut être **modifiée depuis l'ERP ou par un prestataire externe** avec conservation de l'historique.

### Quand modifier une version ?

| Situation | Action | Qui peut le faire ? |
|-----------|--------|---------------------|
| Version mal renseignée à la production | Corriger | ERP (tous) |
| Mise à jour après intervention technique | Modifier | ERP ou Prestataire |
| Alignement avec nouvelle nomenclature | Modifier | ERP (tous) |

### Comment ça fonctionne ?

- Chaque modification **archive l'ancienne version** dans un historique
- L'historique affiche : date, ancienne version, nouvelle version, motif
- La version actuelle reste visible en évidence
- **Prestataires** : peuvent modifier uniquement les batteries **expédiées**

### Informations requises

| Champ | Obligatoire ? | Description |
|-------|---------------|-------------|
| Nouvelle version | Oui | La nouvelle valeur de version |
| Motif | Oui | Raison du changement |

### Format de version (prestataires)

Les prestataires doivent respecter un format strict : **uniquement chiffres et points**.

| Exemple | Valide ? |
|---------|----------|
| `1.03` | ✅ |
| `1.3.22.1` | ✅ |
| `2.0` | ✅ |
| `V2.1` | ❌ (lettre) |
| `1.0-beta` | ❌ (tiret) |

---

## Types de batteries

| Type | Capacités possibles | Batterie source |
|------|---------------------|-----------------|
| **A** | 13 kWh ou 12 kWh | Type A |
| **B** | 13 kWh ou 12 kWh | Type B |
| **C** | 13 kWh ou 12 kWh | Type C |
| **D** | 8.6 kWh uniquement | Type D |
| **E** | 8.6 kWh uniquement | Type E |

> Chaque type a sa propre liste de pièces (BOM) car les composants varient.

---

## Dictionnaire des propriétés

### Informations de base

| Propriété | Description | Créé par | Modifiable par | Exemple |
|-----------|-------------|----------|----------------|---------|
| **Numéro de série** | Identifiant unique de la batterie | Production | Production (une seule fois au finish) | `RW-48v2710210` |
| **Code QR** | Code pour le passport produit | Production | Jamais | `LlC2dn` |
| **Type** | Type de batterie source (A à E) | Production | Jamais | `B` |
| **Version** | Version du logiciel de production | Production | ERP (avec historique) | `1.0.5.1` |
| **Score** | Score de qualité (optionnel) | Script automatique | Script automatique | `103.2` |

### Dates importantes

| Propriété | Description | Créé par | Modifiable par | Signification |
|-----------|-------------|----------|----------------|---------------|
| **Date d'impression** | Quand la batterie a été créée | Production | Jamais | Naissance de la batterie |
| **Date de test** | Quand la batterie a été validée | Production | Jamais | Batterie prête |
| **Date d'expédition** | Quand la batterie a été envoyée | Production | Jamais | Batterie partie |

### Informations SAV

| Propriété | Description | Créé par | Modifiable par |
|-----------|-------------|----------|----------------|
| **Statut SAV** (oui/non) | La batterie est-elle actuellement en SAV ? | Production | Production |
| **Date d'arrivée SAV** | Quand la batterie est entrée en SAV | Production | Jamais |
| **Date de départ SAV** | Quand la batterie est sortie du SAV | Production | Jamais |
| **Motif SAV** | Raison de l'intervention | ERP | ERP |
| **Statut intervention** | "en cours" ou "réparée" | ERP | ERP |
| **Pièces utilisées** | Liste des pièces pour la réparation | ERP | ERP |

### Informations ERP uniquement

| Propriété | Description | Qui peut modifier ? | Valeurs possibles |
|-----------|-------------|---------------------|-------------------|
| **Commentaire** | Notes libres sur la batterie | Tous (via ERP) | Texte libre |
| **Annulée** | Batterie mise au rebut | Administrateurs (via ERP) | Oui / Non |
| **Garantie révoquée** | Garantie annulée | Administrateurs (via ERP) | Oui / Non |
| **Stock déduit** | Les pièces ont été décomptées du stock | Automatique (CRON) | Oui / Non |
| **Historique versions** | Historique des modifications de version | Automatique (via ERP) | Liste des changements |

---

## Résumé : Qui fait quoi ?

### Production (Scanette)

| Action | Commande | Résultat |
|--------|----------|----------|
| Créer une batterie | `create A` (ou B, C, D, E) | Nouvelle batterie avec numéro temporaire |
| Valider après test | `finish 13` (ou 12, 8.6) | Numéro définitif + étiquettes |
| Expédier | `expedition` + scan batteries | Date d'expédition enregistrée |
| Entrée SAV | `sav` + scan batterie | Batterie marquée "En SAV" |
| Réimprimer étiquettes | `reprint` | Nouvelles étiquettes |

### ERP (Interface web)

| Action | Qui peut ? | Où dans l'interface ? |
|--------|------------|----------------------|
| Consulter une batterie | Tous | Page détail batterie |
| Ajouter un commentaire | Tous | Page détail batterie |
| Modifier la version | Tous | Page détail batterie (icône crayon) |
| Renseigner motif SAV | Équipe SAV | Section SAV |
| Ajouter pièces utilisées | Équipe SAV | Section SAV |
| Annuler une batterie | Administrateurs | Page détail batterie |
| Révoquer la garantie | Administrateurs | Section Garantie |

---

## Points importants à retenir

### La Production est la source de vérité

Les données créées par la scanette (dates, numéro de série, statut SAV réel) **ne peuvent pas** être modifiées dans l'ERP.

**Exception** : La version peut être modifiée via l'ERP avec conservation de l'historique des changements.

### Délai de synchronisation

Les données de production sont synchronisées **tous les soirs à 19h**. Une batterie créée à 10h sera visible dans l'ERP le lendemain matin.

### SAV : deux niveaux d'information

| Information | Source | Exemple |
|-------------|--------|---------|
| **Statut SAV réel** (en SAV ou pas) | Production | Oui/Non |
| **Détails SAV** (motif, pièces, etc.) | ERP | "Défaut BMS", pièces changées |

L'ERP ne peut pas "sortir" une batterie du SAV. Seule la production (via `expedition`) peut le faire.

---

## Prestataires externes

Les prestataires externes sont des partenaires qui interviennent sur les batteries mais n'ont **pas accès à l'ERP**.

### Qui sont les prestataires ?

- Techniciens tiers effectuant des mises à jour firmware
- Partenaires de maintenance
- Intervenants SAV externes

### Ce qu'ils peuvent faire

| Action | Disponible ? | Condition |
|--------|--------------|-----------|
| Voir la liste des batteries | ✅ | Batteries expédiées uniquement |
| Voir le détail d'une batterie | ✅ | Batteries expédiées uniquement |
| Modifier la version | ✅ | Batteries expédiées uniquement |
| Accéder à l'ERP | ❌ | Jamais |
| Voir les batteries en production | ❌ | Jamais |

### Comment se connectent-ils ?

- Compte créé par un **superadmin** via l'ERP
- Rôle : `Prestataire Externe`
- Connexion sur un **portail dédié** (pas l'ERP)

---

## Lexique

| Terme | Définition |
|-------|------------|
| **BOM** | Bill Of Materials - Liste des pièces nécessaires pour fabriquer une batterie |
| **SAV** | Service Après-Vente - Gestion des retours et réparations |
| **Serial / Numéro de série** | Identifiant unique de chaque batterie (ex: RW-48v2710210) |
| **Scanette** | Lecteur de codes-barres utilisé en production |
| **CRON** | Tâche automatique qui s'exécute à heure fixe |
| **Sync** | Synchronisation - Transfert automatique des données |

---

_Document généré le 30/01/2026_
_Version 1.2 - Ajout prestataires externes et modification de version_
