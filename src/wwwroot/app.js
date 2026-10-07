// =============================================================
// ShopGame — front-end (JavaScript puro)
// Cada tela consome a API em C#, que usa as Views, Functions e
// Procedures do PostgreSQL.
// =============================================================

// ================= Utilidades =================
const $ = (sel) => document.querySelector(sel);
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v) => Number(v || 0).toLocaleString('pt-BR');
const brlCurto = (v) =>
  v >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil' : 'R$ ' + num(Math.round(v));
const data = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const hora = (d) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ic = (nome, cls = '') => `<svg class="i ${cls}"><use href="#i-${nome}"/></svg>`;

// Monta a query string ignorando filtros vazios
const qs = (filtros) =>
  new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v != null)).toString();

function tempoRelativo(d) {
  const min = Math.round((Date.now() - new Date(d)) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

// ---------- Elementos visuais reutilizáveis ----------
const PLATAFORMAS = ['PS5', 'Xbox Series', 'Switch', 'PC', 'Multi'];
const classePlataforma = (p) => 'p-' + (String(p).split(' ')[0] || 'Multi');

function iconeProduto(p) {
  if (/controle|joy-con|dualsense/i.test(p.nome)) return 'gamepad';
  if (/headset/i.test(p.nome)) return 'cpu';
  return { Consoles: 'tv', Jogos: 'disc', 'Peças e Acessórios': 'cpu' }[p.categoria] || 'box';
}
const thumb = (p, tam = '') => `<div class="thumb ${tam} ${classePlataforma(p.plataforma)}">${ic(iconeProduto(p))}</div>`;

function iniciais(nome) {
  const partes = String(nome).trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase();
}
function matiz(texto) {
  let h = 0;
  for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
const avatar = (nome, tam = '') => `<div class="avatar ${tam}" style="--h:${matiz(nome)}">${esc(iniciais(nome))}</div>`;

const TIERS = {
  BRONZE: { pct: '0%', prox: 'PRATA', alvo: 2000, min: 0 },
  PRATA: { pct: '5%', prox: 'OURO', alvo: 5000, min: 2000 },
  OURO: { pct: '10%', prox: null, alvo: null, min: 5000 },
};
const tier = (n) => `<span class="tier ${esc(n)}">${n === 'OURO' ? ic('crown') : ''}${esc(n)}</span>`;

function progressoTier(nivel, gasto) {
  const t = TIERS[nivel];
  if (!t.prox) return { pct: 100, texto: 'Nível máximo — 10% em todas as compras' };
  const pct = Math.min(100, ((gasto - t.min) / (t.alvo - t.min)) * 100);
  return { pct, texto: `Faltam ${brl(t.alvo - gasto)} para ${t.prox}` };
}

const STATUS_TEXTO = { OK: 'Em estoque', BAIXO: 'Estoque baixo', ESGOTADO: 'Esgotado', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' };
const pill = (s) => `<span class="pill ${esc(s)}">${esc(STATUS_TEXTO[s] || s)}</span>`;

const PAGAMENTO = {
  PIX: { icone: 'pix', nome: 'PIX' },
  CREDITO: { icone: 'card', nome: 'Crédito' },
  DEBITO: { icone: 'wallet', nome: 'Débito' },
  DINHEIRO: { icone: 'cash', nome: 'Dinheiro' },
};
const pagamento = (f) => `<span class="cell muted">${ic(PAGAMENTO[f]?.icone || 'card')}${esc(PAGAMENTO[f]?.nome || f)}</span>`;

// ---------- API e feedback ----------
async function api(url, opcoes = {}) {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || 'Não foi possível concluir a operação');
  return dados;
}

function toast(titulo, texto = '', erro = false) {
  const el = document.createElement('div');
  el.className = 'toast ' + (erro ? 'erro' : 'ok');
  el.innerHTML = `${ic(erro ? 'alert' : 'check')}<div><strong></strong><span></span></div>`;
  el.querySelector('strong').textContent = titulo;
  el.querySelector('span').textContent = texto;
  $('#toasts').append(el);
  setTimeout(() => {
    el.classList.add('sai');
    el.addEventListener('animationend', () => el.remove());
  }, erro ? 5000 : 3500);
}
const erro = (e) => toast('Ops! Algo deu errado', e.message, true);

// Tabela a partir de colunas [{ titulo, campo | render, num }]
function tabela(el, colunas, linhas, vazio = 'Nenhum registro encontrado') {
  const cab = colunas.map((c) => `<th class="${c.num ? 'num' : ''}">${c.titulo}</th>`).join('');
  const corpo = linhas.length
    ? linhas
        .map(
          (l) =>
            '<tr>' +
            colunas.map((c) => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(l) : esc(l[c.campo])}</td>`).join('') +
            '</tr>'
        )
        .join('')
    : `<tr><td colspan="${colunas.length}"><div class="empty">${ic('search')}<strong>${vazio}</strong><small>Ajuste os filtros e tente novamente.</small></div></td></tr>`;
  el.innerHTML = `<thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody>`;
}

function kpi({ label, valor, icone, tom = 'var(--accent-2)', suave = 'var(--accent-soft)', brilho, rodape = '' }) {
  return `<div class="kpi" style="--tone:${tom};--soft:${suave};--glow:${brilho || suave}">
    <div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${ic(icone)}</span></div>
    <div class="kpi-value">${valor}</div>
    ${rodape ? `<div class="kpi-foot">${rodape}</div>` : ''}
  </div>`;
}
function delta(atual, anterior) {
  if (!anterior) return atual ? `<span class="delta up">${ic('up')}novo</span>` : `<span class="delta flat">—</span>`;
  const p = ((atual - anterior) / anterior) * 100;
  const cls = p > 0.5 ? 'up' : p < -0.5 ? 'down' : 'flat';
  return `<span class="delta ${cls}">${cls === 'flat' ? '' : ic(cls === 'up' ? 'up' : 'down')}${Math.abs(p).toFixed(0)}%</span>`;
}

// Grupo de botões (chips / segmented / pagamento): guarda o valor em data-valor
function grupo(el, aoMudar) {
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-valor]');
    if (!btn) return;
    el.querySelectorAll('button').forEach((b) => b.classList.toggle('ativo', b === btn));
    el.dataset.valor = btn.dataset.valor;
    aoMudar?.(btn.dataset.valor);
  });
}

function debounce(fn, ms = 250) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

// ---------- Diálogos ----------
function abrirFormulario(titulo, campos, aoSalvar, textoBotao = 'Salvar') {
  $('#modal-titulo').textContent = titulo;
  $('#modal-ok').textContent = textoBotao;
  $('#modal-corpo').innerHTML = campos
    .map((c) => {
      const req = c.obrigatorio ? 'required' : '';
      const input =
        c.tipo === 'select'
          ? `<select name="${c.nome}" ${req}>${c.opcoes
              .map((o) => `<option value="${esc(o.id)}" ${o.id == c.valor ? 'selected' : ''}>${esc(o.nome)}</option>`)
              .join('')}</select>`
          : `<input name="${c.nome}" type="${c.tipo || 'text'}" value="${esc(c.valor ?? '')}" ${req}
               placeholder="${esc(c.dica || '')}" ${c.tipo === 'number' ? `step="${c.passo || 1}" min="${c.min ?? 0}"` : ''}>`;
      return `<label class="field ${c.full ? 'full' : ''}"><span>${c.rotulo}</span>${input}</label>`;
    })
    .join('');
  const form = $('#modal-form');
  form.onsubmit = async (e) => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    const botao = $('#modal-ok');
    botao.disabled = true;
    try {
      await aoSalvar(Object.fromEntries(new FormData(form)));
      $('#modal').close();
    } catch (err) {
      erro(err);
    } finally {
      botao.disabled = false;
    }
  };
  $('#modal').showModal();
  $('#modal-corpo').querySelector('input, select')?.focus();
}

function confirmar({ titulo, texto, botao = 'Confirmar', icone = 'alert' }) {
  $('#confirm-titulo').textContent = titulo;
  $('#confirm-texto').textContent = texto;
  $('#confirm-ok').textContent = botao;
  $('#confirm-icone').innerHTML = ic(icone);
  const dlg = $('#confirm');
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise((ok) => dlg.addEventListener('close', () => ok(dlg.returnValue === 'sim'), { once: true }));
}

// ================= Navegação =================
const carregadores = {};
const TITULOS = { dashboard: 'Início', venda: 'Nova venda', relatorio: 'Relatório de vendas', produtos: 'Produtos & estoque', clientes: 'Clientes' };

function irPara(tela) {
  document.querySelectorAll('#menu button').forEach((b) => {
    const ativo = b.dataset.tela === tela;
    b.classList.toggle('ativo', ativo);
    ativo ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === `tela-${tela}`));
  $('#crumb-atual').textContent = TITULOS[tela];
  document.title = `${TITULOS[tela]} · ShopGame`;
  // URL própria por tela: botão Voltar funciona e a tela pode ser favoritada
  if (location.hash !== '#' + tela) history.pushState(null, '', '#' + tela);
  fecharMenu();
  window.scrollTo({ top: 0 });
  carregadores[tela]().catch(erro);
}
document.querySelectorAll('#menu button').forEach((b) => b.addEventListener('click', () => irPara(b.dataset.tela)));
document.addEventListener('click', (e) => {
  const alvo = e.target.closest('[data-ir]');
  if (!alvo) return;
  e.preventDefault();
  irPara(alvo.dataset.ir);
});

function fecharMenu() {
  [$('#sidebar'), $('#backdrop')].forEach((el) => el.classList.remove('aberta'));
  $('#menu-btn').setAttribute('aria-expanded', 'false');
}
$('#menu-btn').addEventListener('click', () => {
  [$('#sidebar'), $('#backdrop')].forEach((el) => el.classList.add('aberta'));
  $('#menu-btn').setAttribute('aria-expanded', 'true');
  $('#menu button.ativo')?.focus();
});
$('#backdrop').addEventListener('click', fecharMenu);

// Atalhos: "/" foca a busca da tela atual; Esc fecha o menu do celular
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharMenu();
  if (e.key !== '/' || e.target.closest('input, select, textarea, dialog')) return;
  const busca = document.querySelector('.tela.ativa .search input');
  if (busca) {
    e.preventDefault();
    busca.focus();
  }
});

// Cabeçalho ganha fundo sólido + blur ao rolar (como em lojas de games)
const marcarRolagem = () => document.body.classList.toggle('rolou', window.scrollY > 8);
window.addEventListener('scroll', marcarRolagem, { passive: true });
marcarRolagem();

$('#hoje').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

let categorias = [];
async function carregarCategorias() {
  categorias = await api('/api/produtos/categorias');
  const icones = { Consoles: 'tv', Jogos: 'disc', 'Peças e Acessórios': 'cpu' };
  const html =
    `<button data-valor="" class="ativo">${ic('grid')}Todos</button>` +
    categorias.map((c) => `<button data-valor="${c.id}">${ic(icones[c.nome] || 'box')}${esc(c.nome)}</button>`).join('');
  $('#venda-categoria').innerHTML = html;
  $('#prod-categoria').innerHTML = html;
}

// ================= Gráfico de barras (SVG) =================
const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs, pai) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  pai?.append(el);
  return el;
}

function limiteBonito(max) {
  if (max <= 0) return 1000;
  const pot = 10 ** Math.floor(Math.log10(max));
  const passo = [1, 2, 2.5, 5, 10].find((m) => (m * pot * 4) >= max) * pot;
  return passo * 4;
}

function graficoBarras(el, dias) {
  el._dados = dias;
  el.innerHTML = '';
  const W = el.clientWidth, H = el.clientHeight;
  const m = { t: 8, r: 4, b: 26, l: 64 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const max = limiteBonito(Math.max(...dias.map((d) => d.total)));
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Faturamento diário dos últimos 30 dias' }, el);

  const grade = svg('g', { class: 'grid' }, root);
  const eixo = svg('g', { class: 'axis' }, root);
  for (let i = 0; i <= 4; i++) {
    const y = m.t + ph - (ph * i) / 4;
    svg('line', { x1: m.l, x2: W - m.r, y1: y, y2: y }, grade);
    const t = svg('text', { x: m.l - 12, y: y + 4, 'text-anchor': 'end' }, eixo);
    t.textContent = brlCurto((max * i) / 4);
  }

  const slot = pw / dias.length;
  const bw = Math.min(18, slot * 0.64);
  const tooltip = $('#tooltip');
  dias.forEach((d, i) => {
    const x = m.l + i * slot + (slot - bw) / 2;
    const h = d.total > 0 ? Math.max(3, (d.total / max) * ph) : 2;
    const y = m.t + ph - h;
    const col = svg('g', { class: 'col', tabindex: 0 }, root);
    svg('rect', { class: 'hit', x: m.l + i * slot, y: m.t, width: slot, height: ph, rx: 6 }, col);
    const cls = 'bar' + (d.total > 0 ? '' : ' zero');
    // Ponta arredondada de 4px no topo, base reta no eixo
    svg('rect', { class: cls, x, y, width: bw, height: h, rx: Math.min(4, h / 2) }, col);
    if (h > 4) svg('rect', { class: cls, x, y: y + h - 4, width: bw, height: 4 }, col);

    const dia = new Date(d.dia + 'T00:00:00');
    if (i % 5 === 4 || i === dias.length - 1) {
      const t = svg('text', { x: x + bw / 2, y: H - 6, 'text-anchor': 'middle' }, eixo);
      t.textContent = dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }

    const mostrar = (cx, cy) => {
      tooltip.replaceChildren();
      const valor = document.createElement('strong');
      valor.textContent = brl(d.total);
      const linha = document.createElement('div');
      linha.innerHTML = '<span class="key"></span>';
      linha.append(`${d.qtd} ${d.qtd === 1 ? 'venda' : 'vendas'}`);
      const quando = document.createElement('div');
      quando.textContent = dia.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
      tooltip.append(valor, linha, quando);
      tooltip.hidden = false;
      const r = tooltip.getBoundingClientRect();
      tooltip.style.left = Math.min(window.innerWidth - r.width - 12, cx + 14) + 'px';
      tooltip.style.top = Math.max(12, cy - r.height - 12) + 'px';
    };
    col.addEventListener('pointermove', (e) => mostrar(e.clientX, e.clientY));
    col.addEventListener('focus', () => {
      const r = col.getBoundingClientRect();
      mostrar(r.left + r.width / 2, r.top + 40);
    });
    col.addEventListener('pointerleave', () => (tooltip.hidden = true));
    col.addEventListener('blur', () => (tooltip.hidden = true));
  });
}
window.addEventListener(
  'resize',
  debounce(() => {
    const el = $('#dash-chart');
    if (el._dados && el.offsetParent) graficoBarras(el, el._dados);
  }, 150)
);

// ================= Dashboard (VIEWs) =================
carregadores.dashboard = async () => {
  const h = new Date().getHours();
  $('#saudacao').textContent = `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}, Ryan`;

  const d = await api('/api/dashboard');
  const dias = d.vendas_por_dia;
  const soma = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const ult7 = dias.slice(-7), ant7 = dias.slice(-14, -7);

  $('#dash-cards').innerHTML = [
    kpi({ label: 'Faturamento total', valor: brl(d.resumo.faturamento), icone: 'dollar',
      rodape: `${delta(soma(ult7, 'total'), soma(ant7, 'total'))} últimos 7 dias` }),
    kpi({ label: 'Vendas concluídas', valor: num(d.resumo.qtd_vendas), icone: 'bag', tom: 'var(--cyan)', suave: 'rgba(34,211,238,.12)',
      rodape: `${delta(soma(ult7, 'qtd'), soma(ant7, 'qtd'))} últimos 7 dias` }),
    kpi({ label: 'Ticket médio', valor: brl(d.resumo.ticket_medio), icone: 'tag', tom: 'var(--warn)', suave: 'var(--warn-soft)',
      rodape: `${num(d.resumo.unidades)} unidades vendidas` }),
    kpi({ label: 'Descontos fidelidade', valor: brl(d.resumo.descontos), icone: 'percent', tom: 'var(--ok)', suave: 'var(--ok-soft)',
      rodape: 'via fn_calcular_desconto' }),
  ].join('');

  const total30 = soma(dias, 'total');
  $('#dash-30d').innerHTML = `<strong>${brl(total30)}</strong><span>${soma(dias, 'qtd')} vendas em 30 dias</span>`;
  graficoBarras($('#dash-chart'), dias);

  const totalPag = soma(d.por_pagamento, 'total') || 1;
  const maxPag = Math.max(...d.por_pagamento.map((p) => p.total), 1);
  $('#dash-pagamento').innerHTML = d.por_pagamento.length
    ? d.por_pagamento
        .map((p) => `<div class="hbar-row">
          <div class="hbar-label"><span class="ico">${ic(PAGAMENTO[p.forma_pagamento].icone)}</span>${PAGAMENTO[p.forma_pagamento].nome}</div>
          <div class="hbar-value">${brl(p.total)}<small>${((p.total / totalPag) * 100).toFixed(0)}% · ${p.qtd} vendas</small></div>
          <div class="hbar-track"><div class="hbar-fill" style="width:${(p.total / maxPag) * 100}%"></div></div>
        </div>`)
        .join('')
    : `<div class="empty">${ic('card')}<strong>Sem vendas ainda</strong></div>`;

  $('#dash-top').innerHTML = d.mais_vendidos
    .map((p, i) => `<div class="rank-row">
      <span class="rank-pos">${i + 1}</span>${thumb(p)}
      <div class="rank-name">${esc(p.nome)}<small>${esc(p.plataforma)}</small></div>
      <div class="rank-qty">${p.qtd_vendida} <small>un.</small></div>
    </div>`)
    .join('') || `<div class="empty">${ic('box')}<strong>Nenhuma venda registrada</strong></div>`;

  $('#dash-alertas').innerHTML = d.alertas_estoque.length
    ? d.alertas_estoque
        .map((p) => `<div class="list-row">${thumb(p, 'sm')}
          <div class="grow"><strong>${esc(p.nome)}</strong><small>${p.estoque} em estoque · mínimo ${p.estoque_minimo}</small></div>
          ${pill(p.situacao_estoque)}</div>`)
        .join('')
    : `<div class="empty">${ic('check')}<strong>Estoque em dia</strong><small>Nenhum produto abaixo do mínimo.</small></div>`;
  const badge = $('#nav-alertas');
  badge.hidden = !d.alertas_estoque.length;
  badge.textContent = d.alertas_estoque.length;

  const icCat = { Consoles: 'tv', Jogos: 'disc', 'Peças e Acessórios': 'cpu' };
  $('#dash-categorias').innerHTML = d.por_categoria
    .map((c) => `<div class="cat-row">
      <div class="thumb p-Multi">${ic(icCat[c.categoria] || 'box')}</div>
      <div class="grow"><strong>${esc(c.categoria)}</strong><small>${num(c.estoque)} em estoque · ${brlCurto(c.valor_estoque)}</small></div>
      <div class="num">${num(c.unidades)}<small class="muted">vendidos</small></div>
    </div>`)
    .join('');

  tabela($('#dash-ultimas'), [
    { titulo: 'Venda', render: (v) => `<span class="id">#${v.venda_id}</span>` },
    { titulo: 'Cliente', render: (v) => `<div class="cell">${avatar(v.cliente, 'sm')}<strong>${esc(v.cliente)}</strong></div>` },
    { titulo: 'Data', render: (v) => `${data(v.data_venda)} <span class="muted">· ${hora(v.data_venda)}</span>` },
    { titulo: 'Pagamento', render: (v) => pagamento(v.forma_pagamento) },
    { titulo: 'Status', render: (v) => pill(v.status) },
    { titulo: 'Total', render: (v) => `<span class="strong">${brl(v.total)}</span>`, num: true },
  ], d.ultimas_vendas, 'Nenhuma venda registrada');
};

// ================= Nova Venda (PROCEDURE + FUNCTION) =================
let produtosVenda = [];
let clientesVenda = [];
let carrinho = []; // { produto_id, nome, plataforma, categoria, preco, quantidade, estoque }

carregadores.venda = async () => {
  clientesVenda = await api('/api/clientes');
  const sel = $('#venda-cliente');
  const atual = sel.value;
  sel.innerHTML =
    '<option value="">Selecione o cliente…</option>' +
    clientesVenda.map((c) => `<option value="${c.id}">${esc(c.nome)} — ${esc(c.cpf)}</option>`).join('');
  sel.value = atual;
  await listarProdutosVenda();
  await atualizarCarrinho();
};

async function listarProdutosVenda() {
  produtosVenda = await api('/api/produtos?' + qs({ busca: $('#venda-busca').value, categoria: $('#venda-categoria').dataset.valor }));
  desenharProdutosVenda();
}

function desenharProdutosVenda() {
  $('#venda-produtos').innerHTML = produtosVenda.length
    ? produtosVenda
        .map((p) => {
          const noCarrinho = carrinho.find((i) => i.produto_id === p.id)?.quantidade;
          const off = !p.estoque;
          return `<button class="product ${off ? 'off' : ''}" data-id="${p.id}" ${off ? 'aria-disabled="true"' : ''}>
            <div class="cover ${classePlataforma(p.plataforma)}">
              ${ic(iconeProduto(p))}
              <span class="plat">${esc(p.plataforma)}</span>
              ${p.situacao_estoque !== 'OK' ? `<span class="stock-flag">${pill(p.situacao_estoque)}</span>` : ''}
              ${noCarrinho ? `<span class="in-cart">${noCarrinho}</span>` : ''}
            </div>
            <div class="body">
              <div class="name">${esc(p.nome)}</div>
              <div class="meta">${p.estoque} em estoque</div>
              <div class="row"><span class="price">${brl(p.preco)}</span><span class="add">${ic('plus')}</span></div>
            </div>
          </button>`;
        })
        .join('')
    : `<div class="empty big">${ic('search')}<strong>Nenhum produto encontrado</strong><small>Tente outro termo ou categoria.</small></div>`;
}

$('#venda-produtos').addEventListener('click', (e) => {
  const card = e.target.closest('.product');
  if (card && !card.classList.contains('off')) adicionarAoCarrinho(Number(card.dataset.id));
});

function adicionarAoCarrinho(id) {
  const p = produtosVenda.find((x) => x.id === id);
  const item = carrinho.find((i) => i.produto_id === id);
  if (item) {
    if (item.quantidade >= p.estoque) return toast('Limite de estoque', `Só há ${p.estoque} unidade(s) de "${p.nome}".`, true);
    item.quantidade++;
  } else {
    carrinho.push({ produto_id: id, nome: p.nome, plataforma: p.plataforma, categoria: p.categoria, preco: p.preco, quantidade: 1, estoque: p.estoque });
  }
  atualizarCarrinho();
}

function alterarQtd(id, delta) {
  const item = carrinho.find((i) => i.produto_id === id);
  const nova = item.quantidade + delta;
  if (nova < 1) return removerDoCarrinho(id);
  if (nova > item.estoque) return toast('Limite de estoque', `Só há ${item.estoque} unidade(s) disponíveis.`, true);
  item.quantidade = nova;
  atualizarCarrinho();
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter((i) => i.produto_id !== id);
  atualizarCarrinho();
}

$('#venda-carrinho').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-acao]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.acao === 'mais') alterarQtd(id, 1);
  if (btn.dataset.acao === 'menos') alterarQtd(id, -1);
});

// Recalcula os totais; o desconto vem da FUNCTION fn_calcular_desconto no banco
async function atualizarCarrinho() {
  const unidades = carrinho.reduce((s, i) => s + i.quantidade, 0);
  $('#venda-qtd').textContent = unidades;
  // Status do sistema sempre visível: itens no carrinho aparecem no cabeçalho
  const badge = $('#top-carrinho');
  badge.hidden = !unidades;
  badge.textContent = unidades;
  $('#venda-carrinho').innerHTML = carrinho.length
    ? carrinho
        .map((i) => `<div class="cart-item">
          ${thumb(i, 'sm')}
          <div class="info"><strong>${esc(i.nome)}</strong><small>${brl(i.preco)} · ${esc(i.plataforma)}</small></div>
          <div class="right">
            <span class="line">${brl(i.preco * i.quantidade)}</span>
            <div class="stepper">
              <button data-acao="menos" data-id="${i.produto_id}" aria-label="Diminuir">${ic(i.quantidade === 1 ? 'trash' : 'minus')}</button>
              <span>${i.quantidade}</span>
              <button data-acao="mais" data-id="${i.produto_id}" aria-label="Aumentar">${ic('plus')}</button>
            </div>
          </div>
        </div>`)
        .join('')
    : `<div class="empty">${ic('bag')}<strong>Carrinho vazio</strong><small>Clique nos produtos ao lado para adicionar.</small></div>`;

  const subtotal = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const clienteId = $('#venda-cliente').value;
  let desconto = 0;
  if (clienteId) {
    const r = await api(`/api/clientes/${clienteId}/desconto?subtotal=${subtotal.toFixed(2)}`);
    const c = clientesVenda.find((x) => x.id == clienteId);
    const prog = progressoTier(r.nivel, c?.total_gasto || 0);
    desconto = r.desconto;
    $('#venda-pct').textContent = `(${TIERS[r.nivel].pct})`;
    $('#venda-nivel').innerHTML = `<div class="client-box">
      <div class="top">${avatar(c.nome)}<div class="grow"><strong>${esc(c.nome)}</strong><small>Total gasto ${brl(c.total_gasto)}</small></div>${tier(r.nivel)}</div>
      <div class="progress"><div style="width:${prog.pct}%"></div></div>
      <div class="progress-label"><span>${prog.texto}</span><span>${TIERS[r.nivel].pct} off</span></div>
    </div>`;
  } else {
    $('#venda-pct').textContent = '';
    $('#venda-nivel').innerHTML = '';
  }
  $('#venda-subtotal').textContent = brl(subtotal);
  $('#venda-desconto').textContent = '- ' + brl(desconto);
  $('#venda-total').textContent = brl(subtotal - desconto);
  $('#venda-finalizar span').textContent = carrinho.length ? `Finalizar venda · ${brl(subtotal - desconto)}` : 'Finalizar venda';
  desenharProdutosVenda();
}

$('#venda-busca').addEventListener('input', debounce(listarProdutosVenda));
grupo($('#venda-categoria'), listarProdutosVenda);
grupo($('#venda-pagamento'));
$('#venda-cliente').addEventListener('change', atualizarCarrinho);
$('#venda-limpar').addEventListener('click', async () => {
  if (!carrinho.length) return;
  if (await confirmar({ titulo: 'Limpar o pedido?', texto: 'Todos os itens do carrinho serão removidos.', botao: 'Limpar', icone: 'trash' })) {
    carrinho = [];
    atualizarCarrinho();
  }
});

$('#venda-finalizar').addEventListener('click', async () => {
  const cliente_id = $('#venda-cliente').value;
  if (!cliente_id) return toast('Selecione o cliente', 'Escolha quem está comprando antes de finalizar.', true);
  if (!carrinho.length) return toast('Carrinho vazio', 'Adicione pelo menos um produto.', true);
  const botao = $('#venda-finalizar');
  botao.disabled = true;
  try {
    const venda = await api('/api/vendas', {
      method: 'POST',
      body: {
        cliente_id: Number(cliente_id),
        forma_pagamento: $('#venda-pagamento').dataset.valor,
        itens: carrinho.map(({ produto_id, quantidade }) => ({ produto_id, quantidade })),
      },
    });
    carrinho = [];
    mostrarSucesso(venda);
    await carregadores.venda();
  } catch (err) {
    erro(err);
  } finally {
    botao.disabled = false;
  }
});

function mostrarSucesso(v) {
  $('#sucesso-titulo').textContent = `Venda #${v.venda_id} registrada!`;
  $('#sucesso-corpo').innerHTML = `<p>${esc(v.cliente)} · ${PAGAMENTO[v.forma_pagamento].nome} · ${v.qtd_unidades} ${v.qtd_unidades === 1 ? 'item' : 'itens'}</p>
    <div class="receipt">
      <div><span>Subtotal</span><strong>${brl(v.subtotal)}</strong></div>
      <div><span>Desconto fidelidade</span><strong class="green">- ${brl(v.desconto)}</strong></div>
      <div class="big"><span>Total pago</span><strong>${brl(v.total)}</strong></div>
    </div>`;
  const dlg = $('#sucesso');
  dlg.returnValue = '';
  dlg.showModal();
  dlg.addEventListener('close', () => dlg.returnValue === 'relatorio' && irPara('relatorio'), { once: true });
}

// ================= Relatório de Vendas (VIEW + PROCEDURE de cancelamento) =================
carregadores.relatorio = async () => {
  const tabelaEl = $('#rel-tabela');
  tabelaEl.classList.add('loading');
  const vendas = await api('/api/vendas?' + qs({
    inicio: $('#rel-inicio').value,
    fim: $('#rel-fim').value,
    cliente: $('#rel-cliente').value,
    status: $('#rel-status').dataset.valor,
  }));
  tabelaEl.classList.remove('loading');

  const concluidas = vendas.filter((v) => v.status === 'CONCLUIDA');
  const soma = (campo) => concluidas.reduce((s, v) => s + v[campo], 0);
  $('#rel-resumo').innerHTML = [
    kpi({ label: 'Vendas no período', valor: num(vendas.length), icone: 'file', rodape: `${concluidas.length} concluídas · ${vendas.length - concluidas.length} canceladas` }),
    kpi({ label: 'Faturamento', valor: brl(soma('total')), icone: 'dollar', tom: 'var(--cyan)', suave: 'rgba(34,211,238,.12)' }),
    kpi({ label: 'Descontos concedidos', valor: brl(soma('desconto')), icone: 'percent', tom: 'var(--ok)', suave: 'var(--ok-soft)' }),
    kpi({ label: 'Unidades vendidas', valor: num(soma('qtd_unidades')), icone: 'box', tom: 'var(--warn)', suave: 'var(--warn-soft)' }),
  ].join('');

  tabela(tabelaEl, [
    { titulo: 'Venda', render: (v) => `<span class="id">#${v.venda_id}</span>` },
    { titulo: 'Data', render: (v) => `<div class="cell"><div><strong>${data(v.data_venda)}</strong><small>${hora(v.data_venda)}</small></div></div>` },
    { titulo: 'Cliente', render: (v) => `<div class="cell">${avatar(v.cliente, 'sm')}<div><strong>${esc(v.cliente)}</strong><small>${esc(v.cpf)}</small></div></div>` },
    { titulo: 'Pagamento', render: (v) => pagamento(v.forma_pagamento) },
    { titulo: 'Itens', campo: 'qtd_unidades', num: true },
    { titulo: 'Desconto', render: (v) => (v.desconto ? `<span class="green">- ${brl(v.desconto)}</span>` : '<span class="muted">—</span>'), num: true },
    { titulo: 'Total', render: (v) => `<span class="strong">${brl(v.total)}</span>`, num: true },
    { titulo: 'Status', render: (v) => pill(v.status) },
    {
      titulo: '',
      render: (v) => `<div class="row-actions">
        <button class="icon-btn" title="Ver detalhes" onclick="verVenda(${v.venda_id})">${ic('eye')}</button>
        ${v.status === 'CONCLUIDA' ? `<button class="icon-btn danger" title="Cancelar venda" onclick="cancelarVenda(${v.venda_id})">${ic('ban')}</button>` : ''}
      </div>`,
    },
  ], vendas, 'Nenhuma venda encontrada');
};
['#rel-inicio', '#rel-fim'].forEach((s) => $(s).addEventListener('change', () => carregadores.relatorio().catch(erro)));
$('#rel-cliente').addEventListener('input', debounce(() => carregadores.relatorio().catch(erro)));
grupo($('#rel-status'), () => carregadores.relatorio().catch(erro));
$('#rel-limpar').addEventListener('click', () => {
  $('#rel-inicio').value = $('#rel-fim').value = $('#rel-cliente').value = '';
  $('#rel-status').querySelector('button[data-valor=""]').click();
});

async function verVenda(id) {
  try {
    const v = await api('/api/vendas/' + id);
    $('#drawer-sub').textContent = `Venda #${v.venda_id}`;
    $('#drawer-titulo').textContent = v.cliente;
    $('#drawer-corpo').innerHTML = `
      <div>${pill(v.status)}</div>
      <div class="dl">
        <div><span>Data</span><strong>${ic('calendar')}${data(v.data_venda)} · ${hora(v.data_venda)}</strong></div>
        <div><span>Pagamento</span><strong>${ic(PAGAMENTO[v.forma_pagamento].icone)}${PAGAMENTO[v.forma_pagamento].nome}</strong></div>
        <div><span>CPF</span><strong>${esc(v.cpf)}</strong></div>
        <div><span>Itens</span><strong>${v.qtd_unidades} unidade(s)</strong></div>
      </div>
      <div>
        <div class="section-title">Produtos</div>
        <div class="items">${v.itens
          .map((i) => `<div class="item">${thumb(i, 'sm')}
            <div><strong>${esc(i.nome)}</strong><small>${i.quantidade} × ${brl(i.preco_unitario)} · ${esc(i.plataforma)}</small></div>
            <span class="num">${brl(i.subtotal)}</span></div>`)
          .join('')}</div>
      </div>
      <div class="receipt">
        <div><span>Subtotal</span><strong>${brl(v.subtotal)}</strong></div>
        <div><span>Desconto fidelidade</span><strong class="green">- ${brl(v.desconto)}</strong></div>
        <div class="big"><span>Total</span><strong>${brl(v.total)}</strong></div>
      </div>
      ${v.status === 'CONCLUIDA' ? `<button type="button" class="btn danger" onclick="$('#drawer').close(); cancelarVenda(${v.venda_id})">${ic('ban')}Cancelar venda</button>` : ''}`;
    $('#drawer').showModal();
  } catch (err) {
    erro(err);
  }
}

async function cancelarVenda(id) {
  const ok = await confirmar({
    titulo: `Cancelar a venda #${id}?`,
    texto: 'Os itens voltam para o estoque e a venda deixa de contar no faturamento. Essa ação não pode ser desfeita.',
    botao: 'Cancelar venda',
    icone: 'ban',
  });
  if (!ok) return;
  try {
    await api(`/api/vendas/${id}/cancelar`, { method: 'POST' });
    toast(`Venda #${id} cancelada`, 'Os itens foram devolvidos ao estoque.');
    carregadores.relatorio();
  } catch (err) {
    erro(err);
  }
}

// ================= Produtos & Estoque (VIEW + PROCEDURE de entrada) =================
let produtos = [];
carregadores.produtos = async () => {
  const [todos, filtrados, movs] = await Promise.all([
    api('/api/produtos'),
    api('/api/produtos?' + qs({
      busca: $('#prod-busca').value,
      categoria: $('#prod-categoria').dataset.valor,
      situacao: $('#prod-situacao').dataset.valor,
    })),
    api('/api/estoque/movimentacoes'),
  ]);
  produtos = filtrados;

  const alertas = todos.filter((p) => p.situacao_estoque !== 'OK').length;
  $('#nav-alertas').hidden = !alertas;
  $('#nav-alertas').textContent = alertas;
  $('#prod-resumo').innerHTML = [
    kpi({ label: 'Produtos ativos', valor: num(todos.length), icone: 'box' }),
    kpi({ label: 'Unidades em estoque', valor: num(todos.reduce((s, p) => s + p.estoque, 0)), icone: 'grid', tom: 'var(--cyan)', suave: 'rgba(34,211,238,.12)' }),
    kpi({ label: 'Valor em estoque', valor: brl(todos.reduce((s, p) => s + p.valor_em_estoque, 0)), icone: 'dollar', tom: 'var(--ok)', suave: 'var(--ok-soft)' }),
    kpi({ label: 'Alertas de estoque', valor: num(alertas), icone: 'alert', tom: alertas ? 'var(--bad)' : 'var(--ok)', suave: alertas ? 'var(--bad-soft)' : 'var(--ok-soft)' }),
  ].join('');

  tabela($('#prod-tabela'), [
    { titulo: 'Produto', render: (p) => `<div class="cell">${thumb(p)}<div><strong>${esc(p.nome)}</strong><small>${esc(p.plataforma)} · ${esc(p.categoria)}</small></div></div>` },
    { titulo: 'Preço', render: (p) => `<span class="strong">${brl(p.preco)}</span>`, num: true },
    {
      titulo: 'Estoque',
      num: true,
      render: (p) => {
        const ref = Math.max(p.estoque_minimo * 3, p.estoque, 1);
        return `<div class="meter" title="Mínimo: ${p.estoque_minimo}"><div class="track"><div class="fill ${p.situacao_estoque}" style="width:${(p.estoque / ref) * 100}%"></div></div><b>${p.estoque}</b></div>`;
      },
    },
    { titulo: 'Vendidos', campo: 'qtd_vendida', num: true },
    { titulo: 'Situação', render: (p) => pill(p.situacao_estoque) },
    {
      titulo: '',
      render: (p) => `<div class="row-actions">
        <button class="icon-btn" title="Entrada de estoque" onclick="entradaEstoque(${p.id})">${ic('truck')}</button>
        <button class="icon-btn" title="Editar" onclick="editarProduto(${p.id})">${ic('edit')}</button>
        <button class="icon-btn danger" title="Excluir" onclick="excluirProduto(${p.id})">${ic('trash')}</button>
      </div>`,
    },
  ], produtos, 'Nenhum produto encontrado');

  $('#prod-movimentacoes').innerHTML = movs.length
    ? movs
        .slice(0, 40)
        .map((m) => `<div class="feed-item">
          <span class="feed-ico ${m.tipo}">${ic(m.tipo === 'ENTRADA' ? 'in' : 'out')}</span>
          <div style="min-width:0"><strong>${esc(m.produto)}</strong><small>${esc(m.motivo)}</small></div>
          <div class="q ${m.tipo}">${m.tipo === 'ENTRADA' ? '+' : '−'}${m.quantidade}<small class="muted">${tempoRelativo(m.data)}</small></div>
        </div>`)
        .join('')
    : `<div class="empty">${ic('truck')}<strong>Sem movimentações</strong></div>`;
};
const recarregarProdutos = () => carregadores.produtos().catch(erro);
$('#prod-busca').addEventListener('input', debounce(recarregarProdutos));
grupo($('#prod-categoria'), recarregarProdutos);
grupo($('#prod-situacao'), recarregarProdutos);

function camposProduto(p = {}) {
  const plataformas = PLATAFORMAS.includes(p.plataforma) || !p.plataforma ? PLATAFORMAS : [...PLATAFORMAS, p.plataforma];
  return [
    { nome: 'nome', rotulo: 'Nome do produto', valor: p.nome, obrigatorio: true, full: true, dica: 'Ex.: PlayStation 5 Slim 1TB' },
    { nome: 'categoria_id', rotulo: 'Categoria', tipo: 'select', opcoes: categorias, valor: p.categoria_id },
    { nome: 'plataforma', rotulo: 'Plataforma', tipo: 'select', opcoes: plataformas.map((x) => ({ id: x, nome: x })), valor: p.plataforma },
    { nome: 'preco', rotulo: 'Preço (R$)', tipo: 'number', passo: '0.01', valor: p.preco, obrigatorio: true },
    { nome: 'estoque_minimo', rotulo: 'Estoque mínimo', tipo: 'number', valor: p.estoque_minimo ?? 2, obrigatorio: true },
  ];
}

$('#prod-novo').addEventListener('click', () =>
  abrirFormulario(
    'Novo produto',
    [...camposProduto(), { nome: 'estoque', rotulo: 'Estoque inicial', tipo: 'number', valor: 0, full: true }],
    async (d) => {
      await api('/api/produtos', { method: 'POST', body: d });
      toast('Produto cadastrado', d.nome);
      recarregarProdutos();
    },
    'Cadastrar produto'
  )
);

function editarProduto(id) {
  const p = produtos.find((x) => x.id === id);
  abrirFormulario('Editar produto', camposProduto(p), async (d) => {
    await api('/api/produtos/' + id, { method: 'PUT', body: d });
    toast('Produto atualizado', d.nome);
    recarregarProdutos();
  });
}

async function excluirProduto(id) {
  const p = produtos.find((x) => x.id === id);
  const ok = await confirmar({ titulo: 'Excluir produto?', texto: `"${p.nome}" sai do catálogo. O histórico de vendas é mantido.`, botao: 'Excluir', icone: 'trash' });
  if (!ok) return;
  try {
    await api('/api/produtos/' + id, { method: 'DELETE' });
    toast('Produto excluído', p.nome);
    recarregarProdutos();
  } catch (err) {
    erro(err);
  }
}

function entradaEstoque(id) {
  const p = produtos.find((x) => x.id === id);
  abrirFormulario(
    `Entrada de estoque — ${p.nome}`,
    [
      { nome: 'quantidade', rotulo: 'Quantidade recebida', tipo: 'number', valor: 1, min: 1, obrigatorio: true },
      { nome: 'atual', rotulo: 'Estoque atual', valor: `${p.estoque} unidade(s)` },
      { nome: 'motivo', rotulo: 'Motivo / nota fiscal', valor: 'Compra de fornecedor', full: true },
    ],
    async (d) => {
      await api('/api/estoque/entrada', { method: 'POST', body: { produto_id: id, quantidade: Number(d.quantidade), motivo: d.motivo } });
      toast('Entrada registrada', `+${d.quantidade} un. de ${p.nome}`);
      recarregarProdutos();
    },
    'Registrar entrada'
  );
  $('#modal-corpo [name=atual]').disabled = true;
}

// ================= Clientes (FUNCTION fn_nivel_cliente) =================
let clientes = [];
carregadores.clientes = async () => {
  clientes = await api('/api/clientes');
  const conta = (n) => clientes.filter((c) => c.nivel === n).length;
  const info = {
    BRONZE: ['Bronze', 'Até R$ 1.999 em compras · 0% off'],
    PRATA: ['Prata', 'A partir de R$ 2.000 · 5% off'],
    OURO: ['Ouro', 'A partir de R$ 5.000 · 10% off'],
  };
  $('#cli-tiers').innerHTML = Object.entries(info)
    .map(([n, [nome, desc]]) => `<div class="tier-card ${n}">
      <div class="medal">${ic(n === 'OURO' ? 'crown' : 'tag')}</div>
      <div class="grow"><h3>${nome}</h3><p>${desc}</p></div>
      <div class="n">${conta(n)}<small>clientes</small></div>
    </div>`)
    .join('');
  desenharClientes();
};

function desenharClientes() {
  const termo = $('#cli-busca').value.trim().toLowerCase();
  const lista = clientes.filter((c) => !termo || [c.nome, c.cpf, c.email].some((v) => String(v ?? '').toLowerCase().includes(termo)));
  $('#cli-tabela').innerHTML = lista.length
    ? lista
        .map((c) => {
          const prog = progressoTier(c.nivel, c.total_gasto);
          return `<div class="card client-card">
            <div class="top">${avatar(c.nome, 'lg')}<div class="grow"><strong>${esc(c.nome)}</strong><small>${esc(c.cpf)}</small></div>${tier(c.nivel)}</div>
            <div class="contact">
              <div>${ic('mail')}${esc(c.email || 'Sem e-mail')}</div>
              <div>${ic('phone')}${esc(c.telefone || 'Sem telefone')}</div>
            </div>
            <div class="spent"><span>Total gasto</span><strong>${brl(c.total_gasto)}</strong></div>
            <div class="progress"><div style="width:${prog.pct}%"></div></div>
            <div class="progress-label"><span>${prog.texto}</span></div>
            <div class="actions">
              <button class="icon-btn" title="Editar" onclick="editarCliente(${c.id})">${ic('edit')}</button>
              <button class="icon-btn danger" title="Excluir" onclick="excluirCliente(${c.id})">${ic('trash')}</button>
            </div>
          </div>`;
        })
        .join('')
    : `<div class="empty big">${ic('users')}<strong>Nenhum cliente encontrado</strong></div>`;
}
$('#cli-busca').addEventListener('input', desenharClientes);

function camposCliente(c = {}) {
  return [
    { nome: 'nome', rotulo: 'Nome completo', valor: c.nome, obrigatorio: true, full: true },
    { nome: 'cpf', rotulo: 'CPF', valor: c.cpf, obrigatorio: true, dica: '000.000.000-00' },
    { nome: 'telefone', rotulo: 'Telefone', valor: c.telefone, dica: '(86) 99999-0000' },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', valor: c.email, full: true, dica: 'cliente@email.com' },
  ];
}

$('#cli-novo').addEventListener('click', () =>
  abrirFormulario('Novo cliente', camposCliente(), async (d) => {
    await api('/api/clientes', { method: 'POST', body: d });
    toast('Cliente cadastrado', d.nome);
    carregadores.clientes();
  }, 'Cadastrar cliente')
);

function editarCliente(id) {
  abrirFormulario('Editar cliente', camposCliente(clientes.find((c) => c.id === id)), async (d) => {
    await api('/api/clientes/' + id, { method: 'PUT', body: d });
    toast('Cliente atualizado', d.nome);
    carregadores.clientes();
  });
}

async function excluirCliente(id) {
  const c = clientes.find((x) => x.id === id);
  const ok = await confirmar({ titulo: 'Excluir cliente?', texto: `Remover "${c.nome}" do cadastro.`, botao: 'Excluir', icone: 'trash' });
  if (!ok) return;
  try {
    await api('/api/clientes/' + id, { method: 'DELETE' });
    toast('Cliente excluído', c.nome);
    carregadores.clientes();
  } catch (err) {
    erro(err);
  }
}

// ================= Início =================
const telaDaUrl = () => (TITULOS[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard');
window.addEventListener('popstate', () => irPara(telaDaUrl()));
history.replaceState(null, '', '#' + telaDaUrl());
carregarCategorias().then(() => irPara(telaDaUrl())).catch(erro);
