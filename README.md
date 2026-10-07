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
| `fn_nivel_cliente` | `p_cliente_id INT` | `'BRONZE'`, `'PRATA'` ou `'OURO'` conforme o total já gasto (≥ R$ 2.000 Prata, ≥ R$ 5.000 Ouro) | Tela **Clientes** (coluna Nível) e **Nova Venda** |
| `fn_calcular_desconto` | `p_cliente_id INT`, `p_subtotal NUMERIC` | Valor do desconto em R$ (Bronze 0%, Prata 5%, Ouro 10%) | Tela **Nova Venda** (prévia do desconto no carrinho) e dentro da procedure `sp_realizar_venda` |

### Procedures criadas

| Procedure | Parâmetros | O que faz | Onde é chamada |
|---|---|---|---|
| `sp_realizar_venda` | `p_cliente_id`, `p_forma_pagamento`, `p_itens JSONB`, `INOUT p_venda_id` | Valida cliente e itens, bloqueia e confere o estoque, cria a venda e os itens, baixa o estoque, registra as saídas, aplica o desconto da `fn_calcular_desconto` e grava os totais. Qualquer erro desfaz tudo | Botão **Finalizar venda** (tela Nova Venda) |
| `sp_registrar_entrada_estoque` | `p_produto_id`, `p_quantidade`, `p_motivo` | Soma a quantidade ao estoque e registra a movimentação de ENTRADA | Botão **+ Entrada** (tela Produtos & Estoque) e cadastro de produto com estoque inicial |
| `sp_cancelar_venda` | `p_venda_id` | Marca a venda como CANCELADA, devolve os itens ao estoque e registra as entradas | Botão **Cancelar** (tela Relatório de Vendas) |

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
