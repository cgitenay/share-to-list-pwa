# Partager vers ma liste (iPhone)

iOS Safari ne supporte pas l'API Web Share Target utilisee pour Android
(la PWA ne peut pas s'inscrire dans le menu Partager natif). Deux
mecanismes distincts couvrent les memes besoins sur iPhone :

- **Consulter la liste / ajouter un article a la main** -> la PWA
  existante (`index.html`), qui fonctionne sans aucune modification.
- **Partager un lien (TikTok/Instagram/YouTube) en un tap** -> un
  raccourci dans l'appli **Raccourcis**, native a iOS.

## 1. Consulter la liste / ajouter un article - via la PWA

1. Ouvre l'URL HTTPS de la PWA (meme lien que pour Android) dans Safari.
2. Bouton Partager de Safari -> "Sur l'ecran d'accueil".
3. Ouvre l'appli une premiere fois, colle l'URL de ton relais Apps Script
   dans le champ propose, "Enregistrer" - retenue sur cet iPhone
   (`localStorage`, propre a cet appareil).
4. "Ma liste actuelle" (bouton Actualiser) et "Ajouter un article"
   fonctionnent normalement, identiques a la version Android.

## 2. Partager un lien - via l'appli Raccourcis

L'appli Raccourcis (deja installee sur tout iPhone) peut apparaitre dans
le menu Partager systeme de n'importe quelle appli, et appeler
directement le relais - sans les soucis de CORS rencontres cote
navigateur (Raccourcis n'est pas un navigateur, aucune restriction CORS
ne s'applique a ses requetes).

### Construction du raccourci

1. Ouvre l'appli **Raccourcis** -> onglet Raccourcis -> "+" (nouveau
   raccourci).
2. Renomme-le, par exemple "Ajouter a ma liste" (icone/nom en haut).
3. Ajoute l'action **"URL"** (rechercher "URL" dans la liste d'actions) :
   - Dans son champ, saisis : `TON_URL_DE_RELAIS?action=add&type=link&content=`
     (remplace `TON_URL_DE_RELAIS` par l'URL de ton Web App Apps Script,
     identique a celle configuree dans l'extension).
4. Juste apres, insere la **"Entree du raccourci"** (variable magique,
   icone bleue en bas du clavier) a la fin de cette meme URL - c'est elle
   qui contiendra le lien partage. Le resultat doit ressembler a une
   seule ligne : `https://.../exec?action=add&type=link&content=` suivi
   du chip "Entree du raccourci".
5. Ajoute l'action **"Obtenir le contenu de l'URL"** : methode **GET**,
   URL = le resultat de l'action precedente (elle devrait etre
   selectionnee automatiquement, sinon choisis-la via la variable
   magique).
6. (Optionnel) Ajoute **"Afficher une notification"** avec un texte du
   type "Envoye a la liste !", pour avoir une confirmation visuelle.
7. Termine, puis ouvre les **reglages du raccourci** (icone (i) ou
   trois points) :
   - Active **"Afficher dans le partage"**.
   - Types de contenu accepte : coche **URLs** et **Texte**.
8. Enregistre.

### Utilisation

Depuis TikTok/Instagram/YouTube/Safari, partage un lien -> le raccourci
"Ajouter a ma liste" apparait dans la feuille de partage -> le lien est
envoye directement au relais, sans repasser par l'extension a ce
moment-la (il apparaitra "en attente" dans son popup au prochain sync,
exactement comme sur Android).

## Limites

- Deux mecanismes separes (PWA pour consulter/ajouter, Raccourcis pour
  partager) plutot qu'une seule appli comme sur Android - consequence de
  la limite iOS sur les PWA, pas contournable autrement sans publier une
  vraie application sur l'App Store.
- L'URL du relais est saisie deux fois (une fois dans la PWA, une fois en
  dur dans le raccourci) - a mettre a jour aux deux endroits si tu
  redeployes un nouveau relais.
- Non teste sur un appareil physique au moment de la redaction (pas de
  Mac/iPhone disponibles) - instructions basees sur le comportement
  documente et stable de Raccourcis depuis plusieurs versions d'iOS. A
  valider sur un vrai iPhone (ou via un service de test a distance type
  BrowserStack) avant de considerer ce chemin comme fiable.
