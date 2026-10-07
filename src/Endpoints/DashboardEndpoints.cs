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
                @"SELECT COUNT(*)                   AS qtd_vendas,
                         COALESCE(SUM(total), 0)    AS faturamento,
                         COALESCE(AVG(total), 0)    AS ticket_medio,
                         COALESCE(SUM(desconto), 0) AS descontos
                    FROM vw_relatorio_vendas WHERE status = 'CONCLUIDA'");
            var porCategoria = ds.ConsultarAsync(
                @"SELECT categoria, SUM(qtd_vendida) AS unidades, SUM(estoque) AS estoque
                    FROM vw_produtos_estoque GROUP BY categoria ORDER BY categoria");
            var maisVendidos = ds.ConsultarAsync(
                @"SELECT nome, plataforma, qtd_vendida FROM vw_produtos_estoque
                   WHERE qtd_vendida > 0 ORDER BY qtd_vendida DESC, nome LIMIT 5");
            var alertas = ds.ConsultarAsync(
                @"SELECT nome, estoque, estoque_minimo, situacao_estoque FROM vw_produtos_estoque
                   WHERE situacao_estoque <> 'OK' ORDER BY estoque, nome");
            var ultimas = ds.ConsultarAsync(
                @"SELECT venda_id, data_venda, cliente, total, status FROM vw_relatorio_vendas
                   ORDER BY data_venda DESC LIMIT 5");

            await Task.WhenAll(resumo, porCategoria, maisVendidos, alertas, ultimas);
            return new
            {
                resumo = resumo.Result[0],
                por_categoria = porCategoria.Result,
                mais_vendidos = maisVendidos.Result,
                alertas_estoque = alertas.Result,
                ultimas_vendas = ultimas.Result,
            };
        });
    }
}
