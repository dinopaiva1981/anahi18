/* Guia do hóspede · modo offline.
   Página, código e dados (dados/conteudo.json): rede primeiro (sempre atualizado), com tempo-limite de 3 s;
   sem sinal ou com sinal fraco, usa a cópia guardada. Código e dados têm entradas separadas no cache:
   atualizar um não invalida o outro.
   Fontes do guia, ícones e Leaflet: cópia guardada primeiro, atualizada em segundo plano.
   Tiles do mapa: cache próprio, só respostas CORS (não opacas), com teto de 200 tiles (sai o mais antigo).
   Agenda de disponibilidade (?acao=agenda no Apps Script): sempre da rede, nunca guardada aqui. A cópia de até
   30 min fica só no sessionStorage da aba (assets/site.js), então nada da agenda passa de 1 h no aparelho. */
const VERSAO = 'guia-v9';
const TILES = 'guia-tiles-v1';
const MAX_TILES = 200;
const ESSENCIAIS = ['./', './index.html', './dados/conteudo.json', './assets/dados.js', './assets/agenda.js', './assets/calendario.js', './assets/calendario.css', './assets/site.css', './assets/site.js', './assets/ilustracoes.js', './assets/marca.js',
  './assets/fontes/inter-300.woff', './assets/fontes/inter-400.woff', './assets/fontes/inter-600.woff',
  './assets/fontes/instrument-serif-400.woff', './assets/fontes/instrument-serif-400i.woff',
  './manifest.webmanifest', './icone-192.png'];

self.addEventListener('install', (e) => {
  // Cada arquivo é guardado separadamente: se um faltar (ex.: repositório ainda sem dados/conteudo.json), os outros entram.
  e.waitUntil(caches.open(VERSAO).then((c) => Promise.all(ESSENCIAIS.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO && k !== TILES).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const guardar = (cache, req, resp) => caches.open(cache).then((k) => k.put(req, resp)).catch(() => {}); // cota cheia: segue sem guardar
function comLimite(promessa, ms) {
  return new Promise((ok, falha) => { const t = setTimeout(() => falha(new Error('tempo')), ms); promessa.then((r) => { clearTimeout(t); ok(r); }, (x) => { clearTimeout(t); falha(x); }); });
}
async function aparaTiles() {
  const k = await caches.open(TILES); const chaves = await k.keys();
  for (let i = 0; i < chaves.length - MAX_TILES; i++) await k.delete(chaves[i]); // keys() vem na ordem de inserção
}
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/admin/')) return; // painel nunca usa cache
  if (url.searchParams.get('acao') === 'agenda') return; // agenda: só rede (o navegador cuida; não entra no cache)
  const doSite = url.origin === location.origin;
  // Tiles do OpenStreetMap
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TILES).then((k) => k.match(req).then((salvo) => salvo || fetch(req).then((r) => {
      if (r.ok && r.type !== 'opaque') { guardar(TILES, req, r.clone()).then(aparaTiles).catch(() => {}); }
      return r;
    }))));
    return;
  }
  const redePrimeiro = req.mode === 'navigate' || (doSite && /\.(html|js|css|json)$|\/$/.test(url.pathname));
  if (redePrimeiro) {
    const chave = req.mode === 'navigate' ? './index.html' : req;
    const rede = fetch(req).then((r) => { if (r.ok) guardar(VERSAO, chave, r.clone()); return r; });
    e.respondWith(comLimite(rede, 3000).catch(() => caches.match(chave, { ignoreSearch: true }).then((c) => c || rede)));
    return;
  }
  const estatico = doSite || url.hostname === 'cdnjs.cloudflare.com';
  if (!estatico) return; // previsão do tempo e maré: sempre da rede
  e.respondWith(caches.open(VERSAO).then((k) => k.match(req).then((salvo) => {
    const rede = fetch(req).then((r) => { if (r.ok) guardar(VERSAO, req, r.clone()); return r; }).catch(() => salvo);
    return salvo || rede;
  })));
});
