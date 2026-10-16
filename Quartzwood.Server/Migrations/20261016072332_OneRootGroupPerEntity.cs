using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Quartzwood.Server.Migrations
{
    /// <inheritdoc />
    public partial class OneRootGroupPerEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Groups_OneRootPerEntity",
                table: "Groups",
                column: "EntityId",
                unique: true,
                filter: "ParentGroupId IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Groups_OneRootPerEntity",
                table: "Groups");
        }
    }
}
