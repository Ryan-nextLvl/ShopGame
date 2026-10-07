# Roteiro do vídeo explicativo (≈ 8–10 min)

Antes de gravar: dentro de `src/` rode `dotnet run -- --setup-db` (banco limpo) e `dotnet run`. Deixe abertos o navegador em `http://localhost:5000`, o editor com a pasta `database/` e o pgAdmin/psql.

## 1. Apresentação do sistema (1 min)
- "O ShopGame é um sistema para uma loja de games que vende **consoles, jogos e peças/acessórios**."
- Problema: vender sem estoque, perder histórico de entradas/saídas, não saber o faturamento, não ter programa de fidelidade.
- Funcionalidades: Nova Venda, Relatório de Vendas, Produtos & Estoque, Clientes e Dashboard.
- Tecnologias: C# / ASP.NET Core (.NET 8) com Npgsql, PostgreSQL, HTML/CSS/JS.

## 2. Demonstração das telas (2 min)
Passe pelas 5 abas. Mostre que cada tela exibe no topo uma etiqueta com o recurso do banco que ela usa (VIEW / FUNCTION / PROCEDURE).

## 3. View (1,5 min)
Abra `database/views/01_vw_relatorio_vendas.sql`.
- **Por quê:** o relatório precisa juntar vendas + clientes + itens; a view evita repetir esse JOIN/GROUP BY na aplicação.
- **Tabelas:** `vendas`, `clientes`, `itens_venda`.
- **Retorna:** id, data, cliente, forma de pagamento, qtd. de itens, subtotal, desconto, total, status.
- **Onde:** tela Relatório de Vendas (`src/Endpoints/VendasEndpoints.cs` → `SELECT * FROM vw_relatorio_vendas`) e Dashboard.
- Mostre também `vw_produtos_estoque` (situação OK/BAIXO/ESGOTADO) usada em Produtos e no Dashboard (alertas).
- No psql: `SELECT * FROM vw_relatorio_vendas;`

## 4. Function (1,5 min)
Abra `database/functions/01_fn_nivel_cliente.sql` e `02_fn_calcular_desconto.sql`.
- **O que faz:** calcula o nível de fidelidade pelo total gasto e o desconto (Bronze 0%, Prata 5%, Ouro 10%).
- **Parâmetros:** `p_cliente_id`, `p_subtotal`. **Retorno:** valor do desconto.
- **Onde:** na tela Nova Venda, ao escolher o cliente o carrinho mostra o nível e o desconto (rota `GET /api/clientes/{id}/desconto` em `ClientesEndpoints.cs`). Na tela Clientes, a coluna "Nível".
- No psql: `SELECT fn_nivel_cliente(1), fn_calcular_desconto(1, 1000);`

## 5. Procedure (2 min)
Abra `database/procedures/01_sp_realizar_venda.sql`.
- **O que faz:** registra a venda inteira em uma transação.
- **Parâmetros:** cliente, forma de pagamento, itens (JSON) e `INOUT p_venda_id`.
- **Operações:** valida → `SELECT ... FOR UPDATE` no produto → confere estoque → INSERT venda/itens → UPDATE estoque → INSERT movimentação → chama `fn_calcular_desconto` → UPDATE totais.
- **Onde:** botão "Finalizar venda" (`POST /api/vendas` em `VendasEndpoints.cs` → `CALL sp_realizar_venda(...)` via Npgsql; o `INOUT p_venda_id` volta como resultado).
- Cite também `sp_registrar_entrada_estoque` (botão "+ Entrada") e `sp_cancelar_venda` (botão "Cancelar").

## 6. Funcionamento integrado (2 min)
1. Anote o estoque do **PlayStation 5** em Produtos & Estoque.
2. Nova Venda → cliente **Ana Beatriz Souza** (nível OURO) → adicione PS5 + um jogo → mostre o desconto de 10% calculado pela function → Finalizar.
3. Relatório de Vendas → a venda nova aparece (view) com o desconto gravado → Detalhes.
4. Produtos & Estoque → estoque do PS5 diminuiu e o histórico mostra a SAÍDA "Venda #N".
5. Tente vender o **Cooler para PS4/PS5** (estoque 0) ou uma quantidade maior que o estoque → mostre a mensagem de erro vinda da procedure (nada foi gravado).
6. Cancele a venda criada → estoque volta e o status fica CANCELADA.
7. Dê uma entrada de estoque no Cooler → situação muda de ESGOTADO para OK/BAIXO.

Fechamento: "Tela (JavaScript) → API em C# → View/Function/Procedure no PostgreSQL → resultado exibido na tela."
