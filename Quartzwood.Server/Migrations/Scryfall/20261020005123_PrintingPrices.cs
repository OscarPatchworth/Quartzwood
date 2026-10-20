using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quartzwood.Server.Migrations.Scryfall
{
    /// <inheritdoc />
    public partial class PrintingPrices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PriceUsd",
                table: "Printings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceUsdEtched",
                table: "Printings",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PriceUsdFoil",
                table: "Printings",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PriceUsd",
                table: "Printings");

            migrationBuilder.DropColumn(
                name: "PriceUsdEtched",
                table: "Printings");

            migrationBuilder.DropColumn(
                name: "PriceUsdFoil",
                table: "Printings");
        }
    }
}
