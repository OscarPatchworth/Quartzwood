using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quartzwood.Server.Migrations.Scryfall
{
    /// <inheritdoc />
    public partial class PrintingGameplayData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ColorIdentity",
                table: "Printings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Colors",
                table: "Printings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ManaCost",
                table: "Printings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "ManaValue",
                table: "Printings",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TypeLine",
                table: "Printings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DataVersion",
                table: "ImportState",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ColorIdentity",
                table: "Printings");

            migrationBuilder.DropColumn(
                name: "Colors",
                table: "Printings");

            migrationBuilder.DropColumn(
                name: "ManaCost",
                table: "Printings");

            migrationBuilder.DropColumn(
                name: "ManaValue",
                table: "Printings");

            migrationBuilder.DropColumn(
                name: "TypeLine",
                table: "Printings");

            migrationBuilder.DropColumn(
                name: "DataVersion",
                table: "ImportState");
        }
    }
}
