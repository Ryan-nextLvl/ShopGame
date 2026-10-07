-- =============================================================
-- VIEW: vw_produtos_estoque
-- Listagem de produtos com categoria, quantidade vendida e a
-- situação do estoque (OK / BAIXO / ESGOTADO). Usada nas telas
-- "Produtos & Estoque", "Nova Venda" e "Dashboard".
-- Tabelas: produtos, categorias, itens_venda, vendas
-- =============================================================
CREATE OR REPLACE VIEW vw_produtos_estoque AS
SELECT p.id,
       p.nome,
       p.categoria_id,
       cat.nome                               AS categoria,
       p.plataforma,
       p.preco,
       p.estoque,
       p.estoque_minimo,
       COALESCE(vend.qtd_vendida, 0)          AS qtd_vendida,
       CASE
           WHEN p.estoque = 0                THEN 'ESGOTADO'
           WHEN p.estoque <= p.estoque_minimo THEN 'BAIXO'
           ELSE 'OK'
       END                                    AS situacao_estoque,
       p.preco * p.estoque                    AS valor_em_estoque
  FROM produtos p
  JOIN categorias cat ON cat.id = p.categoria_id
  LEFT JOIN (
        SELECT i.produto_id, SUM(i.quantidade) AS qtd_vendida
          FROM itens_venda i
          JOIN vendas v ON v.id = i.venda_id
         WHERE v.status = 'CONCLUIDA'
         GROUP BY i.produto_id
  ) vend ON vend.produto_id = p.id
 WHERE p.ativo = TRUE;
