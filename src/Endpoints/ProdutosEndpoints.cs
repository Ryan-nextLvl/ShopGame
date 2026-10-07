using Npgsql;

namespace ShopGame.Endpoints;

public static class ProdutosEndpoints
{
    public static void MapProdutos(this WebApplication app)
    {
        var grupo = app.MapGroup("/api/produtos");

        // Lista de produtos -> usa a VIEW vw_produtos_estoque
        grupo.MapGet("/", async (NpgsqlDataSource ds, int? categoria, string? situacao, string? busca) =>
        {
            var filtros = new List<string>();
            var parametros = new List<object?>();
            if (categoria is not null)
            {
                parametros.Add(categoria);
                filtros.Add($"categoria_id = ${parametros.Count}");
            }
            if (!string.IsNullOrWhiteSpace(situacao))
            {
                parametros.Add(situacao);
                filtros.Add($"situacao_estoque = ${parametros.Count}");
            }
            if (!string.IsNullOrWhiteSpace(busca))
            {
                parametros.Add($"%{busca}%");
                filtros.Add($"(nome ILIKE ${parametros.Count} OR plataforma ILIKE ${parametros.Count})");
            }
            var where = filtros.Count > 0 ? "WHERE " + string.Join(" AND ", filtros) : "";
            return await ds.ConsultarAsync(
                $"SELECT * FROM vw_produtos_estoque {where} ORDER BY categoria, nome", parametros.ToArray());
        });

        grupo.MapGet("/categorias", async (NpgsqlDataSource ds) =>
            await ds.ConsultarAsync("SELECT id, nome FROM categorias ORDER BY id"));

        // Cadastro: o estoque inicial entra pela procedure de entrada (fica no histórico)
        grupo.MapPost("/", async (NpgsqlDataSource ds, HttpRequest req) =>
        {
            var b = await Corpo.LerAsync(req);
            await using var conn = await ds.OpenConnectionAsync();
            await using var tx = await conn.BeginTransactionAsync();

            var linhas = await conn.ConsultarAsync(
                @"INSERT INTO produtos (nome, categoria_id, plataforma, preco, estoque_minimo)
                  VALUES ($1, $2, $3, $4, $5) RETURNING id",
                b.Texto("nome"), b.Inteiro("categoria_id"), b.Texto("plataforma"),
                b.Decimal("preco"), b.Inteiro("estoque_minimo") ?? 2);
            var id = (int)linhas[0]["id"]!;

            var estoqueInicial = b.Inteiro("estoque") ?? 0;
            if (estoqueInicial > 0)
                await conn.ExecutarAsync("CALL sp_registrar_entrada_estoque($1, $2, $3)", id, estoqueInicial, "Estoque inicial");

            await tx.CommitAsync();
            return Results.Created($"/api/produtos/{id}", new { id });
        });

        // Edição dos dados cadastrais (estoque só muda por venda/entrada)
        grupo.MapPut("/{id:int}", async (NpgsqlDataSource ds, HttpRequest req, int id) =>
        {
            var b = await Corpo.LerAsync(req);
            var alterados = await ds.ExecutarAsync(
                @"UPDATE produtos SET nome = $1, categoria_id = $2, plataforma = $3, preco = $4, estoque_minimo = $5
                   WHERE id = $6 AND ativo = TRUE",
                b.Texto("nome"), b.Inteiro("categoria_id"), b.Texto("plataforma"),
                b.Decimal("preco"), b.Inteiro("estoque_minimo") ?? 2, id);
            return alterados > 0 ? Results.Ok(new { ok = true }) : Results.NotFound(new { erro = "Produto não encontrado" });
        });

        // Exclusão lógica: o produto pode estar em vendas antigas
        grupo.MapDelete("/{id:int}", async (NpgsqlDataSource ds, int id) =>
        {
            var alterados = await ds.ExecutarAsync("UPDATE produtos SET ativo = FALSE WHERE id = $1 AND ativo = TRUE", id);
            return alterados > 0 ? Results.Ok(new { ok = true }) : Results.NotFound(new { erro = "Produto não encontrado" });
        });
    }
}
