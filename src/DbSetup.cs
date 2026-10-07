using Npgsql;

namespace ShopGame;

/// <summary>
/// Cria o banco (se não existir) e executa os scripts da pasta /database na ordem:
/// tabelas -> functions -> views -> procedures -> inserts.
/// Uso: dotnet run -- --setup-db
/// </summary>
public static class DbSetup
{
    private static readonly string[] Ordem = ["tables", "functions", "views", "procedures", "inserts"];

    public static async Task ExecutarAsync(string connectionString, string pastaDatabase)
    {
        var csb = new NpgsqlConnectionStringBuilder(connectionString);
        var nomeBanco = csb.Database ?? "shopgame";

        await using (var admin = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(connectionString) { Database = "postgres" }.ConnectionString))
        {
            await admin.OpenAsync();
            await using var existe = new NpgsqlCommand("SELECT 1 FROM pg_database WHERE datname = $1", admin)
            {
                Parameters = { new() { Value = nomeBanco } },
            };
            if (await existe.ExecuteScalarAsync() is null)
            {
                await using var criar = new NpgsqlCommand($"CREATE DATABASE \"{nomeBanco.Replace("\"", "\"\"")}\"", admin);
                await criar.ExecuteNonQueryAsync();
                Console.WriteLine($"Banco \"{nomeBanco}\" criado.");
            }
        }

        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync();
        foreach (var pasta in Ordem)
        {
            foreach (var arquivo in Directory.GetFiles(Path.Combine(pastaDatabase, pasta), "*.sql").Order())
            {
                await using var cmd = new NpgsqlCommand(await File.ReadAllTextAsync(arquivo), conn);
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine($"✔ {pasta}/{Path.GetFileName(arquivo)}");
            }
        }
        Console.WriteLine("\nBanco pronto! Rode \"dotnet run\" e acesse http://localhost:5000");
    }
}
