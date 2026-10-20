using Microsoft.Data.Sqlite;

namespace Quartzwood.Server.Services.Backups;

// Puts a backup back in place of quartzwood.db: dotnet run -- --restore <backup file>. See BACKUPS.md.
// Doing it by hand is easy to get wrong: the old quartzwood.db-wal / -shm files must go too, or SQLite may
// apply the OLD database's pending changes to the restored one and corrupt it
public static class DatabaseRestore
{
    // Throws InvalidOperationException with a message for the person running it when it can't restore.
    // knownMigrations: this version of the app's migrations, to say whether the backup needs updating
    public static async Task<List<string>> RestoreAsync(string backupPath, string connectionString,
        IReadOnlyList<string> knownMigrations, string backupFolder)
    {
        backupPath = Path.GetFullPath(backupPath);
        if (!File.Exists(backupPath)) throw new InvalidOperationException($"There's no file at {backupPath}.");

        // 1. Is it a healthy Quartzwood database? (Not some other file, or scryfall.db by mistake)
        List<string>? backupMigrations;
        try
        {
            var check = await DatabaseBackupService.CheckAsync(backupPath);
            if (check != "ok") throw new InvalidOperationException($"{backupPath} isn't a healthy database: {check}");
            backupMigrations = await AppliedMigrationsAsync(backupPath);
        }
        catch (SqliteException ex)
        {
            throw new InvalidOperationException($"{backupPath} isn't a database SQLite can read: {ex.Message}");
        }
        if (backupMigrations is null)
            throw new InvalidOperationException($"{backupPath} isn't a Quartzwood database backup.");

        var dbPath = Path.GetFullPath(new SqliteConnectionStringBuilder(connectionString).DataSource);
        var messages = new List<string>();

        if (File.Exists(dbPath))
        {
            // 2. Nothing can have the database open: the running server would keep writing to the old file
            if (IsInUse(dbPath))
                throw new InvalidOperationException("The database is in use: stop the server first, then run the restore again.");

            // 3. Keep what's there now, so the restore itself can be undone (VACUUM INTO also picks up anything
            // still in the -wal file from a server that didn't shut down cleanly)
            Directory.CreateDirectory(backupFolder);
            var safetyCopy = Path.Combine(backupFolder, $"before-restore-{DateTime.Now:yyyy-MM-dd_HHmmss}.db");
            await VacuumIntoAsync(dbPath, safetyCopy);
            SqliteConnection.ClearAllPools();
            messages.Add($"The database as it was is saved as {safetyCopy}");

            File.Delete(dbPath);
            File.Delete(dbPath + "-wal");
            File.Delete(dbPath + "-shm");
        }

        // 4. The backup in its place, in WAL mode like a database the server creates
        File.Copy(backupPath, dbPath);
        await using (var connection = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = dbPath, Pooling = false }.ToString()))
        {
            await connection.OpenAsync();
            await using var wal = connection.CreateCommand();
            wal.CommandText = "PRAGMA journal_mode=WAL";
            await wal.ExecuteScalarAsync();
        }
        messages.Insert(0, $"Restored {backupPath}");

        // 5. A backup from an older version needs the newer migrations before the server can use it
        var missing = knownMigrations.Except(backupMigrations).ToList();
        var unknown = backupMigrations.Except(knownMigrations).ToList();
        if (missing.Count > 0)
            messages.Add($"This backup is from before {missing.Count} database change(s). Before starting the server, run: " +
                "dotnet ef database update --context AppDbContext");
        if (unknown.Count > 0)
            messages.Add($"Careful: this backup was made by a newer version of Quartzwood ({unknown.Count} unknown migration(s)).");
        return messages;
    }

    // Windows won't let a file that another process has open be opened exclusively. (On Linux/macOS this
    // check can't tell, so stopping the server first is up to you there)
    private static bool IsInUse(string path)
    {
        try
        {
            using var _ = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None);
            return false;
        }
        catch (IOException)
        {
            return true;
        }
    }

    private static async Task VacuumIntoAsync(string sourcePath, string targetPath)
    {
        var source = new SqliteConnectionStringBuilder { DataSource = sourcePath, Mode = SqliteOpenMode.ReadOnly, Pooling = false };
        await using var connection = new SqliteConnection(source.ToString());
        await connection.OpenAsync();
        await using var vacuum = connection.CreateCommand();
        vacuum.CommandText = "VACUUM INTO $path";
        vacuum.Parameters.AddWithValue("$path", targetPath);
        await vacuum.ExecuteNonQueryAsync();
    }

    // The migrations EF has applied to that database; null when it isn't a Quartzwood database
    // (no migration history, or not the user data tables: scryfall.db has a migration history too)
    private static async Task<List<string>?> AppliedMigrationsAsync(string path)
    {
        var builder = new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadOnly, Pooling = false };
        await using var connection = new SqliteConnection(builder.ToString());
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('__EFMigrationsHistory', 'Cards', 'AspNetUsers')";
        if (Convert.ToInt32(await command.ExecuteScalarAsync()) != 3) return null;

        command.CommandText = "SELECT MigrationId FROM __EFMigrationsHistory";
        var migrations = new List<string>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) migrations.Add(reader.GetString(0));
        return migrations;
    }
}
