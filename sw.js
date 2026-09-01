// Service worker minimal - requis par Android/Chrome comme critere
// d'installabilite d'une PWA, meme sans besoin de cache hors-ligne ici.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
