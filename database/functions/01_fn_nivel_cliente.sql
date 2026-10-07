-- =============================================================
-- FUNCTION: fn_nivel_cliente
-- Retorna o nível de fidelidade do cliente com base no total já
-- gasto em vendas concluídas.
--   BRONZE : até R$ 1.999,99
--   PRATA  : de R$ 2.000,00 até R$ 4.999,99
--   OURO   : a partir de R$ 5.000,00
-- Usada na tela de Clientes e dentro de fn_calcular_desconto.
-- =============================================================
CREATE OR REPLACE FUNCTION fn_nivel_cliente(p_cliente_id INT)
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_gasto NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(total), 0)
      INTO v_total_gasto
      FROM vendas
     WHERE cliente_id = p_cliente_id
       AND status = 'CONCLUIDA';

    IF v_total_gasto >= 5000 THEN
        RETURN 'OURO';
    ELSIF v_total_gasto >= 2000 THEN
        RETURN 'PRATA';
    END IF;
    RETURN 'BRONZE';
END;
$$;
