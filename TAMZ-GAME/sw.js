// Název mezipaměti (cache). Při změně verze dojde k přenačtení souborů.
const CACHE_N = 'pwa-cache-v0011';

// Seznam souborů, které se mají uložit do mezipaměti ihned při instalaci.
const cacheUrls = [
    "./",
    "./index.html",
    "./game.js",
    "./assets/lego.png",
    "./assets/items.png",
    "./assets/map_tiles.png",
    "./assets/json_map.json",
    "./assets/bomb.png",
    "https://cdn.jsdelivr.net/npm/phaser@3.88.2/dist/phaser.js"
];

// Událost 'install' - spustí se při prvním načtení Service Workera.
// Zde stahujeme a ukládáme základní soubory (index, JS, assety).
self.addEventListener("install", (ev) => {
    self.skipWaiting();

    ev.waitUntil(
        caches.open(CACHE_N).then((cache) => {
            return cache.addAll(cacheUrls);
        })
    );
});

// Událost 'activate' - spustí se po instalaci nového Service Workera.
// Slouží k promazání starých verzí mezipaměti, které už nejsou potřeba.
self.addEventListener("activate", (ev) => {
    ev.waitUntil(clients.claim());

    ev.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_N)
                    .map((name) => caches.delete(name))
            );
        })
    );
});

// Událost 'fetch' - zachytává všechny požadavky na síť (images, scripts, atd.).
self.addEventListener("fetch", (e) => {
    e.respondWith(
        (async () => {
            // 1. Zkusíme najít soubor v mezipaměti
            const r = await caches.match(e.request);
            if (r) {
                return r; // Pokud existuje, hned ho vrátíme
            }

            // 2. Pokud není v cache, musíme ho stáhnout ze sítě
            const resp = await fetch(e.request);

            // 3. Stažený soubor si uložíme do mezipaměti
            const cache = await caches.open(CACHE_N);
            cache.put(e.request, resp.clone());

            return resp;
        })()
    );
});
