/* Gerador de QR Code próprio (sem dependência externa).
   Modo byte (UTF-8), correção de erro M, versões 1 a 10 (até 213 bytes).
   Segue a ISO/IEC 18004: Reed-Solomon em GF(256), entrelaçamento de blocos,
   escolha da máscara pela menor penalidade (regras N1 a N4).
   API:
     QR.matriz(texto, { mascara }) -> { versao, mascara, tamanho, mod: boolean[][] }  (mod[linha][coluna], true = escuro)
     QR.svg(texto, { cor, fundo, margem, titulo }) -> string <svg> */
(function () {
  'use strict';
  // Correção M: [códigos de correção por bloco, blocos do grupo 1, dados por bloco g1, blocos g2, dados por bloco g2]
  const BLOCOS_M = [null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
  const ALINHAMENTO = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const RESTO = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0];
  const NIVEL_M = 0; // bits de formato: L=01, M=00, Q=11, H=10

  /* ---- GF(256) com polinômio 0x11D ---- */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  const mul = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;
  function gerador(n) { // coeficientes do maior grau para o menor, sem o líder 1
    let g = [1];
    for (let i = 0; i < n; i++) { const r = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { r[j] ^= g[j]; r[j + 1] ^= mul(g[j], EXP[i]); } g = r; }
    return g.slice(1);
  }
  function reedSolomon(dados, n) {
    const g = gerador(n), r = new Array(n).fill(0);
    for (const b of dados) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < n; i++) r[i] ^= mul(g[i], f); }
    return r;
  }

  const utf8 = (s) => Array.from(new TextEncoder().encode(String(s)));
  const totalDados = (v) => { const b = BLOCOS_M[v]; return b[1] * b[2] + b[3] * b[4]; };
  const bitsContagem = (v) => v < 10 ? 8 : 16;
  const capacidade = (v) => Math.floor((totalDados(v) * 8 - 4 - bitsContagem(v)) / 8);

  function codificar(bytes, v) {
    const bits = [];
    const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, bitsContagem(v)); bytes.forEach(b => put(b, 8));
    const cap = totalDados(v) * 8;
    put(0, Math.min(4, cap - bits.length));
    while (bits.length % 8) bits.push(0);
    const cw = []; for (let i = 0; i < bits.length; i += 8) cw.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    for (let p = 0; cw.length < totalDados(v); p ^= 1) cw.push(p ? 0x11 : 0xEC);
    // blocos + correção, entrelaçados
    const [nec, b1, d1, b2, d2] = BLOCOS_M[v], blocos = []; let k = 0;
    for (let i = 0; i < b1 + b2; i++) { const n = i < b1 ? d1 : d2; const d = cw.slice(k, k + n); k += n; blocos.push({ d, e: reedSolomon(d, nec) }); }
    const out = [], maxD = Math.max(d1, d2);
    for (let i = 0; i < maxD; i++) blocos.forEach(b => { if (i < b.d.length) out.push(b.d[i]); });
    for (let i = 0; i < nec; i++) blocos.forEach(b => out.push(b.e[i]));
    return out;
  }

  const MASCARAS = [
    (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];

  function base(v) {
    const n = v * 4 + 17;
    const mod = Array.from({ length: n }, () => new Array(n).fill(false));
    const fun = Array.from({ length: n }, () => new Array(n).fill(false));
    const set = (r, c, d) => { mod[r][c] = d; fun[r][c] = true; };
    const finder = (r0, c0) => { for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) { const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= n || c >= n) continue; const m = Math.max(Math.abs(dr - 3), Math.abs(dc - 3)); set(r, c, m !== 2 && m !== 4); } };
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const al = ALINHAMENTO[v];
    al.forEach((r, i) => al.forEach((c, j) => { if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) return; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1); }));
    // reserva da área de formato (preenchida depois) e módulo escuro
    for (let i = 0; i < 9; i++) { fun[8][i] = fun[i][8] = true; }
    for (let i = 0; i < 8; i++) { fun[8][n - 1 - i] = fun[n - 1 - i][8] = true; }
    set(n - 8, 8, true);
    if (v >= 7) { // informação de versão (BCH 18,6)
      let rem = v; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      const bits = (v << 12) | rem;
      for (let i = 0; i < 18; i++) { const d = ((bits >>> i) & 1) === 1, a = n - 11 + (i % 3), b = Math.floor(i / 3); set(b, a, d); set(a, b, d); }
    }
    return { n, mod, fun };
  }
  function formato(m, mascara) {
    const { n, mod } = m; const dado = (NIVEL_M << 3) | mascara;
    let rem = dado; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((dado << 10) | rem) ^ 0x5412, b = (i) => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) mod[i][8] = b(i);
    mod[7][8] = b(6); mod[8][8] = b(7); mod[8][7] = b(8);
    for (let i = 9; i < 15; i++) mod[8][14 - i] = b(i);
    for (let i = 0; i < 8; i++) mod[8][n - 1 - i] = b(i);
    for (let i = 8; i < 15; i++) mod[n - 15 + i][8] = b(i);
    mod[n - 8][8] = true;
  }
  function posicionar(m, cw, v, resto) {
    const { n, mod, fun } = m; const bits = [];
    cw.forEach(b => { for (let i = 7; i >= 0; i--) bits.push((b >>> i) & 1); });
    for (let i = 0; i < RESTO[v]; i++) bits.push(0);
    let k = 0;
    for (let dir = -1, c = n - 1; c > 0; c -= 2) {
      if (c === 6) c = 5;
      for (let t = 0; t < n; t++) {
        const r = dir < 0 ? n - 1 - t : t;
        for (let j = 0; j < 2; j++) { const cc = c - j; if (!fun[r][cc]) { mod[r][cc] = k < bits.length ? bits[k] === 1 : false; if (resto && k >= bits.length - RESTO[v]) resto.push([r, cc]); k++; } }
      }
      dir = -dir;
    }
  }
  function aplicarMascara(m, mascara) {
    const f = MASCARAS[mascara];
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (!m.fun[r][c] && f(r, c)) m.mod[r][c] = !m.mod[r][c];
  }
  function penalidade(mod) {
    const n = mod.length; let p = 0;
    const linha = (i, vert) => (j) => vert ? mod[j][i] : mod[i][j];
    for (const vert of [false, true]) for (let i = 0; i < n; i++) { // N1: sequências de 5+ módulos iguais
      const g = linha(i, vert); let run = 1;
      for (let j = 1; j <= n; j++) { if (j < n && g(j) === g(j - 1)) run++; else { if (run >= 5) p += 3 + (run - 5); run = 1; } }
    }
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const v = mod[r][c]; if (v === mod[r][c + 1] && v === mod[r + 1][c] && v === mod[r + 1][c + 1]) p += 3; } // N2
    const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]; // N3: padrão parecido com localizador
    for (const vert of [false, true]) for (let i = 0; i < n; i++) { const g = linha(i, vert); for (let j = 0; j + 11 <= n; j++) { let a = true, b = true; for (let k = 0; k < 11; k++) { const x = g(j + k) ? 1 : 0; if (x !== A[k]) a = false; if (x !== B[k]) b = false; } if (a) p += 40; if (b) p += 40; } }
    let esc = 0; mod.forEach(l => l.forEach(x => { if (x) esc++; }));
    p += Math.floor(Math.abs(esc * 100 / (n * n) - 50) / 5) * 10; // N4
    return p;
  }
  function matriz(texto, opt) {
    opt = opt || {};
    const bytes = utf8(texto);
    let v = 1; while (v <= 10 && capacidade(v) < bytes.length) v++;
    if (v > 10) throw new Error('Texto longo demais para o QR Code (máximo ' + capacidade(10) + ' bytes).');
    const cw = codificar(bytes, v);
    const montar = (mk) => { const m = base(v); posicionar(m, cw, v); aplicarMascara(m, mk); formato(m, mk); return m; };
    let melhor = null, mascara = opt.mascara;
    if (mascara == null) { for (let mk = 0; mk < 8; mk++) { const m = montar(mk), p = penalidade(m.mod); if (!melhor || p < melhor.p) { melhor = { m, p }; mascara = mk; } } }
    else melhor = { m: montar(mascara) };
    return { versao: v, mascara, tamanho: melhor.m.n, mod: melhor.m.mod };
  }
  function svg(texto, opt) {
    opt = opt || {};
    const q = matriz(texto), mg = opt.margem == null ? 4 : opt.margem, t = q.tamanho + mg * 2;
    let d = '';
    q.mod.forEach((l, r) => { let c = 0; while (c < q.tamanho) { if (!l[c]) { c++; continue; } let f = c; while (f < q.tamanho && l[f]) f++; d += `M${c + mg} ${r + mg}h${f - c}v1h-${f - c}z`; c = f; } });
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges" role="img" aria-label="${esc(opt.titulo || 'QR Code')}"><rect width="${t}" height="${t}" fill="${esc(opt.fundo || '#FFFFFF')}"/><path d="${d}" fill="${esc(opt.cor || '#000000')}"/></svg>`;
  }
  // Para testes: posições dos bits de resto (sem dados; alguns codificadores não aplicam a máscara nelas).
  const posicoesResto = (v) => { const m = base(v), r = []; posicionar(m, codificar([], v), v, r); return r; };
  const api = { matriz, svg, capacidade: capacidade(10), _penalidade: penalidade, _posicoesResto: posicoesResto };
  if (typeof window !== 'undefined') window.QR = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
