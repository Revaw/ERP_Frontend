# Guide de mise a jour - Revaw ERP

## Prerequis

- `private.key` a la racine du projet (ne jamais la committer)
- Mot de passe de la cle : `XXXX`

---

## Etapes pour publier une mise a jour

### 1. Modifier le code Vue.js

Fais tes modifications dans `src/` comme d'habitude.

### 2. Incrementer la version

Dans `src-tauri/tauri.conf.json`, incremente le champ `version` :

```json
"version": "0.1.2"
```

> Utilise le semantic versioning : MAJEUR.MINEUR.PATCH
>
> - PATCH (0.1.1 -> 0.1.2) : correction de bug
> - MINEUR (0.1.2 -> 0.2.0) : nouvelle fonctionnalite
> - MAJEUR (0.2.0 -> 1.0.0) : changement incompatible

### 3. Commit et push

```bash
git add .
git commit -m "chore: release vX.Y.Z"
git push
```

### 4. Build l'application

```bash
npm run tauri:build
```

Le `.exe` sera dans : `src-tauri/target/release/bundle/nsis/`

### 5. Signer le build

```bash
npx tauri signer sign -f private.key -p "XXXMDPXXX" "src-tauri/target/release/bundle/nsis/Revaw ERP_X.Y.Z_x64-setup.exe"
```

Copie la **signature** affichee dans le terminal (le bloc base64 apres "Public signature:").

### 6. Mettre a jour latest.json

Edite `latest.json` a la racine :

```json
{
  "version": "X.Y.Z",
  "notes": "Description des changements",
  "pub_date": "2026-01-01T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://github.com/Revaw/ERP_Frontend/releases/download/vX.Y.Z/Revaw.ERP_X.Y.Z_x64-setup.exe",
      "signature": "COLLER_LA_SIGNATURE_ICI"
    }
  }
}
```

> **Attention** : l'URL utilise un `.` au lieu d'un espace (`Revaw.ERP` et non `Revaw ERP`), car GitHub remplace les espaces par des points dans les noms d'assets.

### 7. Creer la release sur GitHub

1. Va sur GitHub > Releases > **Create a new release**
2. Tag : `vX.Y.Z`
3. Titre : `Revaw ERP vX.Y.Z`
4. Description : notes de version
5. Upload les **2 assets** :
   - `Revaw ERP_X.Y.Z_x64-setup.exe` (depuis `src-tauri/target/release/bundle/nsis/`)
   - `latest.json` (depuis la racine du projet)
6. Publier

### 8. Verifier

Les utilisateurs ayant une version anterieure verront automatiquement une boite de dialogue au lancement de l'app leur proposant la mise a jour.

---

## Rappels importants

- La **signature** et le **exe** doivent provenir du **meme build**. Si tu rebuild, tu dois re-signer.
- Ne jamais partager `private.key`. Si tu la perds, tu devras regenerer une paire de cles et tous les anciens clients ne pourront plus verifier les mises a jour.
- Le fichier `latest.json` n'est **pas** dans le repo (gitignore). Il est uploade uniquement comme asset de release.
