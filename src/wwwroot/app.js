// ================= Utilidades =================
const $ = (sel) => document.querySelector(sel);
const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (d) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Monta a query string ignorando filtros vazios
const qs = (filtros) =>
  new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== '' && v != null)).toString();
const tag = (t) => `<span class="tag ${esc(t)}">${esc(t)}</span>`;

async function api(url, opcoes = {}) {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || 'Erro na requisição');
  return dados;
}

function toast(msg, erro = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = erro ? 'mostrar erro' : 'mostrar';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ''), 3500);
}

// Monta uma tabela a partir de colunas [{ titulo, campo | render, num }]
function tabela(el, colunas, linhas) {
  const cab = colunas.map((c) => `<th class="${c.num ? 'num' : ''}">${c.titulo}</th>`).join('');
  const corpo = linhas.length
    ? linhas
        .map(
          (l) =>
            '<tr>' +
            colunas
              .map((c) => `<td class="${c.num ? 'num' : ''}">${c.render ? c.render(l) : esc(l[c.campo])}</td>`)
              .join('') +
            '</tr>'
        )
        .join('')
    : `<tr><td colspan="${colunas.length}" class="vazio">Nenhum registro</td></tr>`;
  el.innerHTML = `<thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody>`;
}

// Modal com formulário; campos: [{ nome, rotulo, tipo, valor, opcoes, obrigatorio }]
function abrirFormulario(titulo, campos, aoSalvar) {
  $('#modal-titulo').textContent = titulo;
  $('#modal-corpo').innerHTML = campos
    .map((c) => {
      const req = c.obrigatorio ? 'required' : '';
      const input =
        c.tipo === 'select'
          ? `<select name="${c.nome}" ${req}>${c.opcoes
              .map((o) => `<option value="${o.id}" ${o.id == c.valor ? 'selected' : ''}>${esc(o.nome)}</option>`)
              .join('')}</select>`
          : `<input name="${c.nome}" type="${c.tipo || 'text'}" value="${esc(c.valor ?? '')}" ${req}
               ${c.tipo === 'number' ? `step="${c.passo || 1}" min="0"` : ''}>`;
      return `<label>${c.rotulo}${input}</label>`;
    })
    .join('');
  const modal = $('#modal');
  const form = $('#modal-form');
  form.onsubmit = async (e) => {
    if (e.submitter?.value !== 'ok') return;
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(form));
    try {
      await aoSalvar(dados);
      modal.close();
    } catch (err) {
      toast(err.message, true);
    }
  };
  modal.showModal();
}

// ================= Navegação =================
const carregadores = {};
document.querySelectorAll('#menu button').forEach((btn) =>
  btn.addEventListener('click', () => {
    document.querySelectorAll('#menu button').forEach((b) => b.classList.toggle('ativo', b === btn));
    document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === `tela-${btn.dataset.tela}`));
    carregadores[btn.dataset.tela]();
  })
);

let categorias = [];
async function carregarCategorias() {
  categorias = await api('/api/produtos/categorias');
  for (const sel of ['#venda-categoria', '#prod-categoria']) {
    $(sel).innerHTML += categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  }
}

// ================= Dashboard (VIEWs) =================
carregadores.dashboard = async () => {
  const d = await api('/api/dashboard');
  $('#dash-cards').innerHTML = [
    ['Faturamento', brl(d.resumo.faturamento)],
    ['Vendas concluídas', d.resumo.qtd_vendas],
    ['Ticket médio', brl(d.resumo.ticket_medio)],
    ['Descontos concedidos', brl(d.resumo.descontos)],
  ]
    .map(([t, v]) => `<div class="card"><span>${t}</span><strong>${v}</strong></div>`)
    .join('');
  tabela($('#dash-top'), [
    { titulo: 'Produto', campo: 'nome' },
    { titulo: 'Plataforma', campo: 'plataforma' },
    { titulo: 'Vendidos', campo: 'qtd_vendida', num: true },
  ], d.mais_vendidos);
  tabela($('#dash-alertas'), [
    { titulo: 'Produto', campo: 'nome' },
    { titulo: 'Estoque', campo: 'estoque', num: true },
    { titulo: 'Mínimo', campo: 'estoque_minimo', num: true },
    { titulo: 'Situação', render: (l) => tag(l.situacao_estoque) },
  ], d.alertas_estoque);
  tabela($('#dash-categorias'), [
    { titulo: 'Categoria', campo: 'categoria' },
    { titulo: 'Unid. vendidas', campo: 'unidades', num: true },
    { titulo: 'Em estoque', campo: 'estoque', num: true },
  ], d.por_categoria);
  tabela($('#dash-ultimas'), [
    { titulo: '#', campo: 'venda_id' },
    { titulo: 'Data', render: (l) => dataHora(l.data_venda) },
    { titulo: 'Cliente', campo: 'cliente' },
    { titulo: 'Total', render: (l) => brl(l.total), num: true },
    { titulo: 'Status', render: (l) => tag(l.status) },
  ], d.ultimas_vendas);
};

// ================= Nova Venda (PROCEDURE + FUNCTION) =================
let produtosVenda = [];
let carrinho = []; // { produto_id, nome, preco, quantidade, estoque }

carregadores.venda = async () => {
  const clientes = await api('/api/clientes');
  const sel = $('#venda-cliente');
  const atual = sel.value;
  sel.innerHTML =
    '<option value="">Selecione o cliente...</option>' +
    clientes.map((c) => `<option value="${c.id}">${esc(c.nome)} — ${esc(c.cpf)}</option>`).join('');
  sel.value = atual;
  await listarProdutosVenda();
  await atualizarCarrinho();
};

async function listarProdutosVenda() {
  const params = qs({ busca: $('#venda-busca').value, categoria: $('#venda-categoria').value });
  produtosVenda = await api('/api/produtos?' + params);
  tabela($('#venda-produtos'), [
    { titulo: 'Produto', campo: 'nome' },
    { titulo: 'Categoria', campo: 'categoria' },
    { titulo: 'Plataforma', campo: 'plataforma' },
    { titulo: 'Preço', render: (p) => brl(p.preco), num: true },
    { titulo: 'Estoque', render: (p) => `${p.estoque} ${p.situacao_estoque !== 'OK' ? tag(p.situacao_estoque) : ''}`, num: true },
    {
      titulo: '',
      render: (p) => `<button class="mini" onclick="adicionarAoCarrinho(${p.id})" ${p.estoque ? '' : 'disabled'}>+ Adicionar</button>`,
    },
  ], produtosVenda);
}

function adicionarAoCarrinho(id) {
  const p = produtosVenda.find((x) => x.id === id);
  const item = carrinho.find((i) => i.produto_id === id);
  if (item) {
    if (item.quantidade >= p.estoque) return toast('Quantidade máxima em estoque atingida', true);
    item.quantidade++;
  } else {
    carrinho.push({ produto_id: id, nome: p.nome, preco: p.preco, quantidade: 1, estoque: p.estoque });
  }
  atualizarCarrinho();
}

function alterarQtd(id, valor) {
  const item = carrinho.find((i) => i.produto_id === id);
  item.quantidade = Math.max(1, Math.min(item.estoque, parseInt(valor, 10) || 1));
  atualizarCarrinho();
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter((i) => i.produto_id !== id);
  atualizarCarrinho();
}

// Recalcula os totais; o desconto vem da FUNCTION fn_calcular_desconto no banco
async function atualizarCarrinho() {
  tabela($('#venda-carrinho'), [
    { titulo: 'Item', campo: 'nome' },
    {
      titulo: 'Qtd',
      render: (i) => `<input class="qtd" type="number" min="1" max="${i.estoque}" value="${i.quantidade}"
                        onchange="alterarQtd(${i.produto_id}, this.value)">`,
    },
    { titulo: 'Valor', render: (i) => brl(i.preco * i.quantidade), num: true },
    { titulo: '', render: (i) => `<button class="mini perigo" onclick="removerDoCarrinho(${i.produto_id})">✕</button>` },
  ], carrinho);

  const subtotal = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const clienteId = $('#venda-cliente').value;
  let desconto = 0;
  $('#venda-nivel').innerHTML = '';
  if (clienteId) {
    const r = await api(`/api/clientes/${clienteId}/desconto?subtotal=${subtotal.toFixed(2)}`);
    desconto = r.desconto;
    const pct = { BRONZE: '0%', PRATA: '5%', OURO: '10%' }[r.nivel];
    $('#venda-nivel').innerHTML = `Nível de fidelidade: ${tag(r.nivel)} — desconto de ${pct}`;
  }
  $('#venda-subtotal').textContent = brl(subtotal);
  $('#venda-desconto').textContent = '- ' + brl(desconto);
  $('#venda-total').textContent = brl(subtotal - desconto);
}

$('#venda-busca').addEventListener('input', listarProdutosVenda);
$('#venda-categoria').addEventListener('change', listarProdutosVenda);
$('#venda-cliente').addEventListener('change', atualizarCarrinho);

$('#venda-finalizar').addEventListener('click', async () => {
  const cliente_id = $('#venda-cliente').value;
  if (!cliente_id) return toast('Selecione o cliente', true);
  if (!carrinho.length) return toast('Adicione produtos ao carrinho', true);
  try {
    const venda = await api('/api/vendas', {
      method: 'POST',
      body: {
        cliente_id: Number(cliente_id),
        forma_pagamento: $('#venda-pagamento').value,
        itens: carrinho.map(({ produto_id, quantidade }) => ({ produto_id, quantidade })),
      },
    });
    toast(`Venda #${venda.venda_id} registrada! Total ${brl(venda.total)}`);
    carrinho = [];
    await carregadores.venda();
  } catch (err) {
    toast(err.message, true);
  }
});

// ================= Relatório de Vendas (VIEW + PROCEDURE de cancelamento) =================
carregadores.relatorio = async () => {
  const params = qs({
    inicio: $('#rel-inicio').value,
    fim: $('#rel-fim').value,
    cliente: $('#rel-cliente').value,
    status: $('#rel-status').value,
  });
  const vendas = await api('/api/vendas?' + params);
  const concluidas = vendas.filter((v) => v.status === 'CONCLUIDA');
  const soma = (campo) => concluidas.reduce((s, v) => s + v[campo], 0);
  $('#rel-resumo').innerHTML = [
    ['Vendas no período', vendas.length],
    ['Faturamento', brl(soma('total'))],
    ['Descontos', brl(soma('desconto'))],
    ['Unidades vendidas', soma('qtd_unidades')],
  ]
    .map(([t, v]) => `<div class="card"><span>${t}</span><strong>${v}</strong></div>`)
    .join('');
  tabela($('#rel-tabela'), [
    { titulo: '#', campo: 'venda_id' },
    { titulo: 'Data', render: (v) => dataHora(v.data_venda) },
    { titulo: 'Cliente', campo: 'cliente' },
    { titulo: 'Pagamento', campo: 'forma_pagamento' },
    { titulo: 'Itens', campo: 'qtd_unidades', num: true },
    { titulo: 'Subtotal', render: (v) => brl(v.subtotal), num: true },
    { titulo: 'Desconto', render: (v) => brl(v.desconto), num: true },
    { titulo: 'Total', render: (v) => `<strong>${brl(v.total)}</strong>`, num: true },
    { titulo: 'Status', render: (v) => tag(v.status) },
    {
      titulo: '',
      render: (v) =>
        `<button class="mini" onclick="verVenda(${v.venda_id})">Detalhes</button>
         ${v.status === 'CONCLUIDA' ? `<button class="mini perigo" onclick="cancelarVenda(${v.venda_id})">Cancelar</button>` : ''}`,
    },
  ], vendas);
};
$('#rel-filtrar').addEventListener('click', carregadores.relatorio);

async function verVenda(id) {
  const v = await api('/api/vendas/' + id);
  $('#modal-titulo').textContent = `Venda #${v.venda_id} — ${v.cliente}`;
  $('#modal-corpo').innerHTML = `<table id="det-itens"></table>
    <div class="totais">
      <div><span>Subtotal</span><strong>${brl(v.subtotal)}</strong></div>
      <div class="desc"><span>Desconto</span><strong>- ${brl(v.desconto)}</strong></div>
      <div class="total"><span>Total</span><strong>${brl(v.total)}</strong></div>
    </div>`;
  tabela($('#det-itens'), [
    { titulo: 'Produto', campo: 'nome' },
    { titulo: 'Qtd', campo: 'quantidade', num: true },
    { titulo: 'Unitário', render: (i) => brl(i.preco_unitario), num: true },
    { titulo: 'Subtotal', render: (i) => brl(i.subtotal), num: true },
  ], v.itens);
  $('#modal-form').onsubmit = null;
  $('#modal-ok').style.display = 'none';
  $('#modal').showModal();
  $('#modal').addEventListener('close', () => ($('#modal-ok').style.display = ''), { once: true });
}

async function cancelarVenda(id) {
  if (!confirm(`Cancelar a venda #${id}? Os itens voltarão ao estoque.`)) return;
  try {
    await api(`/api/vendas/${id}/cancelar`, { method: 'POST' });
    toast(`Venda #${id} cancelada`);
    carregadores.relatorio();
  } catch (err) {
    toast(err.message, true);
  }
}

// ================= Produtos & Estoque (VIEW + PROCEDURE de entrada) =================
let produtos = [];
carregadores.produtos = async () => {
  const params = qs({
    busca: $('#prod-busca').value,
    categoria: $('#prod-categoria').value,
    situacao: $('#prod-situacao').value,
  });
  produtos = await api('/api/produtos?' + params);
  tabela($('#prod-tabela'), [
    { titulo: 'Produto', campo: 'nome' },
    { titulo: 'Categoria', campo: 'categoria' },
    { titulo: 'Plataforma', campo: 'plataforma' },
    { titulo: 'Preço', render: (p) => brl(p.preco), num: true },
    { titulo: 'Estoque', campo: 'estoque', num: true },
    { titulo: 'Mín.', campo: 'estoque_minimo', num: true },
    { titulo: 'Vendidos', campo: 'qtd_vendida', num: true },
    { titulo: 'Situação', render: (p) => tag(p.situacao_estoque) },
    {
      titulo: '',
      render: (p) => `<button class="mini" onclick="entradaEstoque(${p.id})">+ Entrada</button>
        <button class="mini" onclick="editarProduto(${p.id})">Editar</button>
        <button class="mini perigo" onclick="excluirProduto(${p.id})">Excluir</button>`,
    },
  ], produtos);

  const movs = await api('/api/estoque/movimentacoes');
  tabela($('#prod-movimentacoes'), [
    { titulo: 'Data', render: (m) => dataHora(m.data) },
    { titulo: 'Produto', campo: 'produto' },
    { titulo: 'Tipo', render: (m) => `<span class="tag ${m.tipo === 'ENTRADA' ? 'OK' : 'BAIXO'}">${m.tipo}</span>` },
    { titulo: 'Qtd', campo: 'quantidade', num: true },
    { titulo: 'Motivo', campo: 'motivo' },
  ], movs);
};
['#prod-busca', '#prod-categoria', '#prod-situacao'].forEach((s) =>
  $(s).addEventListener(s === '#prod-busca' ? 'input' : 'change', carregadores.produtos)
);

function camposProduto(p = {}) {
  return [
    { nome: 'nome', rotulo: 'Nome', valor: p.nome, obrigatorio: true },
    { nome: 'categoria_id', rotulo: 'Categoria', tipo: 'select', opcoes: categorias, valor: p.categoria_id },
    { nome: 'plataforma', rotulo: 'Plataforma (PS5, Xbox Series, Switch, PC, Multi...)', valor: p.plataforma, obrigatorio: true },
    { nome: 'preco', rotulo: 'Preço (R$)', tipo: 'number', passo: '0.01', valor: p.preco, obrigatorio: true },
    { nome: 'estoque_minimo', rotulo: 'Estoque mínimo', tipo: 'number', valor: p.estoque_minimo ?? 2, obrigatorio: true },
  ];
}

$('#prod-novo').addEventListener('click', () =>
  abrirFormulario(
    'Novo produto',
    [...camposProduto(), { nome: 'estoque', rotulo: 'Estoque inicial', tipo: 'number', valor: 0 }],
    async (d) => {
      await api('/api/produtos', { method: 'POST', body: d });
      toast('Produto cadastrado');
      carregadores.produtos();
    }
  )
);

function editarProduto(id) {
  const p = produtos.find((x) => x.id === id);
  abrirFormulario('Editar produto', camposProduto(p), async (d) => {
    await api('/api/produtos/' + id, { method: 'PUT', body: d });
    toast('Produto atualizado');
    carregadores.produtos();
  });
}

async function excluirProduto(id) {
  if (!confirm('Excluir este produto?')) return;
  try {
    await api('/api/produtos/' + id, { method: 'DELETE' });
    toast('Produto excluído');
    carregadores.produtos();
  } catch (err) {
    toast(err.message, true);
  }
}

function entradaEstoque(id) {
  const p = produtos.find((x) => x.id === id);
  abrirFormulario(
    `Entrada de estoque — ${p.nome}`,
    [
      { nome: 'quantidade', rotulo: 'Quantidade recebida', tipo: 'number', valor: 1, obrigatorio: true },
      { nome: 'motivo', rotulo: 'Motivo / Nota fiscal', valor: 'Compra de fornecedor' },
    ],
    async (d) => {
      await api('/api/estoque/entrada', {
        method: 'POST',
        body: { produto_id: id, quantidade: Number(d.quantidade), motivo: d.motivo },
      });
      toast('Entrada registrada');
      carregadores.produtos();
    }
  );
}

// ================= Clientes (FUNCTION fn_nivel_cliente) =================
let clientes = [];
carregadores.clientes = async () => {
  clientes = await api('/api/clientes');
  tabela($('#cli-tabela'), [
    { titulo: 'Nome', campo: 'nome' },
    { titulo: 'CPF', campo: 'cpf' },
    { titulo: 'E-mail', campo: 'email' },
    { titulo: 'Telefone', campo: 'telefone' },
    { titulo: 'Total gasto', render: (c) => brl(c.total_gasto), num: true },
    { titulo: 'Nível', render: (c) => tag(c.nivel) },
    {
      titulo: '',
      render: (c) => `<button class="mini" onclick="editarCliente(${c.id})">Editar</button>
        <button class="mini perigo" onclick="excluirCliente(${c.id})">Excluir</button>`,
    },
  ], clientes);
};

function camposCliente(c = {}) {
  return [
    { nome: 'nome', rotulo: 'Nome', valor: c.nome, obrigatorio: true },
    { nome: 'cpf', rotulo: 'CPF', valor: c.cpf, obrigatorio: true },
    { nome: 'email', rotulo: 'E-mail', tipo: 'email', valor: c.email },
    { nome: 'telefone', rotulo: 'Telefone', valor: c.telefone },
  ];
}

$('#cli-novo').addEventListener('click', () =>
  abrirFormulario('Novo cliente', camposCliente(), async (d) => {
    await api('/api/clientes', { method: 'POST', body: d });
    toast('Cliente cadastrado');
    carregadores.clientes();
  })
);

function editarCliente(id) {
  abrirFormulario('Editar cliente', camposCliente(clientes.find((c) => c.id === id)), async (d) => {
    await api('/api/clientes/' + id, { method: 'PUT', body: d });
    toast('Cliente atualizado');
    carregadores.clientes();
  });
}

async function excluirCliente(id) {
  if (!confirm('Excluir este cliente?')) return;
  try {
    await api('/api/clientes/' + id, { method: 'DELETE' });
    toast('Cliente excluído');
    carregadores.clientes();
  } catch (err) {
    toast(err.message, true);
  }
}

// ================= Início =================
carregarCategorias().then(carregadores.dashboard).catch((err) => toast(err.message, true));
