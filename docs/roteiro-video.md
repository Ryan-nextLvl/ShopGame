# Roteiro do vídeo — ShopGame (≈ 9 min)

> **Formato:** cada bloco tem 🎬 **TELA** (o que mostrar) e 🎙️ **FALA** (o que dizer).
> Não precisa ler palavra por palavra — use como guia e fale do seu jeito.

---

## ✅ Antes de apertar o REC

1. Dentro de `src/`: `dotnet run -- --setup-db` (banco zerado, dados de teste conhecidos) e depois `dotnet run`.
2. Deixe abertos em abas/janelas:
   - Navegador em `http://localhost:5000` (tela **Início**)
   - VS Code com as pastas `database/` e `src/Endpoints/` expandidas
   - pgAdmin (Query Tool no banco `shopgame`) ou terminal com `psql -U postgres -d shopgame`
3. Zoom do navegador e do editor em **125%** pra ficar legível no vídeo.
4. Feche WhatsApp/Discord (notificação no meio da gravação é triste).

**Dados que a demo usa (com o banco recém-criado):**

| O quê | Valor esperado |
|---|---|
| Estoque do **PlayStation 5 Slim 1TB** | 8 unidades |
| **Cooler para PS4 / PS5** | 0 → ESGOTADO |
| **Ana Beatriz Souza** | nível **OURO** (10% de desconto) |
| **João Pedro Alves** | nível **BRONZE** (0% de desconto) |

---

## 1. Abertura (≈ 40 s)

🎬 **TELA:** tela Início (Dashboard) do ShopGame.

🎙️ **FALA:**
> "Olá, professor Anderson. Eu sou o Ryan Porto Antunes, e esse é o meu trabalho de Projeto de Banco de Dados: o **ShopGame**, um sistema para uma loja de games que vende consoles, jogos e peças e acessórios.
>
> O problema que ele resolve é o dia a dia de uma loja assim: vender um produto que já acabou no estoque, não ter histórico do que entrou e saiu, e não saber direito quanto se faturou. O sistema cuida de vendas, estoque, clientes com programa de fidelidade e relatórios.
>
> Fiz em **C# com ASP.NET Core** no back-end, **PostgreSQL** no banco e **HTML, CSS e JavaScript** nas telas. E a regra de negócio mais importante fica dentro do banco, em **Views, Functions e Procedures** — que é o que vou mostrar."

---

## 2. Tour rápido pelas telas (≈ 1 min 30)

🎬 **TELA:** clique em cada aba do menu, sem demorar.

🎙️ **FALA:**
> "O sistema tem cinco telas.
>
> **Início** é o dashboard: faturamento, ticket médio, descontos, mais vendidos, alertas de estoque e vendas por categoria.
>
> **Nova Venda** é o caixa: vitrine de produtos de um lado e o carrinho do outro.
>
> **Relatório de Vendas** lista todas as vendas com filtro por período, cliente e status, e permite ver detalhes e cancelar.
>
> **Produtos & Estoque** tem o cadastro completo — criar, editar, excluir — a situação do estoque e o histórico de entradas e saídas.
>
> E **Clientes**, com cadastro e o nível de fidelidade: Bronze, Prata e Ouro.
>
> Agora vou mostrar o que está por trás disso no banco."

---

## 3. A View (≈ 1 min 30)

🎬 **TELA:** abra `database/views/01_vw_relatorio_vendas.sql`.

🎙️ **FALA:**
> "Começando pela **View**. A principal é a `vw_relatorio_vendas`.
>
> Pra montar o relatório eu preciso juntar três tabelas: **vendas**, **clientes** e **itens_venda**. Em vez de repetir esse JOIN com GROUP BY em todo lugar da aplicação, eu deixei isso salvo numa view.
>
> Ela devolve, por venda: o número, a data, o cliente e o CPF, a forma de pagamento, quantos itens e unidades, subtotal, desconto, total e o status — concluída ou cancelada."

🎬 **TELA:** abra `src/Endpoints/VendasEndpoints.cs` e destaque a linha `SELECT * FROM vw_relatorio_vendas`.

🎙️ **FALA:**
> "Aqui no C#, a rota do relatório só faz um `SELECT` na view, com os filtros da tela. A mesma view alimenta o Dashboard."

🎬 **TELA:** no pgAdmin/psql, rode:
```sql
SELECT * FROM vw_relatorio_vendas;
```

🎙️ **FALA:**
> "E rodando direto no banco, é exatamente o que aparece na tela de Relatório.
>
> Tem uma segunda view, a `vw_produtos_estoque`, que calcula a situação do estoque — OK, BAIXO ou ESGOTADO — comparando o estoque com o estoque mínimo. É ela que alimenta a tela de Produtos e os alertas do Dashboard."

---

## 4. A Function (≈ 1 min 30)

🎬 **TELA:** abra `database/functions/01_fn_nivel_cliente.sql` e depois `02_fn_calcular_desconto.sql`.

🎙️ **FALA:**
> "Agora as **Functions**, que fazem o programa de fidelidade.
>
> A `fn_nivel_cliente` recebe o **id do cliente**, soma o total das vendas concluídas dele e **retorna o nível**: a partir de 2 mil reais é Prata, a partir de 5 mil é Ouro, abaixo disso é Bronze.
>
> A `fn_calcular_desconto` recebe o **id do cliente e o subtotal da compra**, chama a função de nível e **retorna o valor do desconto em reais**: Bronze zero, Prata 5%, Ouro 10%."

🎬 **TELA:** abra `src/Endpoints/ClientesEndpoints.cs` e destaque `fn_nivel_cliente(...)` e `fn_calcular_desconto(...)`.

🎙️ **FALA:**
> "No C#, a tela de Clientes usa a `fn_nivel_cliente` pra mostrar o selo de cada cliente, e a tela de Nova Venda usa a `fn_calcular_desconto` pra mostrar a prévia do desconto assim que eu escolho o cliente."

🎬 **TELA:** no pgAdmin/psql, rode:
```sql
SELECT fn_nivel_cliente(1) AS nivel_ana,
       fn_calcular_desconto(1, 1000) AS desconto_ana,
       fn_nivel_cliente(4) AS nivel_joao,
       fn_calcular_desconto(4, 1000) AS desconto_joao;
```

🎙️ **FALA:**
> "Testando direto: a Ana é Ouro, então numa compra de mil reais ela ganha cem de desconto. O João é Bronze e não ganha nada."

---

## 5. A Procedure (≈ 2 min)

🎬 **TELA:** abra `database/procedures/01_sp_realizar_venda.sql`. Vá rolando devagar conforme fala.

🎙️ **FALA:**
> "E a parte principal: a **Procedure** `sp_realizar_venda`. Ela registra uma venda inteira de uma vez só.
>
> Recebe o **cliente**, a **forma de pagamento**, a **lista de itens em JSON** — produto e quantidade — e devolve o **id da venda criada** pelo parâmetro `INOUT`.
>
> O passo a passo é:
> primeiro valida se o cliente existe e se tem pelo menos um item;
> cria o cabeçalho da venda;
> pra cada item, busca o produto com `FOR UPDATE` — isso trava a linha pra duas vendas ao mesmo tempo não venderem o mesmo estoque;
> confere se tem estoque suficiente, e se não tiver, dá erro;
> insere o item, baixa o estoque e grava a movimentação de **saída**;
> no final, chama a `fn_calcular_desconto` e grava subtotal, desconto e total.
>
> Como é tudo uma transação só, se qualquer coisa der errado no meio, **nada é gravado**."

🎬 **TELA:** abra `src/Endpoints/VendasEndpoints.cs` e destaque `CALL sp_realizar_venda($1, $2, $3, NULL)`.

🎙️ **FALA:**
> "Na aplicação, o botão **Finalizar venda** chama essa rota, que executa o `CALL` da procedure e pega o id da venda de volta.
>
> Além dela, tem mais duas: a `sp_registrar_entrada_estoque`, usada quando chega mercadoria, e a `sp_cancelar_venda`, que cancela a venda e devolve os itens pro estoque."

---

## 6. Tudo funcionando junto (≈ 2 min)

> Essa é a parte mais importante do vídeo. Vá com calma.

🎬 **TELA:** aba **Produtos & Estoque** → busque "PlayStation 5".

🎙️ **FALA:**
> "Agora mostrando tudo integrado. O PlayStation 5 tem **8 unidades** em estoque."

🎬 **TELA:** aba **Nova Venda** → clique no PS5 e em um jogo (ex.: **God of War Ragnarök**) → escolha o cliente **João Pedro Alves**.

🎙️ **FALA:**
> "Vou montar um pedido com um PS5 e um God of War. Se eu escolho o João, que é Bronze, o desconto é zero…"

🎬 **TELA:** troque o cliente para **Ana Beatriz Souza**.

🎙️ **FALA:**
> "…e se troco pra Ana, que é Ouro, aparece 10% de desconto na hora. Isso é a **function** sendo chamada pela tela."

🎬 **TELA:** escolha **PIX** → **Finalizar venda** → mostre o recibo.

🎙️ **FALA:**
> "Finalizando, a **procedure** registra a venda, e o recibo já mostra o número e o total com desconto."

🎬 **TELA:** aba **Relatório de Vendas** → a venda nova no topo → clique em 👁 **Ver detalhes**.

🎙️ **FALA:**
> "No relatório, que vem da **view**, a venda já aparece, com o desconto gravado."

🎬 **TELA:** aba **Produtos & Estoque** → PS5 agora com **7** → mostre no card **Movimentações** a SAÍDA "Venda #N".

🎙️ **FALA:**
> "E o estoque do PS5 caiu de 8 pra 7, com a saída registrada no histórico com o número da venda."

🎬 **TELA:** aba **Nova Venda** → mostre o **Cooler para PS4 / PS5** desabilitado (esgotado). Tente aumentar a quantidade do PS5 no carrinho acima do estoque.

🎙️ **FALA:**
> "Produto esgotado nem dá pra adicionar, e a tela não deixa passar do estoque. E mesmo que alguém tentasse forçar isso pela API, a procedure barra com erro de estoque insuficiente e não grava nada."

🎬 **TELA:** **Relatório de Vendas** → na venda criada, clique em ⊘ **Cancelar venda** → confirme. Volte em **Produtos & Estoque**.

🎙️ **FALA:**
> "Se eu cancelo essa venda, a `sp_cancelar_venda` muda o status pra **cancelada** e devolve os itens: o PS5 voltou pra 8. E a venda não é apagada, fica no histórico pra auditoria."

🎬 **TELA:** **Produtos & Estoque** → no **Cooler**, clique em 🚚 **Entrada de estoque** → quantidade **10**, motivo "NF 1234" → salvar.

🎙️ **FALA:**
> "Por último, chegou mercadoria do cooler: registro uma entrada de 10 unidades. A `sp_registrar_entrada_estoque` soma no estoque, grava a entrada, e a situação sai de **esgotado** pra **OK**."

---

## 7. Encerramento (≈ 30 s)

🎬 **TELA:** volte pro Dashboard (ou mostre o README no GitHub).

🎙️ **FALA:**
> "Resumindo o fluxo: a **tela** em JavaScript chama a **API em C#**, que usa a **View**, a **Function** e a **Procedure** no **PostgreSQL**, e o resultado volta pra tela.
>
> A view centraliza o relatório, a function calcula a fidelidade e o desconto, e a procedure garante que a venda e o estoque fiquem sempre consistentes.
>
> O código, os scripts do banco e as instruções pra rodar estão no repositório do GitHub. Obrigado!"

---

## 🆘 Se algo der errado na gravação

- **Números diferentes do esperado?** Você testou antes de gravar. Rode `dotnet run -- --setup-db` de novo e reinicie com `dotnet run`.
- **Travou numa fala?** Pausa 2 segundos e repete a frase inteira — fica fácil de cortar na edição.
- **Ficou longo?** Dá pra cortar a segunda view (fim do bloco 3) e as procedures extras (fim do bloco 5); a demo do bloco 6 já mostra as duas funcionando.
