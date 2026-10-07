-- =============================================================
-- VIEW: vw_relatorio_vendas
-- Relatório consolidado das vendas: junta vendas, clientes e
-- itens para mostrar quem comprou, quando, quantos itens, valores
-- e status. Usada nas telas "Relatório de Vendas" e "Dashboard".
-- Tabelas: vendas, clientes, itens_venda
-- =============================================================
CREATE OR REPLACE VIEW vw_relatorio_vendas AS
SELECT v.id                              AS venda_id,
       v.data_venda,
       c.id                              AS cliente_id,
       c.nome                            AS cliente,
       c.cpf,
       v.forma_pagamento,
       COUNT(i.id)                       AS qtd_itens_distintos,
       COALESCE(SUM(i.quantidade), 0)    AS qtd_unidades,
       v.subtotal,
       v.desconto,
       v.total,
       v.status
  FROM vendas v
  JOIN clientes c         ON c.id = v.cliente_id
  LEFT JOIN itens_venda i ON i.venda_id = v.id
 GROUP BY v.id, c.id;
