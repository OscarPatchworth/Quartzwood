using System.Diagnostics;
using System.Globalization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Quartzwood.Server.Data;

namespace Quartzwood.Server.Services.Backups;

// Backs up quartzwood.db (all user data) on a schedule, while the server keeps running. See BACKUPS.md.
//
// Why not just copy the file? The database is in WAL mode: recent changes sit in quartzwood.db-wal until
// SQLite folds them into the main file, so a plain copy can miss them, or catch the file halfway through a
// write. SQLite's VACUUM INTO writes a complete, consistent copy of the database as it is at one moment,
// even while the app is using it. scryfall.db isn't backed up: it's a cache that's re-downloaded anyway
public class DatabaseBackupService : BackgroundService
{
    private const string FilePrefix = "quartzwood-";
    // e.g. quartzwood-2026-10-20_1305.db: sorts by date, and only files named like this are ever deleted
    private const string TimestampFormat = "yyyy-MM-dd_HHmm";
    private static readonly TimeSpan MaxCheckInterval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopes;
    private readonly BackupOptions _options;
    private readonly string _folder;
    private readonly ILogger<DatabaseBackupService> _logger;

    // Where backups go, as a full path
    public string Folder => _folder;

    public DatabaseBackupService(IServiceScopeFactory scopes, IOptions<BackupOptions> options, IHostEnvironment environment,
        ILogger<DatabaseBackupService> logger)
    {
        _scopes = scopes;
        _options = options.Value;
        _folder = Path.GetFullPath(_options.Folder, environment.ContentRootPath);
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogWarning("Database backups are turned off (Backups:Enabled = false)");
            return;
        }

        var interval = TimeSpan.FromHours(_options.IntervalHours);
        // Check often enough to notice a due backup soon after it's due, without busy-looping on tiny intervals
        var checkEvery = TimeSpan.FromTicks(Math.Clamp(interval.Ticks / 4, TimeSpan.FromSeconds(5).Ticks, MaxCheckInterval.Ticks));
        _logger.LogInformation("Database backups: every {Hours} hours into {Folder}", _options.IntervalHours, _folder);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var newest = ListBackups().Select(b => b.TakenAt).DefaultIfEmpty(DateTime.MinValue).Max();
                if (DateTime.Now - newest >= interval)
                    await BackUpAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // e.g. the disk is full or the folder isn't writable: try again at the next check
                _logger.LogError(ex, "Database backup failed; will try again in {Minutes} minutes", checkEvery.TotalMinutes);
            }

            try { await Task.Delay(checkEvery, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    // Writes a new backup now, then deletes the backups the retention rules no longer need. Returns its path
    public async Task<string?> BackUpAsync(CancellationToken cancellationToken = default)
    {
        string connectionString;
        using (var scope = _scopes.CreateScope())
            connectionString = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.GetConnectionString()!;

        // Read-only: if the database doesn't exist yet this fails instead of creating an empty one
        var source = new SqliteConnectionStringBuilder(connectionString) { Mode = SqliteOpenMode.ReadOnly, Pooling = false };
        if (!File.Exists(source.DataSource))
        {
            _logger.LogWarning("No database at {Path} yet: nothing to back up", Path.GetFullPath(source.DataSource));
            return null;
        }

        Directory.CreateDirectory(_folder);
        RemoveUnfinished();

        var stopwatch = Stopwatch.StartNew();
        var finalPath = Path.Combine(_folder, $"{FilePrefix}{DateTime.Now.ToString(TimestampFormat, CultureInfo.InvariantCulture)}.db");
        // Written under a temporary name first: a backup interrupted halfway (power cut, crash) is never
        // mistaken for a good one. Ends in .db so .gitignore's *.db covers it too
        var tempPath = Path.Combine(_folder, $"~{Path.GetFileName(finalPath)}");
        File.Delete(tempPath);

        await using (var connection = new SqliteConnection(source.ToString()))
        {
            await connection.OpenAsync(cancellationToken);
            await using var vacuum = connection.CreateCommand();
            vacuum.CommandText = "VACUUM INTO $path";
            vacuum.Parameters.AddWithValue("$path", tempPath);
            await vacuum.ExecuteNonQueryAsync(cancellationToken);
        }

        // A backup is only worth keeping if it can be opened and read back
        var check = await CheckAsync(tempPath, cancellationToken);
        if (check != "ok")
        {
            File.Delete(tempPath);
            throw new InvalidOperationException($"The new backup failed SQLite's integrity check: {check}");
        }
        File.Move(tempPath, finalPath, overwrite: true);

        var removed = Prune();
        _logger.LogInformation("Backed up the database to {Path} ({Size:N0} KB, {Ms} ms); {Removed} old backup(s) removed",
            finalPath, new FileInfo(finalPath).Length / 1024, stopwatch.ElapsedMilliseconds, removed);
        return finalPath;
    }

    // "ok" when SQLite can read the whole file back without finding damage
    public static async Task<string> CheckAsync(string path, CancellationToken cancellationToken = default)
    {
        var builder = new SqliteConnectionStringBuilder { DataSource = path, Mode = SqliteOpenMode.ReadOnly, Pooling = false };
        await using var connection = new SqliteConnection(builder.ToString());
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA integrity_check";
        return (string?)await command.ExecuteScalarAsync(cancellationToken) ?? "no answer";
    }

    // Backups this service made (other files in the folder, e.g. copies made by hand, are left alone)
    private List<(string Path, DateTime TakenAt)> ListBackups()
    {
        if (!Directory.Exists(_folder)) return [];
        return Directory.EnumerateFiles(_folder, $"{FilePrefix}*.db")
            .Select(path => (Path: path, Name: Path.GetFileNameWithoutExtension(path)[FilePrefix.Length..]))
            .Where(f => DateTime.TryParseExact(f.Name, TimestampFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
            .Select(f => (f.Path, DateTime.ParseExact(f.Name, TimestampFormat, CultureInfo.InvariantCulture)))
            .ToList();
    }

    // Leftovers of a backup that was interrupted
    private void RemoveUnfinished()
    {
        foreach (var path in Directory.EnumerateFiles(_folder, $"~{FilePrefix}*.db"))
            File.Delete(path);
    }

    private int Prune()
    {
        var toDelete = BackupRetention.ToDelete(ListBackups(), _options.KeepDaily, _options.KeepWeekly, _options.KeepMonthly);
        foreach (var path in toDelete) File.Delete(path);
        return toDelete.Count;
    }
}

// Which backups to keep: the newest one of each recent day, week and month ("grandfather-father-son").
// E.g. with 7/4/12 a year of daily backups is thinned to ~20 files, and you can still go back to last week,
// last month, or most of a year ago
public static class BackupRetention
{
    public static List<string> ToDelete(IEnumerable<(string Path, DateTime TakenAt)> backups, int keepDaily, int keepWeekly, int keepMonthly)
    {
        var newestFirst = backups.OrderByDescending(b => b.TakenAt).ToList();
        var keep = new HashSet<string>();
        if (newestFirst.Count > 0) keep.Add(newestFirst[0].Path);

        // GroupBy keeps the order groups first appear in (newest first), so Take(n) = the n most recent periods
        void KeepNewestOfEach<TKey>(Func<DateTime, TKey> period, int count)
        {
            foreach (var group in newestFirst.GroupBy(b => period(b.TakenAt)).Take(Math.Max(count, 0)))
                keep.Add(group.First().Path);
        }
        KeepNewestOfEach(t => t.Date, keepDaily);
        KeepNewestOfEach(t => (ISOWeek.GetYear(t), ISOWeek.GetWeekOfYear(t)), keepWeekly);
        KeepNewestOfEach(t => (t.Year, t.Month), keepMonthly);

        return newestFirst.Where(b => !keep.Contains(b.Path)).Select(b => b.Path).ToList();
    }
}
