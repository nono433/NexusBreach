using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();
var gameUrl = "http://localhost:5050";
var openBrowser = !args.Any(argument => argument.Equals("--no-browser", StringComparison.OrdinalIgnoreCase));

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new { status = "ok", game = "Nexus Breach" }));

if (openBrowser)
{
    app.Lifetime.ApplicationStarted.Register(() =>
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = gameUrl,
                UseShellExecute = true
            });
        }
        catch (Exception exception)
        {
            Console.WriteLine($"Impossible d'ouvrir le navigateur automatiquement : {exception.Message}");
            Console.WriteLine($"Ouvre manuellement : {gameUrl}");
        }
    });
}

Console.WriteLine($"Nexus Breach est disponible sur {gameUrl}");
if (openBrowser)
{
    Console.WriteLine("Le navigateur va s'ouvrir automatiquement.");
}
else
{
    Console.WriteLine("Ouverture automatique du navigateur désactivée.");
}

app.Run(gameUrl);
