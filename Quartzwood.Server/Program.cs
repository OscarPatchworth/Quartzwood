using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
// Using Services
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.Accounts;
using Quartzwood.Server.Services.Backups;
using Quartzwood.Server.Services.Boxs;
using Quartzwood.Server.Services.Cards;
using Quartzwood.Server.Services.Entities;
using Quartzwood.Server.Services.Groups;
using Quartzwood.Server.Services.ImportExport;
using Quartzwood.Server.Services.Scryfall;
using Quartzwood.Server.Services.Tags;
using Quartzwood.Server.Services.Trades;


// Database backup commands (see BACKUPS.md); each does its job and exits instead of starting the server:
//   dotnet run -- --backup-now                take one backup (e.g. before dotnet ef database update)
//   dotnet run -- --restore <backup file>     put a backup in place of the database (stop the server first)
var backupNow = args.Contains("--backup-now");
var restoreIndex = Array.IndexOf(args, "--restore");
var restoreFrom = restoreIndex >= 0 && restoreIndex + 1 < args.Length ? args[restoreIndex + 1] : null;
var builder = WebApplication.CreateBuilder(args
    .Where((arg, index) => arg != "--backup-now" && (restoreIndex < 0 || (index != restoreIndex && index != restoreIndex + 1)))
    .ToArray());

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=quartzwood.db"));

// Auth: Identity handles users, password hashing and sign-in (cookie or bearer token)
builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<AppUser>()
    .AddEntityFrameworkStores<AppDbContext>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


// Repositories
builder.Services.AddScoped<ICardRepository, CardRepository>();
builder.Services.AddScoped<IEntityRepository, EntityRepository>();
builder.Services.AddScoped<IGroupRepository, GroupRepository>();
builder.Services.AddScoped<IBoxRepository, BoxRepository>();

// Query Services
builder.Services.AddScoped<ICardQueryService, CardQueryService>();
builder.Services.AddScoped<IEntityQueryService, EntityQueryService>();
builder.Services.AddScoped<IGroupQueryService, GroupQueryService>();
builder.Services.AddScoped<IBoxQueryService, BoxQueryService>();


// Command Services
builder.Services.AddScoped<ICardCommandService, CardCommandService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<ITradeService, TradeService>();
builder.Services.AddScoped<IEntityCommandService, EntityCommandService>();
builder.Services.AddScoped<IGroupCommandService, GroupCommandService>();
builder.Services.AddScoped<IBoxCommandService, BoxCommandService>();
builder.Services.AddScoped<IAccountService, AccountService>();

// Access checks: "is the logged-in user a member of the Entity that owns this?"
// HttpContextAccessor lets the service read the current request's user
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAccessService, AccessService>();
// Scryfall: a local copy of Scryfall's card data in scryfall.db (separate from user data),
// refreshed in the background every Scryfall:RefreshDays. Lookups use it first, the live API as fallback
builder.Services.Configure<ScryfallOptions>(builder.Configuration.GetSection("Scryfall"));
builder.Services.AddDbContext<ScryfallDbContext>(options =>
    options.UseSqlite("Data Source=scryfall.db"));
builder.Services.AddHttpClient<ScryfallApiService>(client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("QuartzwoodApp/1.0");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
});
builder.Services.AddHttpClient(ScryfallBulkImporter.HttpClientName, client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("QuartzwoodApp/1.0");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
    // The bulk file is ~80MB: allow more than the default 100 seconds
    client.Timeout = TimeSpan.FromMinutes(15);
});
builder.Services.AddScoped<IScryfallService, LocalScryfallService>();

// Card images: downloaded once from Scryfall's CDN, then served from disk (Scryfall:ImageCachePath)
builder.Services.AddHttpClient(ScryfallImageCache.HttpClientName, client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("QuartzwoodApp/1.0");
    client.DefaultRequestHeaders.Accept.ParseAdd("image/*");
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddSingleton<ScryfallImageCache>();

// Import/export in other apps' formats (plain text list, Moxfield/Deckbox CSV, ManaBox CSV)
builder.Services.AddScoped<CollectionTransferService>();
builder.Services.AddHostedService<ScryfallBulkImporter>();

// Backups of quartzwood.db on a schedule (Backups section of appsettings.json; see BACKUPS.md).
// One instance is both the background job and what --backup-now calls
builder.Services.Configure<BackupOptions>(builder.Configuration.GetSection("Backups"));
builder.Services.AddSingleton<DatabaseBackupService>();
builder.Services.AddHostedService(services => services.GetRequiredService<DatabaseBackupService>());

var app = builder.Build();

if (backupNow)
{
    var path = await app.Services.GetRequiredService<DatabaseBackupService>().BackUpAsync();
    Console.WriteLine(path is null ? "Nothing to back up: there's no database yet." : $"Backed up the database to {path}");
    return;
}

if (restoreIndex >= 0)
{
    if (restoreFrom is null)
    {
        Console.WriteLine("Which backup? dotnet run -- --restore Backups/quartzwood-2026-10-20_1305.db");
        Environment.ExitCode = 1;
        return;
    }
    using var scope = app.Services.CreateScope();
    var database = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database;
    try
    {
        var messages = await DatabaseRestore.RestoreAsync(restoreFrom, database.GetConnectionString()!,
            database.GetMigrations().ToList(), app.Services.GetRequiredService<DatabaseBackupService>().Folder);
        messages.ForEach(Console.WriteLine);
    }
    catch (InvalidOperationException ex)
    {
        Console.WriteLine($"Nothing was changed. {ex.Message}");
        Environment.ExitCode = 1;
    }
    return;
}

// scryfall.db is a re-downloadable cache, so it's created/upgraded automatically on startup
// (quartzwood.db, which holds user data, is still only migrated by hand with dotnet ef database update)
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<ScryfallDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("DevPolicy");
app.UseAuthentication();
app.UseAuthorization();

// /api/auth/login, /api/auth/refresh, /api/auth/manage/info, ...
app.MapGroup("/api/auth")
    .MapIdentityApi<AppUser>()
    .Add(endpoint =>
    {
        // Disable the built-in /register: sign-up goes through POST /api/account/register
        // so every new user also gets a Personal entity
        if (endpoint is RouteEndpointBuilder { RoutePattern.RawText: var route } && route?.EndsWith("/register") == true)
        {
            endpoint.Metadata.Add(new ExcludeFromDescriptionAttribute());
            endpoint.FilterFactories.Add((_, _) => _ => ValueTask.FromResult<object?>(Results.NotFound()));
        }
    });
app.MapControllers();

app.Run();