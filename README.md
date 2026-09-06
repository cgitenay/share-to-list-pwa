# Partager vers ma liste (PWA Android)

Mini page web installable qui apparait dans le menu "Partager" natif
d'Android, et envoie le lien partage directement dans Firestore (meme
backend que l'extension) - voir
`carrefour-liste-extension/FIREBASE_SETUP.md` pour la mise en place du
projet Firebase, commune aux deux.

## Deploiement

Cette page doit etre servie en HTTPS pour etre installable (limite des
PWA - impossible de l'ouvrir en simple fichier local `file://`). Le plus
simple et gratuit : GitHub Pages.

1. Cree un depot GitHub (public ou prive), pousse le contenu de ce dossier.
2. Dans les parametres du depot, active "GitHub Pages" sur la branche
   utilisee (racine du dossier, ou `/docs` selon ta structure).
3. Recupere l'URL fournie (ex: `https://tonpseudo.github.io/ton-repo/`).
4. **Etape obligatoire** : dans la console Firebase -> Authentication ->
   Parametres -> "Domaines autorises", ajoute le domaine de cette URL
   (ex: `tonpseudo.github.io`) - sans ca, la connexion Google echoue avec
   une erreur `auth/unauthorized-domain`.

## Installation sur le telephone

1. Ouvre l'URL HTTPS dans Chrome sur ton telephone Android.
2. Menu Chrome (trois points) -> "Ajouter a l'ecran d'accueil" (ou la
   bannière d'installation automatique si Chrome la propose).
3. Ouvre l'appli une premiere fois, "Se connecter avec Google", puis cree
   ou rejoins un groupe (avec un code d'invitation genere depuis
   l'extension ou depuis cette meme page) - retenu sur ce telephone
   (`localStorage`, propre a cet appareil/navigateur).
4. Depuis n'importe quelle appli (Instagram, TikTok, YouTube, navigateur...),
   utilise "Partager" sur une video/un lien -> choisis "Partager vers ma
   liste" dans la liste - le lien est envoye directement dans Firestore
   (il apparaitra "en attente" dans le popup de l'extension au prochain
   sync).

## iPhone

Voir [README-ios.md](README-ios.md) : la consultation/l'ajout manuel
fonctionnent via cette meme PWA, le partage de lien passe par un
raccourci dans l'appli Raccourcis (iOS ne supporte pas le meme mecanisme
que Android).

## Limites

- Le partage direct depuis une appli tierce fonctionne uniquement sur
  Android (Chrome) : iOS Safari ne supporte pas l'API Web Share Target
  pour les PWA installees - voir README-ios.md pour l'equivalent iPhone.
- La connexion Google et le groupe actif sont retenus localement sur
  l'appareil (`localStorage`) - a refaire (connexion + selection du
  groupe) si tu changes de telephone/navigateur ou vides les donnees du
  site.
- `signInWithRedirect` a des bugs connus sous Safari iOS en PWA installee
  (cloisonnement de stockage ITP) - non teste faute d'iPhone disponible ;
  si la connexion echoue systematiquement sur iPhone, ouvrir la page dans
  Safari (hors PWA installee) en contournement possible.
- **Confirme sur Android/Chrome** : Google bloque volontairement
  l'affichage de son ecran de connexion dans une PWA installee en mode
  standalone (mesure anti-phishing) - la page de connexion se coupe
  avant d'avoir fini de charger. La premiere connexion doit se faire
  dans un onglet Chrome normal (coller l'URL de la page, pas l'icone
  installee) ; l'app affiche desormais ce message si elle detecte le
  mode standalone. La session est ensuite retrouvee automatiquement
  dans l'app installee (meme profil Chrome, storage partage).
