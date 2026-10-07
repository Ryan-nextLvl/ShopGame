-- =============================================================
-- PROCEDURE: sp_cancelar_venda
-- Cancela uma venda concluída: muda o status para CANCELADA,
-- devolve os itens ao estoque e registra as movimentações de
-- ENTRADA correspondentes.
--
-- Parâmetro: p_venda_id INT - venda a ser cancelada
--
-- Chamada pela tela "Relatório de Vendas" (botão Cancelar).
-- =============================================================
CREATE OR REPLACE PROCEDURE sp_cancelar_venda(p_venda_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
    v_item   RECORD;
BEGIN
    SELECT status INTO v_status FROM vendas WHERE id = p_venda_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venda % não encontrada', p_venda_id;
    END IF;

    IF v_status = 'CANCELADA' THEN
        RAISE EXCEPTION 'A venda % já está cancelada', p_venda_id;
    END IF;

    FOR v_item IN SELECT produto_id, quantidade FROM itens_venda WHERE venda_id = p_venda_id LOOP
        UPDATE produtos SET estoque = estoque + v_item.quantidade WHERE id = v_item.produto_id;

        INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, venda_id)
        VALUES (v_item.produto_id, 'ENTRADA', v_item.quantidade,
                'Cancelamento da venda #' || p_venda_id, p_venda_id);
    END LOOP;

    UPDATE vendas SET status = 'CANCELADA' WHERE id = p_venda_id;
END;
$$;
