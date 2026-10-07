using Npgsql;

namespace ShopGame.Endpoints;

public static class EstoqueEndpoints
{
    public static void MapEstoque(this WebApplication app)
    {
        var grupo = app.MapGroup("/api/estoque");

        // Entrada de mercadoria -> chama a PROCEDURE sp_registrar_entrada_estoque
        grupo.MapPost("/entrada", async (NpgsqlDataSource ds, HttpRequest req) =>
        {
            var b = await Corpo.LerAsync(req);
            await ds.ExecutarAsync("CALL sp_registrar_entrada_estoque($1, $2, $3)",
                b.Inteiro("produto_id"), b.Inteiro("quantidade"), b.Texto("motivo"));
            return Results.Created("/api/estoque/movimentacoes", new { ok = true });
        });

        // Histórico de movimentações
        grupo.MapGet("/movimentacoes", async (NpgsqlDataSource ds) =>
            await ds.ConsultarAsync(
                @"SELECT m.id, m.data, m.tipo, m.quantidade, m.motivo, p.nome AS produto
                    FROM movimentacoes_estoque m JOIN produtos p ON p.id = m.produto_id
                   ORDER BY m.data DESC, m.id DESC
                   LIMIT 100"));
    }
}
