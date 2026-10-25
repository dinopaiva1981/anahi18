/* Guia do hóspede · modo offline.
   Página, estilos e conteúdo: rede primeiro (sempre atualizado); sem sinal, usa a cópia guardada.
   Fontes, mapa e fotos: cópia guardada primeiro, atualizada em segundo plano. */
const VERSAO = 'guia-v5';
const ESSENCIAIS = ['./', './index.html', './conteudo.js', './assets/site.css', './assets/site.js', './assets/ilustracoes.js', './assets/marca.js', './manifest.webmanifest', './icone-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/admin/')) return; // painel nunca usa cache
  const doSite = url.origin === location.origin;
  const redePrimeiro = req.mode === 'navigate' || (doSite && /\.(html|js|css)$|\/$/.test(url.pathname));
  if (redePrimeiro) {
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then((k) => k.put(req.mode === 'navigate' ? './index.html' : req, c)); } return r; })
      .catch(() => caches.match(req.mode === 'navigate' ? './index.html' : req, { ignoreSearch: true })));
    return;
  }
  const estatico = doSite || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdnjs.cloudflare.com' || /tile\.openstreetmap\.org$/.test(url.hostname);
  if (!estatico) return; // previsão do tempo e maré: sempre da rede
  e.respondWith(caches.open(VERSAO).then((k) => k.match(req).then((salvo) => {
    const rede = fetch(req).then((r) => { if (r.ok || r.type === 'opaque') k.put(req, r.clone()); return r; }).catch(() => salvo);
    return salvo || rede;
  })));
});
