using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quartzwood.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddDividers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DividerId",
                table: "Cards",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Dividers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    BoxId = table.Column<Guid>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Dividers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Dividers_Boxes_BoxId",
                        column: x => x.BoxId,
                        principalTable: "Boxes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cards_DividerId",
                table: "Cards",
                column: "DividerId");

            migrationBuilder.CreateIndex(
                name: "IX_Dividers_BoxId",
                table: "Dividers",
                column: "BoxId");

            migrationBuilder.AddForeignKey(
                name: "FK_Cards_Dividers_DividerId",
                table: "Cards",
                column: "DividerId",
                principalTable: "Dividers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cards_Dividers_DividerId",
                table: "Cards");

            migrationBuilder.DropTable(
                name: "Dividers");

            migrationBuilder.DropIndex(
                name: "IX_Cards_DividerId",
                table: "Cards");

            migrationBuilder.DropColumn(
                name: "DividerId",
                table: "Cards");
        }
    }
}
