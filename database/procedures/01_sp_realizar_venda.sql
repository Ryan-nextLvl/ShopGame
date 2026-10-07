-- =============================================================
-- PROCEDURE: sp_realizar_venda
-- Registra uma venda completa em uma única transação:
--   1. valida cliente, forma de pagamento e itens;
--   2. bloqueia e confere o estoque de cada produto;
--   3. cria a venda e os itens (com o preço atual do produto);
--   4. baixa o estoque e registra a movimentação de SAÍDA;
--   5. aplica o desconto de fidelidade (fn_calcular_desconto)
--      e grava subtotal, desconto e total.
-- Qualquer erro (ex.: estoque insuficiente) desfaz tudo.
--
-- Parâmetros:
--   p_cliente_id      INT    - cliente comprador
--   p_forma_pagamento TEXT   - DINHEIRO | PIX | DEBITO | CREDITO
--   p_itens           JSONB  - [{"produto_id": 1, "quantidade": 2}, ...]
--   p_venda_id        INOUT  - retorna o id da venda criada
--
-- Chamada pela tela "Nova Venda" (POST /api/vendas).
-- =============================================================
CREATE OR REPLACE PROCEDURE sp_realizar_venda(
    p_cliente_id      INT,
    p_forma_pagamento VARCHAR,
    p_itens           JSONB,
    INOUT p_venda_id  INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_item       JSONB;
    v_produto_id INT;
    v_qtd        INT;
    v_produto    RECORD;
    v_subtotal   NUMERIC(10,2) := 0;
    v_desconto   NUMERIC(10,2);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM clientes WHERE id = p_cliente_id) THEN
        RAISE EXCEPTION 'Cliente % não encontrado', p_cliente_id;
    END IF;

    IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
        RAISE EXCEPTION 'A venda precisa ter pelo menos um item';
    END IF;

    -- Cria o cabeçalho da venda (valores são preenchidos no final)
    INSERT INTO vendas (cliente_id, forma_pagamento)
    VALUES (p_cliente_id, UPPER(p_forma_pagamento))
    RETURNING id INTO p_venda_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        v_produto_id := (v_item->>'produto_id')::INT;
        v_qtd        := (v_item->>'quantidade')::INT;

        IF v_qtd IS NULL OR v_qtd <= 0 THEN
            RAISE EXCEPTION 'Quantidade inválida para o produto %', v_produto_id;
        END IF;

        -- FOR UPDATE evita que duas vendas simultâneas vendam o mesmo estoque
        SELECT id, nome, preco, estoque
          INTO v_produto
          FROM produtos
         WHERE id = v_produto_id AND ativo = TRUE
           FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto % não encontrado', v_produto_id;
        END IF;

        IF v_produto.estoque < v_qtd THEN
            RAISE EXCEPTION 'Estoque insuficiente para "%": disponível %, solicitado %',
                v_produto.nome, v_produto.estoque, v_qtd;
        END IF;

        INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario)
        VALUES (p_venda_id, v_produto_id, v_qtd, v_produto.preco);

        UPDATE produtos SET estoque = estoque - v_qtd WHERE id = v_produto_id;

        INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade, motivo, venda_id)
        VALUES (v_produto_id, 'SAIDA', v_qtd, 'Venda #' || p_venda_id, p_venda_id);

        v_subtotal := v_subtotal + v_produto.preco * v_qtd;
    END LOOP;

    -- A venda recém-criada ainda está com total 0, então não
    -- interfere no cálculo do nível de fidelidade.
    v_desconto := fn_calcular_desconto(p_cliente_id, v_subtotal);

    UPDATE vendas
       SET subtotal = v_subtotal,
           desconto = v_desconto,
           total    = v_subtotal - v_desconto
     WHERE id = p_venda_id;
END;
$$;
