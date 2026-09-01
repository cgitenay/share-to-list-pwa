# Partager vers ma liste (PWA Android)

Mini page web installable qui apparait dans le menu "Partager" natif
d'Android, et envoie le lien partage vers le relais Apps Script (voir
`../carrefour-liste-extension/apps-script/Code.gs`) au lieu de le retaper.

## Deploiement

Cette page doit etre servie en HTTPS pour etre installable (limite des
PWA - impossible de l'ouvrir en simple fichier local `file://`). Le plus
simple et gratuit : GitHub Pages.

1. Cree un depot GitHub (public ou prive), pousse le contenu de ce dossier.
2. Dans les parametres du depot, active "GitHub Pages" sur la branche
   utilisee (racine du dossier, ou `/docs` selon ta structure).
3. Recupere l'URL fournie (ex: `https://tonpseudo.github.io/ton-repo/`).

## Installation sur le telephone

1. Ouvre l'URL HTTPS dans Chrome sur ton telephone Android.
2. Menu Chrome (trois points) -> "Ajouter a l'ecran d'accueil" (ou la
   bannière d'installation automatique si Chrome la propose).
3. Ouvre l'appli une premiere fois, colle l'URL de ton relais Apps Script
   dans le champ propose, "Enregistrer" - elle est retenue sur ce telephone
   (`localStorage`, propre a cet appareil).
4. Depuis n'importe quelle appli (Instagram, TikTok, YouTube, navigateur...),
   utilise "Partager" sur une video/un lien -> choisis "Partager vers ma
   liste" dans la liste - le lien est envoye directement, sans repasser par
   l'extension a ce moment-la (il apparaitra "en attente" dans son popup au
   prochain sync).

## Limites

- Fonctionne uniquement sur Android (Chrome) : iOS Safari ne supporte pas
  l'API Web Share Target pour les PWA installees.
- L'URL du relais est stockee localement sur le telephone qui a installe la
  page - a reconfigurer si tu changes de telephone ou vides les donnees du
  site.
