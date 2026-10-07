using Npgsql;

namespace ShopGame.Endpoints;

public static class ClientesEndpoints
{
    public static void MapClientes(this WebApplication app)
    {
        var grupo = app.MapGroup("/api/clientes");

        // Lista de clientes com nível de fidelidade -> usa a FUNCTION fn_nivel_cliente
        grupo.MapGet("/", async (NpgsqlDataSource ds) =>
            await ds.ConsultarAsync(
                @"SELECT c.*,
                         fn_nivel_cliente(c.id) AS nivel,
                         COALESCE((SELECT SUM(total) FROM vendas v
                                    WHERE v.cliente_id = c.id AND v.status = 'CONCLUIDA'), 0) AS total_gasto
                    FROM clientes c
                   ORDER BY c.nome"));

        // Prévia do desconto na tela de venda -> usa a FUNCTION fn_calcular_desconto
        grupo.MapGet("/{id:int}/desconto", async (NpgsqlDataSource ds, int id, decimal? subtotal) =>
        {
            var valor = subtotal ?? 0;
            var r = (await ds.ConsultarAsync(
                "SELECT fn_nivel_cliente($1) AS nivel, fn_calcular_desconto($1, $2) AS desconto", id, valor))[0];
            var desconto = (decimal)r["desconto"]!;
            return new { nivel = r["nivel"], desconto, subtotal = valor, total = valor - desconto };
        });

        grupo.MapPost("/", async (NpgsqlDataSource ds, HttpRequest req) =>
        {
            var b = await Corpo.LerAsync(req);
            var id = await ds.EscalarAsync(
                "INSERT INTO clientes (nome, cpf, email, telefone) VALUES ($1, $2, $3, $4) RETURNING id",
                b.Texto("nome"), b.Texto("cpf"), b.Texto("email"), b.Texto("telefone"));
            return Results.Created($"/api/clientes/{id}", new { id });
        });

        grupo.MapPut("/{id:int}", async (NpgsqlDataSource ds, HttpRequest req, int id) =>
        {
            var b = await Corpo.LerAsync(req);
            var alterados = await ds.ExecutarAsync(
                "UPDATE clientes SET nome = $1, cpf = $2, email = $3, telefone = $4 WHERE id = $5",
                b.Texto("nome"), b.Texto("cpf"), b.Texto("email"), b.Texto("telefone"), id);
            return alterados > 0 ? Results.Ok(new { ok = true }) : Results.NotFound(new { erro = "Cliente não encontrado" });
        });

        grupo.MapDelete("/{id:int}", async (NpgsqlDataSource ds, int id) =>
        {
            try
            {
                var alterados = await ds.ExecutarAsync("DELETE FROM clientes WHERE id = $1", id);
                return alterados > 0 ? Results.Ok(new { ok = true }) : Results.NotFound(new { erro = "Cliente não encontrado" });
            }
            catch (PostgresException ex) when (ex.SqlState == PostgresErrorCodes.ForeignKeyViolation)
            {
                return Results.BadRequest(new { erro = "Cliente possui vendas e não pode ser excluído." });
            }
        });
    }
}
