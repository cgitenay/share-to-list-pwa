# Partager vers ma liste (PWA Android)

Mini page web installable qui apparait dans le menu "Partager" natif
d'Android : un lien de recette declenche l'extraction automatique des
ingredients (voir "Recettes" ci-dessous), un texte simple s'ajoute
directement a la liste de courses. Meme backend que l'extension
(Firestore) - voir `carrefour-liste-extension/FIREBASE_SETUP.md` pour la
mise en place du projet Firebase, commune aux deux.

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
   liste" dans la liste - l'appli tente d'extraire automatiquement le nom
   et les ingredients de la recette, puis ouvre un formulaire pour les
   revoir/completer avant d'enregistrer (voir "Recettes" ci-dessous).

## Recettes

Partager un lien (TikTok, YouTube, ou un site avec des donnees de recette
structurees comme Marmiton) ouvre un formulaire pre-rempli (nom +
ingredients, un par ligne, modifiables) - "Enregistrer" l'ajoute a "Mes
recettes". Chaque recette enregistree a un bouton "Ajouter a la liste de
courses" qui recopie tous ses ingredients dans la liste partagee. Une
recette peut aussi etre creee entierement a la main depuis "Mes recettes"
-> "+ Nouvelle recette".

**Mise en place obligatoire** : l'extraction depuis YouTube et les sites
de recettes passe par un petit relais Google Apps Script (une page web ne
peut pas lire le HTML d'un site externe directement - CORS - contrairement
a l'extension qui a une permission d'hote). TikTok fonctionne sans ce
relais (son oEmbed public autorise deja les appels cross-origin).

1. https://script.google.com/ -> Nouveau projet -> colle le contenu de
   `carrefour-liste-extension/apps-script/Code.gs`.
2. Deployer -> Nouveau deploiement -> type "Application Web" - Executer en
   tant que "Moi", acces "Tous".
3. Copie l'URL de deploiement fournie, colle-la dans `recipes.js`,
   constante `PROXY_URL` (remplace `TODO_APPS_SCRIPT_PROXY_URL`).

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
- La connexion utilise `signInWithPopup` (une fenetre popup Google) - non
  teste sur Safari iOS faute d'iPhone disponible ; les popups peuvent etre
  moins fiables que sur desktop selon la version d'iOS.
- L'extraction de recette est "au mieux" : TikTok/YouTube dependent de la
  legende/description fournie par le createur (voir les heuristiques dans
  `matcher.js`), les sites sans donnees structurees schema.org/Recipe ne
  renvoient aucun ingredient automatiquement - le formulaire s'ouvre vide
  dans ce cas, a completer a la main.
- **Confirme sur Android/Chrome** : Google bloque volontairement
  l'affichage de son ecran de connexion dans une PWA installee en mode
  standalone (mesure anti-phishing) - la page de connexion se coupe
  avant d'avoir fini de charger. La premiere connexion doit se faire
  dans un onglet Chrome normal (coller l'URL de la page, pas l'icone
  installee) ; l'app affiche desormais ce message si elle detecte le
  mode standalone. La session est ensuite retrouvee automatiquement
  dans l'app installee (meme profil Chrome, storage partage).
