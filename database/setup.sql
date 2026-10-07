-- =============================================================
-- ShopGame - Script único para recriar o banco via psql
-- Uso (a partir da pasta database):
--   psql -U postgres -d shopgame -f setup.sql
-- =============================================================
\i tables/01_create_tables.sql
\i functions/01_fn_nivel_cliente.sql
\i functions/02_fn_calcular_desconto.sql
\i views/01_vw_relatorio_vendas.sql
\i views/02_vw_produtos_estoque.sql
\i procedures/01_sp_realizar_venda.sql
\i procedures/02_sp_registrar_entrada_estoque.sql
\i procedures/03_sp_cancelar_venda.sql
\i inserts/01_dados_iniciais.sql
