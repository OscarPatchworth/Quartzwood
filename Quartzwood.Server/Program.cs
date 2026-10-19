using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
// Using Services
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.Accounts;
using Quartzwood.Server.Services.Boxs;
using Quartzwood.Server.Services.Cards;
using Quartzwood.Server.Services.Entities;
using Quartzwood.Server.Services.Groups;
using Quartzwood.Server.Services.ImportExport;
using Quartzwood.Server.Services.Scryfall;


var builder = WebApplication.CreateBuilder(args);

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

var app = builder.Build();

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