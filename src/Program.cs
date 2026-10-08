using Npgsql;
using ShopGame;
using ShopGame.Endpoints;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("ShopGame")
    ?? throw new InvalidOperationException("Connection string 'ShopGame' não configurada no appsettings.json");

// "dotnet run -- --setup-db" cria o banco e executa os scripts da pasta /database
if (args.Contains("--setup-db"))
{
    var pastaDatabase = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "database"));
    await DbSetup.ExecutarAsync(connectionString, pastaDatabase);
    return;
}

builder.Services.AddSingleton(NpgsqlDataSource.Create(connectionString));
// Mantém os nomes das colunas do banco (snake_case) no JSON enviado às telas
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = null;
    o.SerializerOptions.DictionaryKeyPolicy = null;
});

var app = builder.Build();

// Erros de regra de negócio lançados pelas procedures (RAISE EXCEPTION -> P0001)
// e violações de constraint viram respostas 400 com a mensagem para o usuário.
app.Use(async (ctx, next) =>
{
    try
    {
        await next();
    }
    catch (PostgresException ex) when (Erros.MensagemUsuario(ex) is string mensagem)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new { erro = mensagem });
    }
    catch (FormatException ex)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        await ctx.Response.WriteAsJsonAsync(new { erro = ex.Message });
    }
});

app.UseDefaultFiles();
// "no-cache": o navegador sempre confere se as telas mudaram, evitando CSS/JS antigos em cache
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx => ctx.Context.Response.Headers.CacheControl = "no-cache",
});

app.MapProdutos();
app.MapClientes();
app.MapVendas();
app.MapEstoque();
app.MapDashboard();

app.Run();
