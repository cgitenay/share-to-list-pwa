// Config Firebase - meme projet que l'extension (carrefour-liste-extension/firebase-init.js).
// Ces valeurs ne sont pas secretes (elles identifient juste le projet
// cote client) - la securite reelle vient des regles Firestore et de
// l'authentification, pas de la confidentialite de cette config.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCg4ujZR-hAEktvnrKTx6fDemz0lQVeFxM",
  authDomain: "liste-courses-partagee-5d125.firebaseapp.com",
  projectId: "liste-courses-partagee-5d125",
  storageBucket: "liste-courses-partagee-5d125.firebasestorage.app",
  messagingSenderId: "56140235809",
  appId: "1:56140235809:web:fff5bd6fd9fd2332194f60",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
