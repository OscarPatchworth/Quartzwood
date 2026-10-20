namespace Quartzwood.Server.Services.Backups;

// The "Backups" section of appsettings.json. See BACKUPS.md
public class BackupOptions
{
    public bool Enabled { get; set; } = true;

    // Where backups are written. Relative paths are inside the server's folder; an absolute path can point
    // somewhere safer, e.g. a OneDrive/Dropbox folder or another drive (a backup on the same disk doesn't
    // survive that disk dying)
    public string Folder { get; set; } = "Backups";

    // How often to back up. Checked every hour (and on startup), so a server that's only on for an hour a
    // day still gets its daily backup
    public double IntervalHours { get; set; } = 24;

    // Which backups to keep ("grandfather-father-son"): the newest backup of each of the last KeepDaily days,
    // of each of the last KeepWeekly weeks, and of each of the last KeepMonthly months. Everything else
    // that this service made is deleted. The newest backup is always kept
    public int KeepDaily { get; set; } = 7;
    public int KeepWeekly { get; set; } = 4;
    public int KeepMonthly { get; set; } = 12;
}
