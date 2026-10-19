using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quartzwood.Server.Migrations.Scryfall
{
    /// <inheritdoc />
    public partial class InitialScryfall : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImportState",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BulkUpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ImportedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    CardCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportState", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Printings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false, collation: "NOCASE"),
                    FrontFaceName = table.Column<string>(type: "TEXT", nullable: true, collation: "NOCASE"),
                    SetCode = table.Column<string>(type: "TEXT", nullable: false, collation: "NOCASE"),
                    SetType = table.Column<string>(type: "TEXT", nullable: true),
                    CollectorNumber = table.Column<string>(type: "TEXT", nullable: false, collation: "NOCASE"),
                    Lang = table.Column<string>(type: "TEXT", nullable: true),
                    ReleasedAt = table.Column<DateOnly>(type: "TEXT", nullable: true),
                    IsPaper = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsPromo = table.Column<bool>(type: "INTEGER", nullable: false),
                    PromoTypes = table.Column<string>(type: "TEXT", nullable: true),
                    Layout = table.Column<string>(type: "TEXT", nullable: true),
                    ImageSmall = table.Column<string>(type: "TEXT", nullable: true),
                    ImageNormal = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Printings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Printings_FrontFaceName",
                table: "Printings",
                column: "FrontFaceName");

            migrationBuilder.CreateIndex(
                name: "IX_Printings_Name",
                table: "Printings",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_Printings_SetCode_CollectorNumber",
                table: "Printings",
                columns: new[] { "SetCode", "CollectorNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImportState");

            migrationBuilder.DropTable(
                name: "Printings");
        }
    }
}
