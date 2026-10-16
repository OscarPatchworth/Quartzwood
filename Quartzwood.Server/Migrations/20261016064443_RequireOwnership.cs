using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quartzwood.Server.Migrations
{
    /// <inheritdoc />
    public partial class RequireOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Boxes_Groups_GroupId",
                table: "Boxes");

            migrationBuilder.DropForeignKey(
                name: "FK_Cards_Boxes_BoxId",
                table: "Cards");

            migrationBuilder.AlterColumn<Guid>(
                name: "EntityId",
                table: "Groups",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "BoxId",
                table: "Cards",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "GroupId",
                table: "Boxes",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Boxes_Groups_GroupId",
                table: "Boxes",
                column: "GroupId",
                principalTable: "Groups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Cards_Boxes_BoxId",
                table: "Cards",
                column: "BoxId",
                principalTable: "Boxes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Boxes_Groups_GroupId",
                table: "Boxes");

            migrationBuilder.DropForeignKey(
                name: "FK_Cards_Boxes_BoxId",
                table: "Cards");

            migrationBuilder.AlterColumn<Guid>(
                name: "EntityId",
                table: "Groups",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "BoxId",
                table: "Cards",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "GroupId",
                table: "Boxes",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AddForeignKey(
                name: "FK_Boxes_Groups_GroupId",
                table: "Boxes",
                column: "GroupId",
                principalTable: "Groups",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Cards_Boxes_BoxId",
                table: "Cards",
                column: "BoxId",
                principalTable: "Boxes",
                principalColumn: "Id");
        }
    }
}
