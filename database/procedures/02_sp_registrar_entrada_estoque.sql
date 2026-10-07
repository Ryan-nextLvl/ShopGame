-- =============================================================
-- PROCEDURE: sp_registrar_entrada_estoque
-- Registra a chegada de mercadoria (compra de fornecedor, troca,
-- devolução...): soma a quantidade ao estoque do produto e grava
-- a movimentação de ENTRADA no histórico.
--
-- Parâmetros:
--   p_produto_id INT     - produto que recebeu mercadoria
--   p_quantidade INT     - quantidade recebida (> 0)
--   p_motivo     VARCHAR - descrição (ex.: "NF 1234 - Fornecedor X")
--
-- Chamada pela tela "Produtos & Estoque" (POST /api/estoque/entrada).
-- =============================================================
CREATE OR REPLACE PROCEDURE sp_registrar_entrada_estoque(
    p_produto_id INT,
    p_quantidade INT,
    p_motivo     VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_quantidade IS NULL OR p_quantidade <= 0 THEN
        RAISE EXCEPTION 'A quantidade deve ser maior que zero';
    END IF;

    UPDATE produtos
       SET estoque = estoque + p_quantidade
     WHERE id = p_produto_id AND ativo = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produto % não encontrado', p_produto_id;
    END IF;

    INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo)
    VALUES (p_produto_id, 'ENTRADA', p_quantidade,
            COALESCE(NULLIF(TRIM(p_motivo), ''), 'Entrada de mercadoria'));
END;
$$;
