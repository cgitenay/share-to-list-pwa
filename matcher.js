// Scoring texte simple (coefficient de Dice sur tokens normalises).
// Partage entre content.js et, potentiellement, un futur script Playwright.

const DIACRITICS_RE = new RegExp(
  "[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]",
  "g"
);

// Unicode NFD ne decompose pas les ligatures francaises (oe, ae) car ce
// sont des lettres a part entiere, pas des compositions accentuees : il
// faut les depiler a la main avant le reste, sinon "œufs" ("oeufs"
// ecrit avec la ligature) ne matche jamais la requete "oeuf".
const LIGATURES_RE = new RegExp(String.fromCharCode(0x0153), "g"); // œ (oe)
const LIGATURES_UPPER_RE = new RegExp(String.fromCharCode(0x0152), "g"); // Œ (OE)

// Racinisation minimale : "oeuf" doit matcher "oeufs", "carotte" doit
// matcher "carottes", etc. Sans ca, une requete au singulier ne trouve
// jamais un titre ecrit au pluriel (cas frequent sur les fiches produit).
function stemToken(tok) {
  if (tok.length > 3 && (tok.endsWith("s") || tok.endsWith("x"))) {
    return tok.slice(0, -1);
  }
  return tok;
}

function normalizeText(str) {
  return str
    .replace(LIGATURES_UPPER_RE, "Oe")
    .replace(LIGATURES_RE, "oe")
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS_RE, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(stemToken)
    .filter((tok) => !STOPWORDS.has(tok));
}

const STOPWORDS = new Set([
  "de", "du", "des", "le", "la", "les", "un", "une", "et", "en", "au", "aux",
]);

function matchScore(query, candidate) {
  const a = new Set(normalizeText(query));
  const b = new Set(normalizeText(candidate));
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const tok of a) {
    if (b.has(tok)) intersection++;
  }
  return (2 * intersection) / (a.size + b.size);
}

// Unites mesurables convertibles en grammes/millilitres, pour pouvoir
// comparer une quantite d'ingredient (ex: "300 g") au conditionnement du
// produit trouve sur Carrefour plutot que de l'utiliser comme nombre
// d'unites a acheter directement.
const MEASURABLE_UNITS = {
  kg: { mass: true, factor: 1000 },
  g: { mass: true, factor: 1 },
  l: { mass: false, factor: 1000 },
  cl: { mass: false, factor: 10 },
  ml: { mass: false, factor: 1 },
};

// Les recettes ecrivent parfois l'unite en toutes lettres ("500 grammes
// de farine") plutot qu'en abrege ("500 g") - on normalise les deux.
function normalizeUnit(raw) {
  const u = raw.toLowerCase();
  if (u === "g" || u.startsWith("gramme")) return "g";
  if (u === "kg" || u.startsWith("kilogramme") || u.startsWith("kilo")) return "kg";
  if (u === "l" || u.startsWith("litre")) return "l";
  if (u === "cl" || u.startsWith("centilitre")) return "cl";
  if (u === "ml" || u.startsWith("millilitre")) return "ml";
  return null;
}

// Unites non mesurables (pas de conditionnement comparable) mais a
// retirer quand meme du texte de recherche et de la liste affichee -
// sinon la recherche Carrefour part sur des resultats incoherents (ex:
// "2 pincees de sel"). Les formes accentuees ET non-accentuees sont
// couvertes (le texte des recettes garde ses accents, contrairement au
// texte deja normalise par normalizeText()).
const DESCRIPTIVE_UNIT_RE = new RegExp(
  "^(?:" +
    "cuill(?:è|e)res? (?:à|a) soupe|" +
    "cuill(?:è|e)res? (?:à|a) caf(?:é|e)|" +
    "cuiller(?:é|e)es?|" +
    "cuill(?:è|e)res?|" +
    // Abreviations courantes, y compris les formes hybrides ("c." abrege
    // mais "soupe"/"cafe" en entier) : "c. à s.", "c à s", "c.à.s", "càs",
    // "c. à soupe", "c a cafe" (idem cafe).
    "c\\.?\\s*(?:à|a)\\.?\\s*soupe|" +
    "c\\.?\\s*(?:à|a)\\.?\\s*caf(?:é|e)|" +
    "c\\.?\\s*(?:à|a)\\.?\\s*s\\.?|" +
    "c\\.?\\s*(?:à|a)\\.?\\s*c\\.?|" +
    "cas|" +
    "cac|" +
    "pinc(?:é|e)es?|" +
    "gousses?|" +
    "sachets?|" +
    "tranches?|" +
    "branches?|" +
    "feuilles?|" +
    "brins?|" +
    "bottes?|" +
    "bo(?:î|i)tes?|" +
    "bocaux|" +
    "bocals?|" +
    "pots?|" +
    "paquets?|" +
    "verres?|" +
    "traits?" +
    // (?:\s+|$) plutot que \b : \b en JS ignore les lettres accentuees
    // (considerees "non-mot"), ce qui coupait le match juste apres un
    // "e"/"é" final (ex: ne gardait que "cuillère" et loupait "à café").
    ")(?:\\s+|$)",
  "i"
);

// En boucle : "de d'orzos" a deux articles empiles ("de" puis "d'"), un
// seul passage laisserait "d'orzos". Les deux formes d'apostrophe (droite
// et typographique/courbe) sont couvertes - le texte de recettes utilise
// souvent la courbe (’), ecrite differemment de l'apostrophe droite (').
const LEADING_ARTICLE_RE = /^(de |d['’]|du |des |la |le |les |l['’])/i;

function stripLeadingArticle(str) {
  let result = str.trim();
  let previous;
  do {
    previous = result;
    result = result.replace(LEADING_ARTICLE_RE, "").trim();
  } while (result !== previous);
  return result;
}

// Adjectifs d'etat de preparation ("beurre fondu", "oignon emince",
// "tomates pelees") : ca ne se vend pas ainsi en rayon, seul le nom brut
// de l'ingredient est cherchable. On ne retire que des mots explicitement
// listes (pas "le dernier mot" en general) pour ne pas casser des noms de
// produits ou l'adjectif fait partie du produit (ex: "chocolat noir",
// "beurre demi-sel").
const PREP_ADJECTIVE_BASES = [
  "fondu", "hache", "haché", "emince", "émincé", "rape", "râpé", "coupe", "coupé",
  "tranche", "tranché", "pele", "pelé", "epluche", "épluché", "concasse", "concassé",
  "ecrase", "écrasé", "moulu", "battu", "tamise", "tamisé", "ramolli", "clarifie", "clarifié",
  "egoutte", "égoutté", "cuit", "lave", "lavé", "cisele", "ciselé", "effeuille", "effeuillé",
  "equeute", "équeuté", "denoyaute", "dénoyauté", "desosse", "désossé", "reduit", "réduit",
  "refroidi", "epepine", "épépiné", "blanchi", "mixe", "mixé", "melange", "mélangé", "petit",
  "fouette", "fouetté", "grand",
];

// Formes irregulieres qui ne suivent pas le schema base+e?s? (ex: mou ->
// molle, pas "moue" ; gros -> grosse, pas "grose" ; moyen -> moyenne avec
// un n double, pas "moyene").
const PREP_ADJECTIVE_IRREGULAR = [
  "mou", "molle", "mous", "molles",
  "gros", "grosse", "grosses",
  "moyen", "moyenne", "moyens", "moyennes",
];

// Adverbes de preparation courants ("finement", "fraichement"...). Liste
// explicite plutot qu'une regle generale sur la terminaison "-ment" : des
// noms d'ingredients (piment, froment, aliment) se terminent aussi ainsi.
const PREP_ADVERBS = [
  "finement", "grossierement", "grossièrement", "delicatement", "délicatement",
  "rapidement", "legerement", "légèrement", "fraichement", "fraîchement",
  "soigneusement", "doucement", "genereusement", "généreusement", "uniformement",
  "uniformément",
];

const PREP_ADJECTIVE_SET = new Set(
  PREP_ADJECTIVE_BASES
    .flatMap((w) => [w, w + "e", w + "s", w + "es"])
    .concat(PREP_ADJECTIVE_IRREGULAR)
    .concat(PREP_ADVERBS)
);

// Filtre mot par mot plutot qu'un retrait en fin de phrase seulement :
// l'adjectif n'est pas toujours le dernier mot (ex: "beurre mou
// demi-sel", ou "demi-sel" est un vrai descripteur produit qui doit
// rester apres "mou").
function stripPrepAdjective(name) {
  const tokens = name.trim().split(/\s+/);
  const filtered = tokens.filter((tok) => !PREP_ADJECTIVE_SET.has(tok.toLowerCase()));
  const result = filtered.join(" ").trim();
  return result || name.trim();
}

function parseUnitAmount(numStr) {
  return parseFloat(numStr.replace(",", "."));
}

// Retire une note de preparation en fin de nom apres une virgule
// ("echalote, finement" -> "echalote", "oignon, emince et hache" ->
// "oignon") quand ce qui suit la derniere virgule est court - trop long
// pour etre une simple note, on ne touche a rien pour eviter de casser un
// vrai nom d'ingredient contenant une virgule.
function stripTrailingNote(name) {
  const idx = name.lastIndexOf(",");
  if (idx === -1) return name;
  const before = name.slice(0, idx).trim();
  const after = name.slice(idx + 1).trim();
  if (!before) return name;
  return after.length <= 25 ? before : name;
}

// Retire les emojis/smileys ou qu'ils soient dans le texte (pas
// seulement en tete) - frequents dans les legendes de recettes ("Persil
// 🌿", "Linguine 🍝").
const EMOJI_RE = /\p{Extended_Pictographic}/gu;

function stripEmoji(str) {
  return str.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

// Retire tout ce qui est entre parentheses (note/commentaire de l'auteur
// - "de xérès, idéalement", "même rassis"...), y compris une parenthese
// ouvrante jamais refermee.
function stripParentheses(str) {
  return str.replace(/\([^)]*\)?/g, " ").replace(/\s+/g, " ").trim();
}

// Pipeline complet de nettoyage d'un nom d'ingredient brut, applique de
// facon identique dans toutes les branches de parseListLine.
function finalizeName(raw) {
  return stripEmoji(stripParentheses(stripTrailingNote(stripPrepAdjective(stripLeadingArticle(raw)))));
}

// "2x lait demi-ecreme" -> quantite explicite fixee par l'utilisateur.
// "300 g de farine" -> quantite mesurable, comparee plus tard au
// conditionnement du produit trouve (voir parsePackSize).
// "3 oeufs" -> compte nu, comparable au conditionnement s'il est aussi
// exprime en nombre d'unites (ex: "6 oeufs").
// "7 à 8 tomates" -> fourchette, on retient la borne haute comme compte.
// Dans tous les cas la quantite/unite est retiree du texte de recherche.
function parseListLine(line) {
  const trimmed = line.trim();

  const range = trimmed.match(/^(\d+)\s*(?:à|a)\s*(\d+)\s+(.+)$/i);
  if (range) {
    const name = finalizeName(range[3]);
    return {
      quantity: 1,
      name: name || trimmed,
      neededGrams: null,
      neededMl: null,
      neededCount: parseInt(range[2], 10),
    };
  }

  // "3/4 de litre de lait" -> fraction d'une unite mesurable, convertie
  // en decimal (0.75 L). "1/2 courgette" -> pas d'unite mesurable apres
  // la fraction : impossible d'acheter une demi-courgette, donc quantite
  // 1 (achete l'unite entiere), on jette juste la fraction pour ne pas
  // polluer la recherche ("/2 courgette" sinon).
  const fraction = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/);
  if (fraction) {
    const decimalValue = parseInt(fraction[1], 10) / parseInt(fraction[2], 10);
    const afterFraction = fraction[3].match(/^(?:de |d['’])?([^\s]+)\s*(.*)$/i);
    const unitAfterFraction = afterFraction ? normalizeUnit(afterFraction[1]) : null;

    if (afterFraction && unitAfterFraction) {
      const unit = MEASURABLE_UNITS[unitAfterFraction];
      const amount = decimalValue * unit.factor;
      const name = finalizeName(afterFraction[2]);
      return {
        quantity: 1,
        name: name || trimmed,
        neededGrams: unit.mass ? amount : null,
        neededMl: unit.mass ? null : amount,
        neededCount: null,
      };
    }

    const name = finalizeName(fraction[3]);
    return { quantity: 1, name: name || trimmed, neededGrams: null, neededMl: null, neededCount: null };
  }

  const explicit = trimmed.match(/^(\d+)\s*[xX]\s*(.+)$/);
  if (explicit) {
    return {
      quantity: parseInt(explicit[1], 10),
      name: finalizeName(explicit[2].trim()),
      neededGrams: null,
      neededMl: null,
      neededCount: null,
    };
  }

  const measurable = trimmed.match(/^([\d.,]+)\s*([^\s]+)\s*(.*)$/);
  const measurableUnit = measurable ? normalizeUnit(measurable[2]) : null;
  if (measurable && measurableUnit) {
    const unit = MEASURABLE_UNITS[measurableUnit];
    const amount = parseUnitAmount(measurable[1]) * unit.factor;
    const name = finalizeName(measurable[3]);
    return {
      quantity: 1,
      name: name || trimmed,
      neededGrams: unit.mass ? amount : null,
      neededMl: unit.mass ? null : amount,
      neededCount: null,
    };
  }

  const numbered = trimmed.match(/^(\d+)\s*(.+)$/);
  if (numbered) {
    const rest = numbered[2];
    if (DESCRIPTIVE_UNIT_RE.test(rest)) {
      const name = finalizeName(rest.replace(DESCRIPTIVE_UNIT_RE, ""));
      return { quantity: 1, name: name || trimmed, neededGrams: null, neededMl: null, neededCount: null };
    }
    return {
      quantity: 1,
      name: finalizeName(rest.trim()),
      neededGrams: null,
      neededMl: null,
      neededCount: parseInt(numbered[1], 10),
    };
  }

  return { quantity: 1, name: finalizeName(trimmed), neededGrams: null, neededMl: null, neededCount: null };
}

// Retire une unite non mesurable ("2 cuilleres a soupe de", "1 pincee
// de") d'une ligne de liste, pour nettoyer l'affichage lui-meme (pas
// seulement la recherche interne). Garde intactes les quantites
// mesurables (g/ml) et les comptes nus ("3 oeufs"), utiles a l'affichage
// et a la verification de conditionnement.
function stripDescriptiveUnit(line) {
  const trimmed = line.trim();

  const measurable = trimmed.match(/^([\d.,]+)\s*([^\s]+)\s*(.*)$/);
  const measurableUnit = measurable ? normalizeUnit(measurable[2]) : null;
  if (measurable && measurableUnit) {
    const cleanedName = finalizeName(measurable[3]);
    return cleanedName ? measurable[1] + " " + measurable[2] + " de " + cleanedName : trimmed;
  }

  const numbered = trimmed.match(/^(\d+)\s*(.+)$/);
  if (!numbered) return finalizeName(trimmed);

  const rest = numbered[2];
  if (!DESCRIPTIVE_UNIT_RE.test(rest)) return finalizeName(trimmed);

  const name = finalizeName(rest.replace(DESCRIPTIVE_UNIT_RE, ""));
  return name || trimmed;
}

// Extrait une liste d'ingredients depuis un texte libre (legende de
// video Instagram/TikTok/YouTube, sans donnees structurees) : cherche une
// ligne-titre "Ingredients", puis collecte les lignes suivantes jusqu'a
// la premiere ligne vide. Retire les puces/emojis en tete de ligne.
function extractIngredientsMultiline(text) {
  const lines = text.split(/\r?\n/);
  const stripBullet = (s) => s.replace(/^[^\p{L}\p{N}]+/u, "").trim();

  const headerIdx = lines.findIndex((l) => {
    const cleaned = stripBullet(l);
    return cleaned.length < 40 && /ingr[ée]dients?/i.test(cleaned);
  });
  if (headerIdx === -1) return null;

  const result = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) {
      if (result.length > 0) break; // ligne vide apres le debut de la liste = fin de section
      continue; // lignes vides entre le titre et le premier ingredient
    }

    // Une formule de cloture (suggestion d'accompagnement, appel a
    // s'abonner, bio de l'auteur...) peut arriver SUR LA MEME LIGNE que
    // le dernier ingredient, sans saut de ligne ni ligne vide avant elle
    // (frequent sur TikTok). On coupe au bon endroit dans la ligne plutot
    // que de tout jeter ou tout garder.
    const cut = findSectionEndCut(raw);
    if (cut !== -1) {
      const before = stripBullet(raw.slice(0, cut).trim());
      if (before) result.push(before);
      break;
    }

    const cleaned = stripBullet(raw);
    if (cleaned) result.push(cleaned);
  }
  return result.length > 0 ? result : null;
}

// Certaines plateformes (le champ "title" de l'oEmbed TikTok, entre
// autres) renvoient la legende sans aucun retour a la ligne : tout est
// aplati sur une seule ligne. On cherche alors "Ingredients" comme
// marqueur inline, on saute une eventuelle mention "(4 personnes)" et un
// separateur (":"/"-"), puis on coupe a la premiere section suivante
// (Instructions/Preparation/etapes/hashtags) et on decoupe sur les
// virgules, seul separateur disponible dans ce format a plat.
// Formules de cloture courantes en plus des sections d'etapes : sur
// TikTok en particulier, la preparation est souvent montree dans la
// video sans texte dedie, seule une formule de cloture separe la liste
// d'ingredients du reste ("Sel, poivre Bon appetit ! #recette").
const SECTION_END_MARKERS = [
  "instructions", "préparation", "preparation", "étapes", "etapes",
  // "bon app" plutot que "bon appétit" en entier : couvre aussi la forme
  // abregee courante sur les reseaux sociaux ("bon app' !").
  "bon app", "bonne dégustation", "bonne degustation",
  "régalez-vous", "regalez-vous",
  // Suggestions d'accompagnement ("tu peux l'accompagner de riz...") :
  // signale la fin des ingredients requis, la suite est optionnelle.
  "tu peux l'accompagner", "tu peux l’accompagner", "accompagne de", "accompagné de",
  "sers avec", "servir avec", "à accompagner de",
  // Appels a l'action / bio d'auteur, frequents en fin de legende TikTok.
  "abonne-toi", "abonne toi", "abonnez-vous", "si tu veux plus de",
  "pour plus de conseils", "pour plus de recettes", "n'hésite pas à",
  "n'hesite pas a",
  // Credits musicaux ("🎶 Instru de..."), tres frequents en fin de
  // legende TikTok, sans rapport avec la recette.
  "instru de", "musique :", "musique:", "son :", "son:",
];

// Cherche la position la plus proche du debut ou une formule de cloture
// apparait DANS une ligne/portion de texte (pas seulement en tant que
// ligne separee) - utilise par extractIngredientsMultiline pour couper
// une ligne comme "cumin Tu peux l'accompagner de riz" juste apres
// "cumin", au lieu de tout garder ou tout jeter.
function findSectionEndCut(text) {
  const lower = text.toLowerCase();
  let cut = -1;
  for (const marker of SECTION_END_MARKERS) {
    const idx = lower.indexOf(marker);
    if (idx !== -1 && (cut === -1 || idx < cut)) cut = idx;
  }
  return cut;
}

function extractIngredientsInline(text) {
  const lower = text.toLowerCase();
  const startMatch = lower.match(/ingr[ée]dients?/);
  if (!startMatch) return null;

  let start = startMatch.index + startMatch[0].length;

  const afterHeader = text.slice(start);
  const parenMatch = afterHeader.match(/^\s*\([^)]*\)/);
  if (parenMatch) start += parenMatch[0].length;

  const afterParen = text.slice(start);
  const sepMatch = afterParen.match(/^\s*[:\-–]\s*/);
  if (sepMatch) start += sepMatch[0].length;

  let end = text.length;
  const hashtagIdx = text.indexOf("#", start);
  if (hashtagIdx !== -1) end = hashtagIdx;
  for (const marker of SECTION_END_MARKERS) {
    const idx = lower.indexOf(marker, start);
    if (idx !== -1 && idx < end) end = idx;
  }

  const section = text.slice(start, end).trim();
  if (!section) return null;

  return splitInlineSection(section);
}

// Le separateur utilise varie selon le createur ("*" en guise de puce,
// virgule, tiret, point-virgule...). On essaie plusieurs candidats et on
// garde celui qui produit le plus grand nombre de morceaux plausibles
// (longueur raisonnable) - un separateur absent du texte ne coupe rien
// (1 seul morceau, trop long) et est naturellement ecarte.
const INLINE_DELIMITERS = ["*", "•", "▪", "–", "-", ";", "|", ","];
const MAX_PLAUSIBLE_ITEM_LENGTH = 60;

// Dernier recours quand aucune ponctuation ne separe les items : certaines
// plateformes (TikTok, verifie jusque dans leurs donnees completes cote
// serveur) suppriment purement et simplement les retours a la ligne d'une
// legende, ne laissant qu'un espace a la place. En prose normale, un
// nouveau mot en milieu de texte ne commence ni par un chiffre ni par une
// majuscule (hors noms propres) - une occurrence de l'un ou l'autre est
// donc un signal fort d'un ancien retour a la ligne, que ce debut de
// ligne soit une quantite ("200 g...") ou un nom d'ingredient capitalise
// ("Paprika", "Riz ou pâtes"). \p{Lu} plutot que [A-Z] pour couvrir les
// majuscules accentuees (ex: "École").
const ITEM_BOUNDARY_RE = /\s+(?=[\p{Lu}0-9])/gu;

function splitOnItemBoundaries(section) {
  const parts = section
    .split(ITEM_BOUNDARY_RE)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : null;
}

function splitInlineSection(section) {
  const stripEdges = (s) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();
  let best = null;

  for (const delim of INLINE_DELIMITERS) {
    const parts = section
      .split(delim)
      .map(stripEdges)
      .filter(Boolean);
    if (parts.length < 2) continue;

    const avgLen = parts.reduce((sum, s) => sum + s.length, 0) / parts.length;
    if (avgLen > MAX_PLAUSIBLE_ITEM_LENGTH) continue;

    if (!best || parts.length > best.length) best = parts;
  }

  if (best) return best;

  const boundarySplit = splitOnItemBoundaries(section);
  if (boundarySplit) return boundarySplit;

  // Aucun separateur reconnu : la section entiere est un seul ingredient.
  const single = stripEdges(section);
  return single ? [single] : null;
}

// Dernier recours quand il n'y a meme pas de mot "Ingredients" dans la
// legende (frequent sur les posts plus "edito" : un paragraphe d'intro,
// puis directement une liste a puces sans etiquette). Fonctionne sur du
// texte a plat (pas seulement multi-lignes) : TikTok supprime les
// retours a la ligne des legendes cote serveur (verifie jusque dans
// leurs donnees completes) - une detection basee sur des lignes
// separees par \n ne matcherait donc jamais un TikTok reel. On cherche
// plutot une puce (-, *, •...) suivie d'un espace, repetee au moins 3
// fois dans le texte : un paragraphe normal n'a pas cette repetition,
// une vraie liste si (aplatie ou non).
const BULLET_CHARS = ["-", "*", "•", "▪", "‣", "●", "–"];

function findBulletZoneStart(text) {
  for (const bullet of BULLET_CHARS) {
    const escaped = bullet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped + "\\s", "g");
    const matches = [...text.matchAll(re)];
    if (matches.length >= 3) {
      return { start: matches[0].index, bullet };
    }
  }
  return null;
}

function extractIngredientsFromBulletBlock(text) {
  const zone = findBulletZoneStart(text);
  if (!zone) return null;

  const lower = text.toLowerCase();
  let end = text.length;
  const hashtagIdx = text.indexOf("#", zone.start);
  if (hashtagIdx !== -1) end = hashtagIdx;
  for (const marker of SECTION_END_MARKERS) {
    const idx = lower.indexOf(marker, zone.start);
    if (idx !== -1 && idx < end) end = idx;
  }

  const section = text.slice(zone.start, end).trim();
  if (!section) return null;

  return splitInlineSection(section);
}

function extractIngredientsFromCaption(text) {
  if (!text) return null;
  return (
    extractIngredientsMultiline(text) ||
    extractIngredientsInline(text) ||
    extractIngredientsFromBulletBlock(text)
  );
}

// Parse le texte de conditionnement affiche sur une fiche produit
// Carrefour (ex: "200g", "1L", "6x50cL") en grammes/millilitres/compte,
// pour le comparer a ce que demande l'ingredient.
function parsePackSize(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  const measurable = cleaned.match(/^(?:(\d+)\s*x\s*)?([\d.,]+)\s*([^\s]+)$/i);
  const measurableUnit = measurable ? normalizeUnit(measurable[3]) : null;
  if (measurable && measurableUnit) {
    const multiplier = measurable[1] ? parseInt(measurable[1], 10) : 1;
    const unit = MEASURABLE_UNITS[measurableUnit];
    const amount = parseUnitAmount(measurable[2]) * unit.factor * multiplier;
    return { grams: unit.mass ? amount : null, ml: unit.mass ? null : amount, count: null };
  }

  const countable = cleaned.match(/^(\d+)\s*\S+/);
  if (countable) {
    return { grams: null, ml: null, count: parseInt(countable[1], 10) };
  }

  return null;
}
