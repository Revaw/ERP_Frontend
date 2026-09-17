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

### 4. Build l'application (signature integree)

> Depuis la v0.4.0, la signature se fait PENDANT le build (option
> `createUpdaterArtifacts` du tauri.conf.json) : plus d'etape de signature
> manuelle, et il est impossible de signer un exe d'un autre build.

Dans le terminal, definir la cle puis builder :

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "chemin\vers\private.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "mot de passe de la cle"
npm run tauri:build
```

Resultat dans `src-tauri/target/release/bundle/nsis/` :

- `Revaw ERP_X.Y.Z_x64-setup.exe` — l'installateur
- `Revaw ERP_X.Y.Z_x64-setup.exe.sig` — la signature (contenu a coller dans latest.json)

> Si le build echoue avec "private key not found" : les variables `$env:`
> ci-dessus manquent dans le terminal courant.

### 5. Mettre a jour latest.json

Edite `latest.json` a la racine :

```json
{
  "version": "X.Y.Z",
  "notes": "Description des changements",
  "pub_date": "2026-01-01T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "url": "https://ota.revaw.fr/erp/Revaw.ERP_X.Y.Z_x64-setup.exe",
      "signature": "COLLER ICI LE CONTENU DU FICHIER .sig"
    }
  }
}
```

> **Attention BOM** (vecu le 14/08/2026) : le fichier doit etre en UTF-8 **sans BOM**,
> sinon l'app affiche "error decoding response body" a chaque lancement.
> Ne PAS le generer avec `Out-File`/`>` en PowerShell 5.1 (qui ajoutent un BOM) —
> l'editer dans VS Code (encodage "UTF-8" affiche en bas a droite, pas "UTF-8 with BOM").

### 6. Uploader sur le VPS (ota.revaw.fr)

Depuis la v0.5.0, l'updater pointe vers notre propre VPS (`https://ota.revaw.fr/erp/`)
au lieu de GitHub Releases. Le dossier `/var/www/ota/erp/` sur le VPS est deja servi
en HTTPS par nginx (meme vhost que les firmwares OTA tapis/multibat) et writable par
l'utilisateur `revaw` sans sudo.

```powershell
scp "src-tauri\target\release\bundle\nsis\Revaw ERP_X.Y.Z_x64-setup.exe" revaw@217.182.206.178:/var/www/ota/erp/
scp latest.json revaw@217.182.206.178:/var/www/ota/erp/latest.json
```

> Garde le meme nom de fichier (avec les espaces) cote local ; scp le transfere tel
> quel. L'URL dans `latest.json` doit correspondre exactement au nom deploye sur le
> VPS (avec `.` si tu choisis de renommer, sinon garde les espaces des deux cotes).

### 7. Verifier

```powershell
curl.exe -I https://ota.revaw.fr/erp/latest.json
```

Les utilisateurs ayant une version anterieure (deja buildee avec ce nouvel endpoint)
verront automatiquement une boite de dialogue au lancement de l'app leur proposant
la mise a jour.

---

## Rappels importants

- La signature est maintenant produite par le build lui-meme (`.sig` a cote de l'exe) : exe et signature sont toujours du meme build par construction.
- Ne jamais partager `private.key`. Si tu la perds, tu devras regenerer une paire de cles et tous les anciens clients ne pourront plus verifier les mises a jour.
- Le fichier `latest.json` n'est **pas** dans le repo (gitignore). Il est uploade uniquement sur le VPS.
- Si le workspace est deplace, purger `src-tauri/target` (`Remove-Item -Recurse -Force src-tauri\target`) : le cache Rust memorise des chemins absolus (vecu le 14/08/2026).
- **Migration GitHub -> VPS** : les clients deja installes en v0.4.0 (ou anterieur)
  ont l'ancien endpoint GitHub code en dur dans leur binaire. Ils ne verront **pas**
  les mises a jour publiees uniquement sur le VPS tant qu'ils n'auront pas installe
  manuellement une version buildee avec le nouvel endpoint. Prevoir une derniere
  publication sur GitHub Releases (pointant vers la 1ere version VPS) pour faire la
  bascule, ou reinstaller ces postes manuellement.
- Acces VPS : `ssh revaw@217.182.206.178` (cle SSH dediee ajoutee le 17/09/2026,
  pas de sudo sans mot de passe sur ce compte). Domaine `ota.revaw.fr`, certificat
  Let's Encrypt gere par Certbot. Config nginx : `/etc/nginx/sites-available/ota.revaw.fr`.
