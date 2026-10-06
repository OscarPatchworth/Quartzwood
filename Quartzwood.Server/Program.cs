using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Repositories;
// Using Services
using Quartzwood.Server.Services.Boxs;
using Quartzwood.Server.Services.Cards;
using Quartzwood.Server.Services.Entities;
using Quartzwood.Server.Services.Groups;
using Quartzwood.Server.Services.Scryfall;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=quartzwood.db"));
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
builder.Services.AddHttpClient<IScryfallService, ScryfallService>(client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("QuartzwoodApp/1.0");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/json");
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("DevPolicy");
app.MapControllers();

app.Run();