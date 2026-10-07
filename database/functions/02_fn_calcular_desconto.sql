-- =============================================================
-- FUNCTION: fn_calcular_desconto
-- Calcula o valor de desconto de uma compra conforme o nível de
-- fidelidade do cliente (programa "ShopGame Rewards"):
--   BRONZE : 0%
--   PRATA  : 5%
--   OURO   : 10%
-- Parâmetros: id do cliente e subtotal da compra.
-- Retorno   : valor do desconto em R$ (2 casas decimais).
-- Usada na tela "Nova Venda" (prévia do desconto) e pela
-- procedure sp_realizar_venda (valor efetivamente gravado).
-- =============================================================
CREATE OR REPLACE FUNCTION fn_calcular_desconto(p_cliente_id INT, p_subtotal NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_percentual NUMERIC(5,2);
BEGIN
    IF p_subtotal IS NULL OR p_subtotal <= 0 THEN
        RETURN 0;
    END IF;

    v_percentual := CASE fn_nivel_cliente(p_cliente_id)
                        WHEN 'OURO'  THEN 0.10
                        WHEN 'PRATA' THEN 0.05
                        ELSE 0
                    END;

    RETURN ROUND(p_subtotal * v_percentual, 2);
END;
$$;
