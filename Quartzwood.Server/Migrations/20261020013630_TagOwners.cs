using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quartzwood.Server.Migrations
{
    /// <inheritdoc />
    public partial class TagOwners : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Tags",
                type: "TEXT",
                maxLength: 40,
                nullable: false,
                collation: "NOCASE",
                oldClrType: typeof(string),
                oldType: "TEXT");

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerId",
                table: "Tags",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Tags_OwnerId_Name",
                table: "Tags",
                columns: new[] { "OwnerId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Tags_AspNetUsers_OwnerId",
                table: "Tags",
                column: "OwnerId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tags_AspNetUsers_OwnerId",
                table: "Tags");

            migrationBuilder.DropIndex(
                name: "IX_Tags_OwnerId_Name",
                table: "Tags");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "Tags");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Tags",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldMaxLength: 40,
                oldCollation: "NOCASE");
        }
    }
}
