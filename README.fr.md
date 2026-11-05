# aes512

[![npm version](https://img.shields.io/npm/v/aes512.svg)](https://www.npmjs.com/package/aes512)
[![CI](https://github.com/alphaleadership/nmod/actions/workflows/ci.yml/badge.svg)](https://github.com/alphaleadership/nmod/actions/workflows/ci.yml)

Boîte à outils de chiffrement **AES-256-GCM authentifié** pour Node.js : clés, chaînes, fichiers (streaming), hachage et lecture du format v1 hérité.

- **Chiffrement authentifié** — une mauvaise clé ou toute altération est détectée, jamais corrompue en silence.
- **Zéro dépendance** — repose uniquement sur `node:crypto` / `node:fs`.
- **Chiffrement de fichiers en streaming** — les gros fichiers sont traités par blocs, écrits de façon atomique (fichier temporaire + renommage).
- **TypeScript** — déclarations de types fournies.
- **ESM** — nécessite Node.js ≥ 22.12.

> Documentation aussi disponible en [anglais](./README.md).

## Installation

```bash
npm install aes512
```

## Démarrage rapide

```js
import {
  generateKey, Cipher, encrypt, decrypt,
  encryptFile, decryptFile, hash, hashFile, listFiles,
} from 'aes512';

// 1. Clés
const passphrase = generateKey();            // chaîne base64url aléatoire (32 octets d'entropie)
const rawKey = new Uint8Array(32);           // 32 octets bruts = chemin rapide (sans KDF)

// 2. Chaînes / buffers
const blob = encrypt('Top secret 🤫', passphrase);
const plain = decrypt(blob, passphrase);     // Buffer('Top secret 🤫')

// 3. Fichiers (streaming, atomique)
await encryptFile('rapport.pdf', passphrase);          // -> rapport.pdf.enc
await decryptFile('rapport.pdf.enc', passphrase);      // -> rapport.pdf (refuse d'écraser sans { overwrite: true })

// 4. Hachage
hash('abc', 'sha256');                       // empreinte hexadécimale
await hashFile('rapport.pdf', 'blake2b512');

// 5. Utilitaires
listFiles('./data');                         // trié, récursif, sans bruit console
```

## API

### `generateKey(bytes = 32): string`

Retourne une chaîne `base64url` cryptographiquement aléatoire représentant `bytes` octets (16–4096). À utiliser comme passphrase.

### Règles de gestion des clés

| Type de clé | Comportement |
| --- | --- |
| `string` | Traité comme une **passphrase** : dérivée avec **scrypt** à partir d'un sel aléatoire de 16 octets stocké dans chaque en-tête (coût réglable via `new Cipher(pass, { scrypt: { logN } })`). |
| `Uint8Array` de exactement 32 octets | Utilisé **directement** comme clé AES-256 (chemin rapide, sans KDF). |
| tout autre type | Lève `InvalidKeyError`. |

### `new Cipher(key, options?)`

- `encrypt(data: string | Uint8Array): Buffer` — retourne la trame v2 (en-tête + texte chiffré + tag d'authentification).
- `decrypt(data: Uint8Array): Buffer` — lève `DecryptionError` en cas de mauvaise clé/altération, `FormatError` pour des données étrangères.
- `encryptFile(src, dest?, { overwrite }?): Promise<string>` — destination par défaut : `src + '.enc'`.
- `decryptFile(src, dest?, { overwrite }?): Promise<string>` — destination par défaut : `src` sans `.enc` (ou `src + '.dec'`).

Équivalents autonomes : `encrypt(data, key, options?)`, `decrypt(blob, key, options?)`, `encryptFile(src, key, dest?, options?, cipherOptions?)`, `decryptFile(src, key, dest?, options?)`.

### `hash(data, algorithm = 'sha256'): string` · `hashFile(path, algorithm?): Promise<string>`

Algorithmes : `sha256` (défaut), `sha512`, `blake2b512`. Retourne une empreinte hexadécimale minuscule.

### `listFiles(dir, { recursive = true }): string[]`

Liste récursivement les fichiers (triée, déterministe). Les répertoires symboliques ne sont pas suivis. Ne journalise jamais sur la console.

### Héritage v1

Les fichiers chiffrés en **v1** (paquet `aes256`, AES-256-CTR) restent lisibles :

```js
import { decryptV1, decryptV1File } from 'aes512';

const ancien = decryptV1(bufferOuBase64V1, 'ancienne-passphrase');
await decryptV1File('legacy.dat', 'ancienne-passphrase', 'legacy.out');
```

> v1 utilisait du CTR non authentifié : une mauvaise clé produit du contenu illisible au lieu d'une erreur. Préférez v2 pour tout nouveau projet.

### Erreurs

Toutes les erreurs héritent de `NmodError` et portent un `code` :

| Classe | Code | Signification |
| --- | --- | --- |
| `DecryptionError` | `DECRYPT_FAILED` | Mauvaise clé, texte chiffré altéré ou tronqué (échec du tag GCM). |
| `FormatError` | `BAD_FORMAT` | Pas des données nmod v2 (magic/version/taille invalide). |
| `InvalidKeyError` | `INVALID_KEY` | Clé/passphrase malformée transmise à l'API. |
| `AlgorithmError` | `BAD_ALGORITHM` | Algorithme de hachage non pris en charge. |
| `FileExistsError` | `EEXIST` | La destination existe et `overwrite: true` n'a pas été fourni. |
| `NmodError` | `ENOENT` | Fichier/dossier source illisible. |

## Format de fichier (v2)

| Champ | Taille | Contenu |
| --- | --- | --- |
| magic | 4 | ASCII `NMOD` |
| version | 1 | `2` |
| flags | 1 | bit 0 = KDF scrypt utilisé |
| salt | 16 | sel scrypt (aléatoire, zéro pour les clés brutes) |
| logN, r, p | 3 | paramètres de coût scrypt |
| IV | 12 | nonce GCM |
| texte chiffré | * | texte chiffré AES-256-GCM |
| tag | 16 | tag d'authentification GCM |

Surcoût total : **53 octets**.

## Notes de sécurité

- Le chiffrement est **authentifié** (AES-256-GCM) : mauvaises clés et altérations sont rejetées avant toute écriture de sortie.
- Les écritures sont **atomiques** : la sortie passe par un fichier temporaire dans le dossier de destination puis un renommage ; en cas d'échec, le temporaire est supprimé et les fichiers existants ne sont jamais touchés.
- Rien n'est écrasé sans `{ overwrite: true }`.
- Préférez les clés aléatoires de `generateKey()` ; si vous choisissez votre propre passphrase, faites-la longue — ralentit les attaques par force brute, mais ne peut pas corriger un secret faible.

## Migration depuis v1

| v1 | v2 |
| --- | --- |
| `createCipher(key).cryptfiles(path)` (sur place) | `encryptFile(path, key)` (écrit `path.enc`, source intacte) |
| `createCipher(key).decryptfiles(path)` | `decryptFile(path.enc, key)` |
| `cipher.crypt(data)` / `cipher.decrypt(data)` | `encrypt(data, key)` / `decrypt(blob, key)` |
| `getkey(length)` (`Math.random` faible) | `generateKey(bytes)` (`crypto.randomBytes`) |
| classe `hash` (AES itéré) | `hash(data, 'sha256' \| 'sha512' \| 'blake2b512')` |
| `dir(path)` | `listFiles(path)` |
| chiffrés v1 | `decryptV1` / `decryptV1File` |

Les anciens chiffrés v1 ne sont **pas** lisibles par `decrypt` — utilisez les helpers `decryptV1*`.

## Développement

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # node --test (44 tests)
npm run build       # bundle esbuild + déclarations de types
npm run demo        # examples/basic.mjs sur le build
```

## Licence

MIT
