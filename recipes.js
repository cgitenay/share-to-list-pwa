// Recettes enregistrees (Firestore) + acces au proxy Apps Script pour
// contourner le CORS lors de l'extraction depuis une URL externe.
import { db } from "./firebase-init.js";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// URL de deploiement du Web App Apps Script (voir
// carrefour-liste-extension/apps-script/Code.gs) - a completer une fois
// deploye. Cette URL n'est pas secrete (l'acces est "Tous" mais le proxy
// ne fait que relayer une lecture HTTP, sans ecrire nulle part).
const PROXY_URL = "TODO_APPS_SCRIPT_PROXY_URL";

export function recipesRef(groupId) {
  return collection(db, "groups", groupId, "recipes");
}

export async function saveRecipe(groupId, user, { name, ingredients, sourceUrl }) {
  await addDoc(recipesRef(groupId), {
    name: (name || "").trim() || "Recette sans nom",
    ingredients,
    sourceUrl: sourceUrl || null,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
}

export async function listRecipes(groupId) {
  const snap = await getDocs(recipesRef(groupId));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addRecipeIngredientsToList(groupId, user, ingredients) {
  const ref = collection(db, "groups", groupId, "shoppingItems");
  for (const ingredient of ingredients) {
    await addDoc(ref, {
      type: "item",
      content: ingredient,
      status: "pending",
      addedBy: user.uid,
      createdAt: serverTimestamp(),
    });
  }
}

// JSONP (<script src>) : jamais soumis au CORS, contrairement a fetch()
// meme en mode "no-cors" (verifie sur ce projet - voir Code.gs). Meme
// technique que fetchListViaJsonp de l'ancien relais Sheet.
export function fetchViaProxy(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "recipeProxyCb" + Date.now() + Math.floor(Math.random() * 1e6);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout"));
    }, 12000);

    function cleanup() {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      clearTimeout(timeout);
    }

    window[callbackName] = (data) => {
      cleanup();
      if (!data || !data.ok) {
        reject(new Error((data && data.error) || "Erreur du proxy"));
        return;
      }
      resolve(data.body);
    };

    const script = document.createElement("script");
    script.src =
      PROXY_URL + "?action=proxy&url=" + encodeURIComponent(url) + "&callback=" + callbackName;
    script.onerror = () => {
      cleanup();
      reject(new Error("Erreur de chargement du proxy"));
    };
    document.body.appendChild(script);
  });
}
