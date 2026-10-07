using System.Globalization;
using System.Text.Json.Nodes;
using Npgsql;

namespace ShopGame;

/// <summary>Atalhos para executar SQL e devolver as linhas como dicionários (coluna -> valor).</summary>
public static class Db
{
    public static async Task<List<Dictionary<string, object?>>> ConsultarAsync(
        this NpgsqlDataSource ds, string sql, params object?[] parametros)
    {
        await using var conn = await ds.OpenConnectionAsync();
        return await conn.ConsultarAsync(sql, parametros);
    }

    public static async Task<List<Dictionary<string, object?>>> ConsultarAsync(
        this NpgsqlConnection conn, string sql, params object?[] parametros)
    {
        await using var cmd = Comando(conn, sql, parametros);
        await using var reader = await cmd.ExecuteReaderAsync();
        var linhas = new List<Dictionary<string, object?>>();
        while (await reader.ReadAsync())
        {
            var linha = new Dictionary<string, object?>();
            for (var i = 0; i < reader.FieldCount; i++)
                linha[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            linhas.Add(linha);
        }
        return linhas;
    }

    public static async Task<int> ExecutarAsync(this NpgsqlDataSource ds, string sql, params object?[] parametros)
    {
        await using var conn = await ds.OpenConnectionAsync();
        return await conn.ExecutarAsync(sql, parametros);
    }

    public static async Task<int> ExecutarAsync(this NpgsqlConnection conn, string sql, params object?[] parametros)
    {
        await using var cmd = Comando(conn, sql, parametros);
        return await cmd.ExecuteNonQueryAsync();
    }

    public static async Task<object?> EscalarAsync(this NpgsqlDataSource ds, string sql, params object?[] parametros)
    {
        await using var conn = await ds.OpenConnectionAsync();
        await using var cmd = Comando(conn, sql, parametros);
        return await cmd.ExecuteScalarAsync();
    }

    // Parâmetros posicionais: $1, $2, ...
    private static NpgsqlCommand Comando(NpgsqlConnection conn, string sql, object?[] parametros)
    {
        var cmd = new NpgsqlCommand(sql, conn);
        foreach (var p in parametros)
            cmd.Parameters.Add(new NpgsqlParameter { Value = p ?? DBNull.Value });
        return cmd;
    }
}

/// <summary>Leitura tolerante dos campos enviados pelas telas (aceita número ou texto).</summary>
public static class Corpo
{
    public static async Task<JsonObject> LerAsync(HttpRequest req) =>
        await JsonNode.ParseAsync(req.Body) as JsonObject ?? new JsonObject();

    public static string? Texto(this JsonObject o, string campo)
    {
        var texto = o[campo]?.ToString().Trim();
        return string.IsNullOrEmpty(texto) ? null : texto;
    }

    public static int? Inteiro(this JsonObject o, string campo)
    {
        var texto = o.Texto(campo);
        if (texto is null) return null;
        return int.TryParse(texto, NumberStyles.Integer, CultureInfo.InvariantCulture, out var v)
            ? v
            : throw new FormatException($"Valor inválido para \"{campo}\"");
    }

    public static decimal? Decimal(this JsonObject o, string campo)
    {
        var texto = o.Texto(campo)?.Replace(',', '.');
        if (texto is null) return null;
        return decimal.TryParse(texto, NumberStyles.Number, CultureInfo.InvariantCulture, out var v)
            ? v
            : throw new FormatException($"Valor inválido para \"{campo}\"");
    }
}

public static class Erros
{
    public static string? MensagemUsuario(PostgresException ex) => ex.SqlState switch
    {
        "P0001" => ex.MessageText,
        PostgresErrorCodes.UniqueViolation => "Registro duplicado (verifique CPF ou campos únicos).",
        PostgresErrorCodes.CheckViolation => "Valor inválido para um dos campos.",
        PostgresErrorCodes.NotNullViolation => "Preencha todos os campos obrigatórios.",
        PostgresErrorCodes.ForeignKeyViolation => "Registro está vinculado a outros dados.",
        _ => null,
    };
}
