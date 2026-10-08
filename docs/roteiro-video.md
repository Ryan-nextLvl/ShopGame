# 🎬 Roteiro do vídeo — ShopGame (≈ 10 min)

## Antes de gravar (checklist)
- [ ] Na pasta `src`, rode `dotnet run -- --setup-db` (banco limpo: 24 vendas, a próxima será a **#25**) e depois `dotnet run`
- [ ] Navegador aberto em **http://localhost:5000**, em tela cheia (F11) e com zoom de 100%
- [ ] VS Code aberto na pasta do projeto, com estas abas já abertas:
  `database/views/01_vw_relatorio_vendas.sql` · `database/functions/02_fn_calcular_desconto.sql` ·
  `database/procedures/01_sp_realizar_venda.sql` · `src/Endpoints/VendasEndpoints.cs` · `src/Endpoints/ClientesEndpoints.cs`
- [ ] pgAdmin aberto no banco **shopgame** com o Query Tool pronto
- [ ] Notificações do Windows desligadas (modo "Não incomodar")

> Dados de teste que o roteiro usa: **Fernanda Rocha** é BRONZE e faltam **R$ 20,80** para virar PRATA ·
> **Ana Beatriz Souza** é OURO (10%) · **PlayStation 5** tem 8 unidades · **Cooler para PS4/PS5** está ESGOTADO.

---

## 1. Abertura — 0:00 a 1:00
**Tela:** Início

> "Olá, meu nome é Ryan Porto Antunes. Este é o meu trabalho da disciplina Projeto de Banco de Dados, do professor Anderson Soares.
> O sistema se chama **ShopGame**: um sistema de gestão para uma loja de games, que vende **consoles, jogos e peças e acessórios**.
>
> O problema que ele resolve é o do dia a dia de uma loja: vender um produto que já acabou no estoque, perder o histórico do que entrou e saiu, não saber quanto faturou e não ter um programa de fidelidade para os clientes.
>
> Ele foi feito em **C# com ASP.NET Core** no back-end, **PostgreSQL** como banco de dados e **HTML, CSS e JavaScript** nas telas.
> A parte principal do trabalho é que as regras importantes ficam **dentro do banco**, em Views, Functions e Procedures, e as telas usam esses recursos de verdade."

---

## 2. Tour pelas telas — 1:00 a 3:00
Clique em cada item do menu do topo enquanto fala. **Aponte para as etiquetas coloridas de cada tela** (VIEW em azul, FUNCTION em amarelo, PROCEDURE em rosa): elas mostram qual recurso do banco a tela usa.

**Início**
> "Na tela inicial eu tenho o faturamento, o número de vendas, o ticket médio e o total de descontos. Tem o gráfico de faturamento dos últimos 30 dias (*passe o mouse em uma barra*), as formas de pagamento, os mais vendidos e os alertas de estoque.
> Repare nas etiquetas azuis no banner: tudo isso vem das duas **Views**, `vw_relatorio_vendas` e `vw_produtos_estoque`."

**Nova Venda**
> "Essa é a tela de caixa. Os produtos aparecem em cards, separados por categoria: consoles, jogos e peças. O Cooler aparece apagado porque está esgotado.
> Aqui a etiqueta mostra a **Procedure** `sp_realizar_venda` e a **Function** `fn_calcular_desconto`."

**Relatório de Vendas**
> "No relatório eu filtro por período, cliente e status (*clique em 'Concluídas'*). O botão do olho abre os detalhes (*abra uma venda*), e o outro botão cancela a venda usando a **Procedure** `sp_cancelar_venda`."

**Produtos & Estoque**
> "Aqui ficam o catálogo e o estoque, com a situação de cada produto: em estoque, estoque baixo ou esgotado. Tem também o histórico de entradas e saídas. A lista vem da **View** `vw_produtos_estoque`, e o botão do caminhãozinho dá entrada de mercadoria pela **Procedure** `sp_registrar_entrada_estoque`."

**Clientes**
> "E aqui estão os clientes, com o programa de fidelidade: **Bronze** sem desconto, **Prata** com 5% a partir de 2 mil reais em compras e **Ouro** com 10% a partir de 5 mil. Esse nível é calculado pela **Function** `fn_nivel_cliente`."

---

## 3. View — 3:00 a 4:30
**Tela:** VS Code → `database/views/01_vw_relatorio_vendas.sql`

> "A primeira View é a `vw_relatorio_vendas`.
> **Por que eu criei:** para montar o relatório eu preciso juntar três tabelas, **vendas, clientes e itens_venda**, e somar a quantidade de itens. Em vez de repetir esse JOIN com GROUP BY em todo lugar, ele fica salvo no banco.
> **O que ela retorna:** o número da venda, a data, o cliente, o CPF, a forma de pagamento, a quantidade de itens, o subtotal, o desconto, o total e o status."

**Mostre o uso no código:** `src/Endpoints/VendasEndpoints.cs`, linha 40

> "No C#, a tela de relatório faz só `SELECT * FROM vw_relatorio_vendas` com os filtros. A tela inicial usa a mesma View para calcular o faturamento e o gráfico."

**pgAdmin:**
```sql
SELECT * FROM vw_relatorio_vendas ORDER BY data_venda DESC;
SELECT nome, estoque, situacao_estoque FROM vw_produtos_estoque WHERE situacao_estoque <> 'OK';
```
> "Também tenho a `vw_produtos_estoque`, que já calcula se o produto está OK, BAIXO ou ESGOTADO. É ela que gera os alertas da tela inicial."

---

## 4. Function — 4:30 a 6:00
**Tela:** VS Code → `database/functions/02_fn_calcular_desconto.sql` (mostre também a `01_fn_nivel_cliente.sql`)

> "A Function `fn_calcular_desconto` recebe **dois parâmetros**: o id do cliente e o subtotal da compra.
> Ela chama outra function, a `fn_nivel_cliente`, que soma tudo o que o cliente já gastou em vendas concluídas e devolve BRONZE, PRATA ou OURO. Com o nível em mãos, ela **retorna o valor do desconto em reais**: 0%, 5% ou 10%."

**pgAdmin:**
```sql
SELECT nome, fn_nivel_cliente(id) AS nivel FROM clientes;
SELECT fn_calcular_desconto(1, 1000);   -- Ana é OURO → retorna 100.00
```

**Mostre o uso no código:** `src/Endpoints/ClientesEndpoints.cs`, linha 26

> "Na aplicação, quando eu escolho o cliente na tela de venda, o C# chama essa function para mostrar o desconto **antes** de finalizar. E a procedure de venda usa a mesma function para gravar o valor. Assim a regra fica num lugar só."

---

## 5. Procedure — 6:00 a 7:30
**Tela:** VS Code → `database/procedures/01_sp_realizar_venda.sql`

> "A Procedure principal é a `sp_realizar_venda`. Ela recebe o **cliente**, a **forma de pagamento** e a **lista de itens em JSON**, e devolve o **número da venda** num parâmetro INOUT.
> As operações, nesta ordem: valida o cliente e os itens, cria a venda e, para cada produto,
> trava a linha com `FOR UPDATE` para duas vendas ao mesmo tempo não venderem o mesmo estoque,
> confere se tem estoque, grava o item, **baixa o estoque** e registra a **movimentação de saída**.
> No final ela chama a `fn_calcular_desconto` e grava subtotal, desconto e total.
> Tudo isso é **uma transação só**: se qualquer item der erro, nada é gravado."

**Mostre o uso no código:** `src/Endpoints/VendasEndpoints.cs`, linha 65

> "O botão **Finalizar venda** chama a API, e a API executa `CALL sp_realizar_venda`."

**pgAdmin: mostre a proteção funcionando**
```sql
CALL sp_realizar_venda(1, 'PIX', '[{"produto_id": 18, "quantidade": 1}]');
```
> "Se eu tentar vender o Cooler, que está com estoque zero, a própria procedure barra: 'Estoque insuficiente'. E nada foi gravado."

> "Tenho ainda mais duas procedures: a `sp_registrar_entrada_estoque` e a `sp_cancelar_venda`, que devolve os itens ao estoque. Vou mostrar as duas funcionando agora."

---

## 6. Funcionamento integrado — 7:30 a 9:30
*Tela da aplicação → chamada ao banco → View/Function/Procedure → resultado na tela.*

**① Venda com a Function e a Procedure**
1. **Produtos & Estoque** → *"O PlayStation 5 está com **8** unidades."*
2. **Nova Venda** → escolha o cliente **Fernanda Rocha**
   > "A Fernanda é **Bronze**, então não tem desconto. E o sistema mostra que faltam **R$ 20,80** para ela virar Prata. Isso vem da function."
3. Adicione **God of War Ragnarök** → pagamento **PIX** → **Finalizar venda**
   > "A procedure registrou a venda **#25**."
4. **Nova venda** → escolha a **Fernanda** de novo
   > "Olha só: como ela passou de 2 mil reais em compras, a function já recalculou o nível. Agora ela é **Prata** e ganha **5% de desconto**."
5. Adicione o **PlayStation 5** → **Finalizar**
   > "Venda **#26**, com 5% de desconto aplicado pelo banco."

**② View mostrando o resultado**
6. **Relatório de Vendas** → as vendas #26 e #25 aparecem no topo → abra a **#26** no olho
   > "O relatório, que vem da View, já mostra a venda com o desconto gravado."
7. **Produtos & Estoque** → *"O PS5 foi de 8 para **7**, e o histórico mostra a saída 'Venda #26'."*

**③ Procedure de cancelamento**
8. **Relatório** → clique em **Cancelar** na #26 → confirme
   > "A `sp_cancelar_venda` marcou a venda como cancelada e devolveu o PS5 para o estoque."
9. **Produtos & Estoque** → *"O PS5 voltou para **8**, com uma entrada 'Cancelamento da venda #26'."*

**④ Procedure de entrada de estoque**
10. No **Cooler para PS4/PS5** (esgotado), clique no **caminhãozinho** → quantidade **10** → **Registrar entrada**
    > "A `sp_registrar_entrada_estoque` somou 10 unidades e registrou a entrada. O Cooler saiu de **Esgotado** para **Em estoque**, e o alerta sumiu da tela inicial."
11. Repare que o número vermelho de alertas ao lado de **Produtos & estoque**, no menu, caiu de 3 para 2.

---

## 7. Encerramento — 9:30 a 10:00
> "Resumindo: o ShopGame usa **duas Views** para os relatórios e o dashboard, **duas Functions** para o programa de fidelidade e **três Procedures** para vender, cancelar e dar entrada no estoque.
> Todas elas são chamadas pelas telas, ou seja, o banco não serve só para guardar dados: ele também processa as regras do negócio.
> O código e os scripts para recriar o banco estão no GitHub, no link da descrição. Obrigado!"

---

### Dicas de gravação
- **Ferramentas:** OBS Studio, ou a Xbox Game Bar (`Win + G`) / Ferramenta de Captura (`Win + Shift + S` → vídeo)
- **Ritmo:** fale devagar e mova o mouse até o que você está explicando antes de falar sobre ele
- **Se errar:** pause, respire e repita a frase. Depois é só cortar no editor (o Clipchamp já vem no Windows)
- **Publicação:** suba no YouTube como **"Não listado"** e coloque o link no README
