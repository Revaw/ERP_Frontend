# Guide de mise a jour - Revaw ERP

Depuis la v0.5.1, **GitHub Releases n'est plus utilise pour distribuer les mises
a jour** : tous les clients installes checkent desormais
`https://ota.revaw.fr/erp/latest.json` (notre VPS). Publier une mise a jour se
resume a : build local + `scp` vers le VPS. Pas de release GitHub, pas de tag
`vX.Y.Z` a creer sur GitHub.

> Rappel important : rien de tout ca n'est automatique. Pousser sur `main` ne
> declenche aucun build ni aucun upload — c'est un git push classique, pour la
> sauvegarde du code source uniquement. Chaque etape ci-dessous est manuelle.

## Prerequis

- `private.key` a la racine du projet (ne jamais la committer)
- Mot de passe de la cle : `XXXX`
- Acces SSH au VPS : `ssh revaw@217.182.206.178` (cle SSH dediee, voir
  "Rappels importants" en bas de page)

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

### 3. Commit et push (sauvegarde du code, pas une publication)

```bash
git add .
git commit -m "chore: release vX.Y.Z"
git push
```

> Ce push ne publie rien pour les utilisateurs — c'est juste GitHub comme
> hebergeur de code source. La publication reelle se fait aux etapes 6-7.

### 4. Build l'application (signature integree)

> Depuis la v0.4.0, la signature se fait PENDANT le build (option
> `createUpdaterArtifacts` du tauri.conf.json) : plus d'etape de signature
> manuelle, et il est impossible de signer un exe d'un autre build.

> ⚠️ **Verifie AVANT de builder** qu'un fichier `.env.production` existe a la
> racine (avec le point au debut — pas `env.production`), avec la bonne
> `VITE_API_URL`. Sans lui, le build embarque silencieusement
> `http://localhost:3000` comme backend (aucune erreur au build, juste une app
> qui ne se connecte a rien une fois installee — vecu le 17/09/2026 sur la
> v0.5.0, corrige en v0.5.1). Verification rapide apres build :
> ```powershell
> Select-String -Path "dist\assets\*.js" -Pattern "localhost:3000"
> ```
> Si ca remonte un resultat, le mauvais backend est embarque : ne PAS publier.

Dans le terminal, definir la cle puis builder :

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content "private.key" -Raw
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "mot de passe de la cle"
npm run tauri:build
```

Resultat dans `src-tauri/target/release/bundle/nsis/` :

- `Revaw ERP_X.Y.Z_x64-setup.exe` — l'installateur
- `Revaw ERP_X.Y.Z_x64-setup.exe.sig` — la signature (contenu a coller dans latest.json)

> Si le build echoue avec "private key not found" : les variables `$env:`
> ci-dessus manquent dans le terminal courant.
> Si le build echoue plus tot (`cargo metadata: program not found`,
> `link.exe not found`, ou une popup Windows "strategie de controle
> d'application a bloque ce fichier") : voir la memoire `tauri-build-gotchas`
> (Rust/MSVC Build Tools absents, ou Smart App Control actif) — deja rencontre
> et resolu le 17/09/2026, pas la peine de repartir de zero.

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

### 6. Uploader sur le VPS (ota.revaw.fr) — remplace la release GitHub

Depuis la v0.5.1, c'est la **seule** etape de publication : plus de release
GitHub a creer. Le dossier `/var/www/ota/erp/` sur le VPS est deja servi en
HTTPS par nginx (meme vhost que les firmwares OTA tapis/multibat) et writable
par l'utilisateur `revaw` sans sudo.

Renomme le fichier local (espaces -> points) **au moment du scp**, pour que le
nom deploye corresponde exactement a l'`url` mise dans `latest.json` :

```powershell
scp "src-tauri\target\release\bundle\nsis\Revaw ERP_X.Y.Z_x64-setup.exe" revaw@217.182.206.178:/var/www/ota/erp/Revaw.ERP_X.Y.Z_x64-setup.exe
scp latest.json revaw@217.182.206.178:/var/www/ota/erp/latest.json
```

> `latest.json` local (racine du projet) sert uniquement de brouillon de
> travail — c'est le fichier uploade sur le VPS qui fait foi. Pas besoin de
> le garder en `.exe avec espaces` cote VPS : les anciens `.exe` de versions
> precedentes restent dans le dossier sans gener (inoffensifs, juste pas
> references par le `latest.json` courant) ; tu peux les supprimer de temps
> en temps si tu veux faire le menage (`ssh revaw@217.182.206.178 "rm
> /var/www/ota/erp/Revaw.ERP_ANCIENNE-VERSION_x64-setup.exe"`).

### 7. Verifier

```powershell
curl.exe -s https://ota.revaw.fr/erp/latest.json
curl.exe -sI https://ota.revaw.fr/erp/Revaw.ERP_X.Y.Z_x64-setup.exe
```

Confirme que le `version` dans le JSON est bien la nouvelle, et que le `curl -I`
sur l'exe renvoie `200 OK`. Les utilisateurs verront automatiquement une boite
de dialogue au lancement de l'app leur proposant la mise a jour.

---

## Rappels importants

- **Rien n'est automatique.** Un `git push` sur `main` ne build rien et ne publie
  rien. La seule facon de faire recevoir une mise a jour aux utilisateurs, c'est
  de terminer les etapes 4 a 7 (build + scp) jusqu'au bout.
- La signature est maintenant produite par le build lui-meme (`.sig` a cote de l'exe) : exe et signature sont toujours du meme build par construction.
- Ne jamais partager `private.key`. Si tu la perds, tu devras regenerer une paire de cles et tous les anciens clients ne pourront plus verifier les mises a jour.
- Le fichier `latest.json` n'est **pas** dans le repo (gitignore). Il est uploade uniquement sur le VPS.
- Si le workspace est deplace, purger `src-tauri/target` (`Remove-Item -Recurse -Force src-tauri\target`) : le cache Rust memorise des chemins absolus (vecu le 14/08/2026).
- **Historique migration GitHub -> VPS (terminee le 17/09/2026)** : jusqu'a la
  v0.4.0, l'updater pointait vers GitHub Releases. La v0.5.1 a fait basculer
  tous les clients vers le VPS et a ete la derniere version publiee sur GitHub
  Releases. Si un jour un poste tourne encore en v0.4.0 ou anterieur (ancien
  PC jamais mis a jour, reinstallation d'un vieux setup...), il faudra soit le
  mettre a jour manuellement (reinstaller un exe recent), soit repasser
  ponctuellement par une release GitHub comme bascule — mais ce n'est plus le
  fonctionnement normal.
- Acces VPS : `ssh revaw@217.182.206.178` (cle SSH dediee ajoutee le 17/09/2026,
  pas de sudo sans mot de passe sur ce compte). Domaine `ota.revaw.fr`, certificat
  Let's Encrypt gere par Certbot. Config nginx : `/etc/nginx/sites-available/ota.revaw.fr`.
- Prerequis machine de build (Windows) : Rust/Cargo + MSVC Build Tools
  ("Developpement Desktop en C++") installes, et **Smart App Control desactive**
  (sinon il bloque l'execution des build scripts Rust non signes). A verifier
  une fois par machine de dev, pas a chaque release.
