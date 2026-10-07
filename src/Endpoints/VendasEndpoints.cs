using System.Text.Json.Nodes;
using Npgsql;
using NpgsqlTypes;

namespace ShopGame.Endpoints;

public static class VendasEndpoints
{
    public static void MapVendas(this WebApplication app)
    {
        var grupo = app.MapGroup("/api/vendas");

        // Relatório de vendas -> usa a VIEW vw_relatorio_vendas
        grupo.MapGet("/", async (NpgsqlDataSource ds, DateOnly? inicio, DateOnly? fim, string? cliente, string? status) =>
        {
            var filtros = new List<string>();
            var parametros = new List<object?>();
            if (inicio is not null)
            {
                parametros.Add(inicio);
                filtros.Add($"data_venda >= ${parametros.Count}");
            }
            if (fim is not null)
            {
                parametros.Add(fim.Value.AddDays(1));
                filtros.Add($"data_venda < ${parametros.Count}");
            }
            if (!string.IsNullOrWhiteSpace(cliente))
            {
                parametros.Add($"%{cliente}%");
                filtros.Add($"cliente ILIKE ${parametros.Count}");
            }
            if (!string.IsNullOrWhiteSpace(status))
            {
                parametros.Add(status);
                filtros.Add($"status = ${parametros.Count}");
            }
            var where = filtros.Count > 0 ? "WHERE " + string.Join(" AND ", filtros) : "";
            return await ds.ConsultarAsync(
                $"SELECT * FROM vw_relatorio_vendas {where} ORDER BY data_venda DESC", parametros.ToArray());
        });

        // Detalhe de uma venda (cabeçalho pela VIEW + itens)
        grupo.MapGet("/{id:int}", async (NpgsqlDataSource ds, int id) =>
        {
            var venda = await ds.ConsultarAsync("SELECT * FROM vw_relatorio_vendas WHERE venda_id = $1", id);
            if (venda.Count == 0) return Results.NotFound(new { erro = "Venda não encontrada" });
            venda[0]["itens"] = await ds.ConsultarAsync(
                @"SELECT p.nome, p.plataforma, c.nome AS categoria, i.quantidade, i.preco_unitario,
                         i.quantidade * i.preco_unitario AS subtotal
                    FROM itens_venda i
                    JOIN produtos p   ON p.id = i.produto_id
                    JOIN categorias c ON c.id = p.categoria_id
                   WHERE i.venda_id = $1 ORDER BY i.id", id);
            return Results.Ok(venda[0]);
        });

        // Finalizar venda -> chama a PROCEDURE sp_realizar_venda
        grupo.MapPost("/", async (NpgsqlDataSource ds, HttpRequest req) =>
        {
            var b = await Corpo.LerAsync(req);
            var itens = (b["itens"] as JsonArray ?? new JsonArray()).ToJsonString();

            await using var conn = await ds.OpenConnectionAsync();
            await using var cmd = new NpgsqlCommand("CALL sp_realizar_venda($1, $2, $3, NULL)", conn);
            cmd.Parameters.Add(new NpgsqlParameter { Value = (object?)b.Inteiro("cliente_id") ?? DBNull.Value });
            cmd.Parameters.Add(new NpgsqlParameter { Value = (object?)b.Texto("forma_pagamento") ?? DBNull.Value });
            cmd.Parameters.Add(new NpgsqlParameter { Value = itens, NpgsqlDbType = NpgsqlDbType.Jsonb });
            var vendaId = (int)(await cmd.ExecuteScalarAsync())!; // valor do parâmetro INOUT p_venda_id

            var venda = await conn.ConsultarAsync("SELECT * FROM vw_relatorio_vendas WHERE venda_id = $1", vendaId);
            return Results.Created($"/api/vendas/{vendaId}", venda[0]);
        });

        // Cancelar venda -> chama a PROCEDURE sp_cancelar_venda
        grupo.MapPost("/{id:int}/cancelar", async (NpgsqlDataSource ds, int id) =>
        {
            await ds.ExecutarAsync("CALL sp_cancelar_venda($1)", id);
            return Results.Ok(new { ok = true });
        });
    }
}
