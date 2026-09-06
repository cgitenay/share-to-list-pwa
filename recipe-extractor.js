// Extraction d'une recette (nom + ingredients) depuis une URL externe.
// Portage du pipeline de carrefour-liste-extension/popup.js (importFromUrl)
// adapte a une page web classique : un fetch() direct vers un site externe
// est bloque par le CORS ici (contrairement a l'extension, qui peut
// demander une permission d'hote) - on passe donc par le proxy Apps
// Script (fetchViaProxy) sauf pour TikTok, dont l'oEmbed public autorise
// deja les appels cross-origin (concu pour ca).
//
// extractIngredientsFromCaption/stripDescriptiveUnit viennent de
// matcher.js (charge en <script> classique avant ce module - voir
// index.html/recipe-form.html), donc disponibles ici comme globales.
import { fetchViaProxy } from "./recipes.js";

function isTikTok(url) {
  return url.hostname.includes("tiktok.com");
}

function isYouTube(url) {
  return url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be");
}

// Cherche un noeud "@type": "Recipe" dans un JSON-LD, en gerant les
// formes courantes : objet direct, tableau, ou enveloppe "@graph".
function findRecipeNode(node) {
  if (!node || typeof node !== "object") return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }

  const type = node["@type"];
  const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
  if (isRecipe) return node;

  if (node["@graph"]) return findRecipeNode(node["@graph"]);

  return null;
}

function extractFromHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (err) {
      continue; // JSON-LD invalide, on passe au suivant
    }

    const recipe = findRecipeNode(data);
    if (!recipe) continue;

    const rawIngredients = recipe.recipeIngredient || recipe.ingredients;
    if (Array.isArray(rawIngredients) && rawIngredients.length > 0) {
      const ingredients = rawIngredients
        .map((i) =>
          String(i)
            .replace(/\([^)]*\)/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean);
      return { name: recipe.name || suggestNameFromDoc(doc), ingredients };
    }
  }

  const ingredients = extractIngredientsFromCaption(doc.body ? doc.body.textContent : "");
  return { name: suggestNameFromDoc(doc), ingredients: ingredients || null };
}

function suggestNameFromDoc(doc) {
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content) return ogTitle.content.trim();
  if (doc.title) return doc.title.trim();
  return null;
}

// TikTok expose son oEmbed publiquement (pas besoin de connexion, CORS
// permissif par conception - fait pour etre appele depuis n'importe quel
// site tiers) et la legende complete se trouve dans le champ "title".
async function extractFromTikTok(url) {
  const oembedUrl = "https://www.tiktok.com/oembed?url=" + encodeURIComponent(url.href);
  let caption = null;
  try {
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      caption = data.title || null;
    }
  } catch (err) {
    // Repli sur le proxy si le fetch direct echoue pour une raison ou
    // une autre (reseau, changement de politique CORS cote TikTok...).
    const body = await fetchViaProxy(oembedUrl);
    const data = JSON.parse(body);
    caption = data.title || null;
  }
  return {
    name: null,
    ingredients: caption ? extractIngredientsFromCaption(caption) : null,
  };
}

// La description complete d'une video YouTube est presente directement
// dans le HTML de la page (champ JSON "shortDescription") - mais un fetch
// direct depuis une page web classique est bloque par le CORS (verifie),
// contrairement a l'extension qui peut demander la permission d'hote.
async function extractFromYouTube(url) {
  const html = await fetchViaProxy(url.href);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const match = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  const caption = match ? safeJsonStringDecode(match[1]) : null;
  return {
    name: suggestNameFromDoc(doc),
    ingredients: caption ? extractIngredientsFromCaption(caption) : null,
  };
}

function safeJsonStringDecode(escaped) {
  try {
    return JSON.parse('"' + escaped + '"'); // decode les echappements JSON (\n, \", ...)
  } catch (err) {
    return null;
  }
}

// Point d'entree : renvoie { ok, name, ingredients, message }. ingredients
// peut etre null (rien trouve automatiquement) - dans ce cas le formulaire
// s'ouvre vide, source conservee, l'utilisateur saisit a la main.
export async function extractRecipeFromUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch (err) {
    return { ok: false, message: "Lien invalide." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, message: "Lien invalide." };
  }

  try {
    let result;
    if (isTikTok(url)) {
      result = await extractFromTikTok(url);
    } else if (isYouTube(url)) {
      result = await extractFromYouTube(url);
    } else {
      const html = await fetchViaProxy(url.href);
      result = extractFromHtml(html);
    }
    return { ok: true, name: result.name, ingredients: result.ingredients };
  } catch (err) {
    return { ok: false, message: "Extraction impossible : " + err.message };
  }
}
