using Npgsql;

namespace ShopGame.Endpoints;

public static class DashboardEndpoints
{
    // Indicadores consolidados -> consultas sobre as VIEWS vw_relatorio_vendas e vw_produtos_estoque
    public static void MapDashboard(this WebApplication app)
    {
        app.MapGet("/api/dashboard", async (NpgsqlDataSource ds) =>
        {
            var resumo = ds.ConsultarAsync(
                @"SELECT COUNT(*)                     AS qtd_vendas,
                         COALESCE(SUM(total), 0)      AS faturamento,
                         COALESCE(AVG(total), 0)      AS ticket_medio,
                         COALESCE(SUM(desconto), 0)   AS descontos,
                         COALESCE(SUM(qtd_unidades), 0) AS unidades
                    FROM vw_relatorio_vendas WHERE status = 'CONCLUIDA'");
            // Faturamento dia a dia dos últimos 30 dias (dias sem venda aparecem com zero)
            var porDia = ds.ConsultarAsync(
                @"SELECT to_char(d, 'YYYY-MM-DD')     AS dia,
                         COALESCE(SUM(v.total), 0)    AS total,
                         COUNT(v.venda_id)            AS qtd
                    FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, INTERVAL '1 day') d
                    LEFT JOIN vw_relatorio_vendas v
                           ON v.data_venda::date = d::date AND v.status = 'CONCLUIDA'
                   GROUP BY d ORDER BY d");
            var porCategoria = ds.ConsultarAsync(
                @"SELECT categoria, SUM(qtd_vendida) AS unidades, SUM(estoque) AS estoque,
                         SUM(valor_em_estoque) AS valor_estoque
                    FROM vw_produtos_estoque GROUP BY categoria ORDER BY categoria");
            var porPagamento = ds.ConsultarAsync(
                @"SELECT forma_pagamento, COUNT(*) AS qtd, SUM(total) AS total
                    FROM vw_relatorio_vendas WHERE status = 'CONCLUIDA'
                   GROUP BY forma_pagamento ORDER BY total DESC");
            var maisVendidos = ds.ConsultarAsync(
                @"SELECT nome, plataforma, categoria, qtd_vendida FROM vw_produtos_estoque
                   WHERE qtd_vendida > 0 ORDER BY qtd_vendida DESC, nome LIMIT 5");
            var alertas = ds.ConsultarAsync(
                @"SELECT nome, plataforma, categoria, estoque, estoque_minimo, situacao_estoque
                    FROM vw_produtos_estoque
                   WHERE situacao_estoque <> 'OK' ORDER BY estoque, nome");
            var ultimas = ds.ConsultarAsync(
                @"SELECT venda_id, data_venda, cliente, forma_pagamento, total, status FROM vw_relatorio_vendas
                   ORDER BY data_venda DESC LIMIT 6");

            await Task.WhenAll(resumo, porDia, porCategoria, porPagamento, maisVendidos, alertas, ultimas);
            return new
            {
                resumo = resumo.Result[0],
                vendas_por_dia = porDia.Result,
                por_categoria = porCategoria.Result,
                por_pagamento = porPagamento.Result,
                mais_vendidos = maisVendidos.Result,
                alertas_estoque = alertas.Result,
                ultimas_vendas = ultimas.Result,
            };
        });
    }
}
