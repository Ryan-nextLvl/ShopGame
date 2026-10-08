# 🎮 ShopGame — Sistema de Loja de Games

Sistema web para uma loja de **consoles, jogos e peças/acessórios de videogame**, com vendas, controle de estoque, clientes com programa de fidelidade e relatórios. O projeto usa **View, Function e Procedure** no PostgreSQL integradas às telas da aplicação.

---

## Identificação

| | |
|---|---|
| **Integrante** | Ryan Porto Antunes |
| **Disciplina** | Projeto de Banco de Dados |
| **Professor** | Anderson Soares |
| **Instituição** | UNIFSA — Centro Universitário Santo Agostinho |

---

## Sobre o projeto

Lojas de games trabalham com produtos caros (consoles), produtos de giro rápido (jogos) e muitas peças pequenas (analógicos, coolers, cabos, controles). Sem um sistema, é comum vender um item que não está mais no estoque, perder o histórico do que entrou e saiu e não ter clareza de quanto se faturou.

O **ShopGame** resolve isso com:

- **Nova Venda (PDV):** carrinho com vários produtos; a venda é registrada no banco em uma única transação, com baixa de estoque automática e desconto de fidelidade.
- **Relatório de Vendas:** filtros por período, cliente e status, totais do período, detalhes e cancelamento de vendas (com devolução ao estoque).
- **Produtos & Estoque:** cadastro de consoles, jogos e peças; situação do estoque (OK / BAIXO / ESGOTADO); entrada de mercadoria e histórico de movimentações.
- **Clientes:** cadastro e nível de fidelidade (Bronze / Prata / Ouro) calculado pelo banco.
- **Dashboard:** faturamento, ticket médio, descontos, mais vendidos, alertas de estoque e vendas por categoria.

---

## Telas do sistema e operações (CRUD)

A aplicação tem uma navegação no topo com 5 telas. Cada tela tem um endereço próprio (ex.: `http://localhost:5000/#produtos`), então o botão **Voltar** do navegador funciona e a tela pode ser salva nos favoritos.

| Tela | Endereço | Entidade | C | R | U | D |
|---|---|---|:-:|:-:|:-:|:-:|
| Início (Dashboard) | `#dashboard` | Vendas / Produtos (leitura consolidada) | | ✅ | | |
| Nova venda (PDV) | `#venda` | Vendas + Itens da venda | ✅ | ✅ | | |
| Relatório de vendas | `#relatorio` | Vendas | | ✅ | ✅ (cancelar) | |
| Produtos & estoque | `#produtos` | Produtos + Movimentações de estoque | ✅ | ✅ | ✅ | ✅ (lógica) |
| Clientes | `#clientes` | Clientes | ✅ | ✅ | ✅ | ✅ |

### 1. Início (Dashboard) — `#dashboard`

Painel de acompanhamento da loja. Somente leitura.

- **Banner** com saudação e atalhos para **Abrir caixa (PDV)** e **Ver relatório**.
- **Indicadores (KPIs):** faturamento total, vendas concluídas, ticket médio e descontos de fidelidade, com variação dos últimos 7 dias.
- **Faturamento diário** (gráfico de barras dos últimos 30 dias, com tooltip por mouse ou teclado).
- **Formas de pagamento**, **Mais vendidos**, **Alertas de estoque**, **Por categoria** e **Últimas vendas**.

| Operação | Na tela | API | Banco |
|---|---|---|---|
| **Read** | Carrega todos os cards ao abrir a tela | `GET /api/dashboard` | `vw_relatorio_vendas`, `vw_produtos_estoque` |

### 2. Nova venda (PDV) — `#venda`

Ponto de venda em duas colunas: **vitrine de produtos** à esquerda e **pedido atual** (carrinho) fixo à direita.

1. Busque o produto (atalho `/`) ou filtre por categoria (Consoles, Jogos, Peças e Acessórios).
2. Clique no card do produto para adicioná-lo; use **– / +** no carrinho para mudar a quantidade (o sistema não deixa passar do estoque disponível; produtos esgotados ficam desabilitados).
3. Escolha o **cliente** — o nível de fidelidade, a barra de progresso para o próximo nível e o desconto aparecem na hora.
4. Escolha a **forma de pagamento** (PIX, Crédito, Débito, Dinheiro) e clique em **Finalizar venda**.
5. Um recibo confirma a venda, com opção de abri-la no relatório.

| Operação | Na tela | API | Banco |
|---|---|---|---|
| **Read** (produtos) | Vitrine com busca e filtro por categoria | `GET /api/produtos?busca=&categoria=` | `vw_produtos_estoque` |
| **Read** (clientes) | Lista de clientes no seletor | `GET /api/clientes` | `fn_nivel_cliente` |
| **Read** (desconto) | Prévia do desconto ao escolher o cliente | `GET /api/clientes/{id}/desconto?subtotal=` | `fn_nivel_cliente`, `fn_calcular_desconto` |
| **Create** | Botão **Finalizar venda** | `POST /api/vendas` | `CALL sp_realizar_venda(...)` |

### 3. Relatório de vendas — `#relatorio`

Consulta e auditoria de todas as vendas.

- **Filtros:** período (De / Até), busca por cliente e status (Todas / Concluídas / Canceladas); **Limpar filtros** volta ao padrão.
- **Totais do período:** quantidade de vendas, faturamento, descontos e unidades vendidas.
- **Tabela de vendas** com ações por linha: 👁 **Ver detalhes** (painel lateral com itens e recibo) e ⊘ **Cancelar venda** (pede confirmação antes).

| Operação | Na tela | API | Banco |
|---|---|---|---|
| **Read** (lista) | Tabela filtrada | `GET /api/vendas?inicio=&fim=&cliente=&status=` | `vw_relatorio_vendas` |
| **Read** (detalhe) | Ícone 👁 | `GET /api/vendas/{id}` | `vw_relatorio_vendas` + `itens_venda` |
| **Update** (cancelar) | Ícone ⊘ ou botão no detalhe | `POST /api/vendas/{id}/cancelar` | `CALL sp_cancelar_venda(...)` — status vira `CANCELADA` e os itens voltam ao estoque |

> Vendas não são excluídas: o cancelamento preserva o histórico para auditoria.

### 4. Produtos & estoque — `#produtos`

Catálogo de consoles, jogos e peças com controle de estoque.

- **Indicadores:** produtos ativos, unidades em estoque, valor em estoque e alertas (também exibidos como contador no menu).
- **Filtros:** busca, categoria e situação (OK / Baixo / Esgotado).
- **Tabela** com barra de nível de estoque e ações por linha; ao lado, o feed de **Movimentações** (entradas e saídas recentes).

| Operação | Na tela | API | Banco |
|---|---|---|---|
| **Create** | Botão **Novo produto** (nome, categoria, plataforma, preço, estoque mínimo e estoque inicial) | `POST /api/produtos` | `INSERT INTO produtos` + `CALL sp_registrar_entrada_estoque(...)` para o estoque inicial (em uma transação) |
| **Read** | Tabela com filtros | `GET /api/produtos?busca=&categoria=&situacao=` | `vw_produtos_estoque` |
| **Read** (histórico) | Card Movimentações | `GET /api/estoque/movimentacoes` | `movimentacoes_estoque` |
| **Update** (cadastro) | Ícone ✏ **Editar** | `PUT /api/produtos/{id}` | `UPDATE produtos` (o estoque só muda por venda ou entrada) |
| **Update** (estoque) | Ícone 🚚 **Entrada de estoque** (quantidade e motivo/nota fiscal) | `POST /api/estoque/entrada` | `CALL sp_registrar_entrada_estoque(...)` |
| **Delete** | Ícone 🗑 **Excluir** (pede confirmação) | `DELETE /api/produtos/{id}` | Exclusão **lógica**: `UPDATE produtos SET ativo = FALSE` — o produto sai do catálogo, mas as vendas antigas continuam corretas |

### 5. Clientes — `#clientes`

Cadastro de clientes e programa de fidelidade **ShopGame Rewards**.

- **Cards de níveis:** Bronze (0%), Prata (≥ R$ 2.000, 5% off) e Ouro (≥ R$ 5.000, 10% off), com a quantidade de clientes em cada um.
- **Busca** por nome, CPF ou e-mail.
- **Card por cliente:** contato, total gasto, nível e barra de progresso até o próximo nível, com ações de editar e excluir.

| Operação | Na tela | API | Banco |
|---|---|---|---|
| **Create** | Botão **Novo cliente** (nome, CPF, telefone, e-mail) | `POST /api/clientes` | `INSERT INTO clientes` (CPF único) |
| **Read** | Grade de clientes com busca | `GET /api/clientes` | `clientes` + `fn_nivel_cliente` |
| **Update** | Ícone ✏ **Editar** | `PUT /api/clientes/{id}` | `UPDATE clientes` |
| **Delete** | Ícone 🗑 **Excluir** (pede confirmação) | `DELETE /api/clientes/{id}` | `DELETE FROM clientes` — bloqueado com mensagem se o cliente já tiver vendas |

---

## Design e usabilidade (IHC)

O visual foi inspirado em lojas de games online (como a Nuuvem): fundo azul-marinho, azul como cor principal, rosa para destaques e verde neon reservado à ação de compra. Fontes **Poppins** (títulos) e **Work Sans** (texto).

Conceitos de IHC aplicados (heurísticas de Nielsen e acessibilidade):

| Princípio | Como aparece no sistema |
|---|---|
| Visibilidade do estado do sistema | Aba ativa destacada, caminho da tela ("ShopGame → Clientes"), contador do carrinho no cabeçalho, contador de alertas de estoque no menu, toasts de sucesso/erro |
| Consistência e padrões | Uma cor = um significado (verde = comprar/OK, amarelo = atenção, vermelho = erro/excluir); mesmos componentes de busca, filtros e tabelas em todas as telas |
| Prevenção de erros | Confirmação antes de excluir/cancelar, quantidade limitada ao estoque, produtos esgotados desabilitados |
| Controle e liberdade do usuário | URL por tela (botão Voltar funciona), "Limpar filtros", "Limpar" pedido |
| Flexibilidade e eficiência | Atalho `/` para focar a busca, `Esc` fecha o menu no celular |
| Reconhecimento em vez de memorização | Ícones sempre acompanhados de texto, rótulos visíveis nos formulários |
| Proporção de tela | Conteúdo limitado a 1320 px, grade de espaçamento de 8 px e escala tipográfica fixa; layout se adapta a tablet e celular (menu vira painel lateral) |
| Acessibilidade | Contraste AA, foco visível no teclado, alvos de clique de 40–44 px, link "Pular para o conteúdo", rótulos para leitores de tela, respeito a "reduzir movimento" |

---

## Tecnologias utilizadas

```
C# / .NET 8              (linguagem e plataforma)
ASP.NET Core Minimal API (back-end / API REST)
Npgsql                   (driver de conexão com o PostgreSQL)
PostgreSQL 14+           (banco de dados)
HTML / CSS / JavaScript  (front-end, sem framework)
```

---

## Banco de dados

**SGBD:** PostgreSQL

### Principais tabelas

| Tabela | Descrição |
|---|---|
| `categorias` | Consoles, Jogos, Peças e Acessórios |
| `produtos` | Itens à venda (plataforma, preço, estoque, estoque mínimo) |
| `clientes` | Clientes da loja (CPF único) |
| `vendas` | Cabeçalho da venda (cliente, pagamento, subtotal, desconto, total, status) |
| `itens_venda` | Produtos de cada venda com quantidade e preço praticado |
| `movimentacoes_estoque` | Histórico de ENTRADAS e SAÍDAS de estoque |

Diagrama em [`docs/modelo-dados.md`](docs/modelo-dados.md).

### Views criadas

| View | Para que serve | Tabelas | Onde é usada |
|---|---|---|---|
| `vw_relatorio_vendas` | Consolida cada venda com cliente, quantidade de itens, subtotal, desconto, total e status | `vendas`, `clientes`, `itens_venda` | Tela **Relatório de Vendas**, detalhe da venda e **Dashboard** |
| `vw_produtos_estoque` | Lista produtos com categoria, quantidade vendida e situação do estoque (OK/BAIXO/ESGOTADO) | `produtos`, `categorias`, `itens_venda`, `vendas` | Telas **Produtos & Estoque**, **Nova Venda** e **Dashboard** |

### Functions criadas

| Function | Parâmetros | Retorno | Onde é usada |
|---|---|---|---|
| `fn_nivel_cliente` | `p_cliente_id INT` | `'BRONZE'`, `'PRATA'` ou `'OURO'` conforme o total já gasto (≥ R$ 2.000 Prata, ≥ R$ 5.000 Ouro) | Tela **Clientes** (selo de nível em cada card) e **Nova Venda** |
| `fn_calcular_desconto` | `p_cliente_id INT`, `p_subtotal NUMERIC` | Valor do desconto em R$ (Bronze 0%, Prata 5%, Ouro 10%) | Tela **Nova Venda** (prévia do desconto no carrinho) e dentro da procedure `sp_realizar_venda` |

### Procedures criadas

| Procedure | Parâmetros | O que faz | Onde é chamada |
|---|---|---|---|
| `sp_realizar_venda` | `p_cliente_id`, `p_forma_pagamento`, `p_itens JSONB`, `INOUT p_venda_id` | Valida cliente e itens, bloqueia e confere o estoque, cria a venda e os itens, baixa o estoque, registra as saídas, aplica o desconto da `fn_calcular_desconto` e grava os totais. Qualquer erro desfaz tudo | Botão **Finalizar venda** (tela Nova Venda) |
| `sp_registrar_entrada_estoque` | `p_produto_id`, `p_quantidade`, `p_motivo` | Soma a quantidade ao estoque e registra a movimentação de ENTRADA | Ícone 🚚 **Entrada de estoque** (tela Produtos & Estoque) e cadastro de produto com estoque inicial |
| `sp_cancelar_venda` | `p_venda_id` | Marca a venda como CANCELADA, devolve os itens ao estoque e registra as entradas | Ícone ⊘ **Cancelar venda** (tela Relatório de Vendas) |

### Fluxo integrado (exemplo)

```
Tela Nova Venda → POST /api/vendas → CALL sp_realizar_venda(...)
   └─ dentro da procedure: fn_calcular_desconto(...) → fn_nivel_cliente(...)
→ SELECT * FROM vw_relatorio_vendas WHERE venda_id = ... → mensagem "Venda #N registrada! Total R$ ..."
```

---

## Estrutura do repositório

```
/ShopGame
├── src/
│   ├── ShopGame.csproj        # projeto ASP.NET Core
│   ├── Program.cs             # inicialização, tratamento de erros e rotas
│   ├── appsettings.json       # connection string do PostgreSQL e porta
│   ├── Db.cs                  # helpers de acesso ao banco (Npgsql)
│   ├── DbSetup.cs             # cria o banco e executa todos os scripts SQL
│   ├── Endpoints/             # API: Produtos, Clientes, Vendas, Estoque, Dashboard
│   └── wwwroot/               # telas (index.html, style.css, app.js)
├── database/
│   ├── tables/                # criação das tabelas
│   ├── views/                 # scripts das Views
│   ├── functions/             # scripts das Functions
│   ├── procedures/            # scripts das Procedures
│   ├── inserts/               # dados iniciais para teste
│   └── setup.sql              # roda tudo em ordem pelo psql
├── docs/
│   ├── modelo-dados.md        # diagrama entidade-relacionamento
│   └── roteiro-video.md       # roteiro para o vídeo explicativo
└── README.md
```

---

## Como executar

**Pré-requisitos:** [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) e [PostgreSQL 14+](https://www.postgresql.org/download/) instalados e rodando.

1. **Clone o repositório**
   ```bash
   git clone https://github.com/Ryan-nextLvl/ShopGame.git
   cd ShopGame/src
   ```

2. **Configure a conexão** — em `src/appsettings.json`, ajuste usuário e senha do seu PostgreSQL:
   ```json
   "ShopGame": "Host=localhost;Port=5432;Username=postgres;Password=SUA_SENHA;Database=shopgame"
   ```

3. **Crie o banco** (cria o database `shopgame`, tabelas, views, functions, procedures e dados de teste):
   ```bash
   dotnet run -- --setup-db
   ```
   > Alternativa pelo psql/pgAdmin: crie o banco `shopgame` e execute `database/setup.sql`
   > (`cd database && psql -U postgres -d shopgame -f setup.sql`).

4. **Inicie a aplicação**
   ```bash
   dotnet run
   ```
   Acesse **http://localhost:5000**.

Para voltar o banco ao estado inicial a qualquer momento, rode `dotnet run -- --setup-db` novamente.

---

## Vídeo explicativo

🎥 _[link do vídeo]_ — o roteiro usado está em [`docs/roteiro-video.md`](docs/roteiro-video.md).
