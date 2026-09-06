// Gestion des groupes : creation, jointure via code d'invitation, groupe
// actif (persiste dans localStorage, propre a cet appareil/navigateur).
// Miroir de carrefour-liste-extension/groups.js, adapte au SDK Firebase
// modulaire (charge via CDN ici, pas de contrainte CSP sur une page web
// classique contrairement a l'extension).
import { db } from "./firebase-init.js";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const ACTIVE_GROUP_KEY = "activeGroupId";

// Sans caracteres ambigus (0/O, 1/I/l) pour rester facile a retaper.
export function randomInviteCode(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < (length || 8); i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function myGroups(uid) {
  const q = query(collectionGroup(db, "members"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    groupId: d.ref.parent.parent.id,
    role: d.data().role,
  }));
}

export async function getGroupInfo(groupId) {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createGroup(user, name) {
  const groupRef = doc(collection(db, "groups"));
  await setDoc(groupRef, {
    name: name || "Ma liste",
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "groups", groupRef.id, "members", user.uid), {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    role: "owner",
    joinedAt: serverTimestamp(),
  });
  return groupRef.id;
}

export async function createInvite(user, groupId) {
  const code = randomInviteCode(8);
  await setDoc(doc(db, "invites", code), {
    groupId,
    createdBy: user.uid,
    active: true,
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function joinGroupWithCode(user, code) {
  const cleanCode = code.trim().toUpperCase();
  const inviteSnap = await getDoc(doc(db, "invites", cleanCode));
  if (!inviteSnap.exists() || inviteSnap.data().active !== true) {
    throw new Error("Code d'invitation invalide ou expire.");
  }

  const groupId = inviteSnap.data().groupId;
  await setDoc(doc(db, "groups", groupId, "members", user.uid), {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    role: "member",
    invitedCode: cleanCode,
    joinedAt: serverTimestamp(),
  });
  return groupId;
}

export function getActiveGroupId() {
  return localStorage.getItem(ACTIVE_GROUP_KEY);
}

export function setActiveGroupId(groupId) {
  localStorage.setItem(ACTIVE_GROUP_KEY, groupId);
}
