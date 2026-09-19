# Partager vers ma liste (iPhone)

iOS Safari ne supporte pas l'API Web Share Target utilisee sur Android
(la PWA ne peut pas s'inscrire dans le menu Partager natif). Le partage
passe donc par un raccourci de l'appli **Raccourcis**, qui ouvre la page
dans Safari avec le lien en parametre.

## 0. Configuration Google (une seule fois)

La connexion sur iPhone n'utilise pas la popup Firebase (bloquee par
Safari) mais une redirection directe vers Google. Il faut donc autoriser
l'adresse de la page :

1. Google Cloud Console -> APIs et services -> Identifiants -> ouvre le
   client OAuth "Application Web" utilise par l'extension
   (`56140235809-gu0ml3760...`).
2. "URI de redirection autorises" -> ajoute exactement :
   `https://cgitenay.github.io/share-to-list-pwa/` (avec le `/` final).
3. Enregistre (peut prendre quelques minutes a etre pris en compte).

## 1. Se connecter

**Important** : sur iPhone, une appli ajoutee a l'ecran d'accueil a un
stockage **completement separe de Safari** - se connecter dans Safari
puis installer l'appli ne transfere pas la session.

- **Dans Safari** : ouvre l'URL de la page, "Compte" -> "Se connecter avec
  Google". Tu es redirige vers Google puis ramene ici, connecte. La
  session est conservee par Safari.
- **Dans l'appli installee** : essaie "Se connecter avec Google". Si Google
  affiche une erreur (il refuse parfois de s'afficher dans une appli
  installee), ferme l'appli et utilise le transfert par code :
  1. Dans Safari, connecte-toi. Un "code de connexion" s'affiche dans
     "Compte" : bouton "Copier le code".
  2. Ouvre l'appli installee, "Compte" -> colle le code -> "Se connecter
     avec ce code". La session de l'appli est ensuite independante et
     persistante (le code, valable ~1 h, n'est utilise qu'une fois).

Utiliser Safari seul (sans installer l'appli) est la voie la plus simple
sur iPhone.

## 2. Partager un lien - via l'appli Raccourcis

1. Ouvre **Raccourcis** -> "+" (nouveau raccourci), nomme-le par exemple
   "Ajouter a ma liste".
2. Ajoute l'action **"Encoder l'URL"** (ou "URL Encode" ) sur l'**Entree
   du raccourci** (variable magique).
3. Ajoute l'action **"Texte"** avec :
   `https://cgitenay.github.io/share-to-list-pwa/?url=` suivi de la
   variable magique **"URL codee"** (resultat de l'action precedente).
4. Ajoute l'action **"Ouvrir les URL"** sur ce texte.
5. Reglages du raccourci (icone (i)) : active **"Afficher dans le
   partage"**, types acceptes : **URLs** et **Texte**.

Depuis TikTok/Instagram/YouTube/Safari, partage un lien -> choisis
"Ajouter a ma liste" -> Safari s'ouvre sur la page, qui extrait la recette
et ouvre le formulaire (il faut etre connecte dans **Safari** - voir
section 1 - et avoir choisi un groupe).

## Limites

- Le raccourci ouvre toujours Safari (iOS n'ouvre jamais une appli
  installee depuis un lien) : la connexion utilisee est donc celle de
  Safari, pas celle de l'appli installee.
- Safari peut effacer les donnees d'un site non utilise pendant ~7 jours
  (ITP) : il faudra alors se reconnecter.
- Non teste de bout en bout sur un iPhone par l'assistant : la redirection
  Google directe et le transfert par code reposent sur le comportement
  documente de Safari/WebKit.
