# Database backups

Everything users create (accounts, entities, groups, boxes, cards, tags) lives in **`quartzwood.db`**.
The server backs it up by itself while it runs. `scryfall.db` and `image-cache/` aren't backed up:
they're caches that are downloaded again if lost.

## What happens automatically

- **Once a day** the server writes a full copy to `Quartzwood.Server/Backups/quartzwood-2026-10-20_1305.db`
  (date and time in the name). It checks on startup and then every hour, so the backup still
  happens if the server is only on for part of the day.
- **Old backups are thinned out.** It keeps the newest backup of each of the last **7 days**,
  **4 weeks** and **12 months**, about 20 files in total. That's enough to go back to yesterday,
  last week, or most of a year ago.
- Only files it made itself (`quartzwood-<date>_<time>.db`) are ever deleted. Copies you make by hand
  or the `before-restore-…` files stay until you delete them.
- Each backup is checked (`PRAGMA integrity_check`) before it counts as a backup.
- The `Backups` folder is in `.gitignore`. Backups contain every account's password hash, so they
  must never be committed.

The server log shows each backup:
`Backed up the database to …\Backups\quartzwood-2026-10-20_1305.db (232 KB, 50 ms); 1 old backup(s) removed`

### Why not just copy the file?

The database runs in SQLite's **WAL mode**: new changes are first written to `quartzwood.db-wal`
and folded into `quartzwood.db` later. A plain copy of `quartzwood.db` can miss them, or catch the
file halfway through a write. The backup uses SQLite's `VACUUM INTO`, which writes a complete,
consistent copy of the database as it was at one moment, while the server keeps running.

## Settings (`appsettings.json`, section `Backups`)

| Setting | Default | |
|---|---|---|
| `Enabled` | `true` | |
| `Folder` | `Backups` | Relative to `Quartzwood.Server/`, or an absolute path |
| `IntervalHours` | `24` | |
| `KeepDaily` / `KeepWeekly` / `KeepMonthly` | `7` / `4` / `12` | |

### Keep a copy somewhere else

A backup on the same disk as the database doesn't help if that disk dies or the laptop is lost.
The usual rule of thumb ("3-2-1") is **3 copies, on 2 different devices, 1 of them off-site**. The
easy way is to point `Folder` at a folder that syncs to the cloud, e.g. in `appsettings.Development.json`:

```json
"Backups": { "Folder": "C:\\Users\\<you>\\OneDrive\\Quartzwood Backups" }
```

## Back up right now

Before anything risky, such as a migration (`dotnet ef database update`) or a big import:

```bash
cd Quartzwood.Server
dotnet run -- --backup-now
```

It writes one backup and exits. It's fine to run while the server is also running.

## Restore a backup

1. **Stop the server.** The restore refuses to run while the database is in use.
2. Run:
   ```bash
   cd Quartzwood.Server
   dotnet run -- --restore Backups/quartzwood-2026-10-20_1305.db
   ```
   It checks that the file is a healthy Quartzwood database, saves the current database as
   `Backups/before-restore-<date>.db` (so the restore can be undone the same way), removes the old
   `-wal`/`-shm` files, and puts the backup in place.
3. If it says the backup is from before a database change, run
   `dotnet ef database update --context AppDbContext`.
4. Start the server.

Don't restore by copying files over `quartzwood.db` by hand. If an old `quartzwood.db-wal` is left
next to it, SQLite may apply the *old* database's pending changes to the restored one and corrupt it.
The restore command deletes those files for you.

**Try a restore now and then**, e.g. into a copy of the project folder. A backup you've never restored
is a backup you only hope works.

## Other ways it could be done

- **A log of every change**, replayed on top of the last full backup, can restore to any moment
  ("point-in-time recovery"). Big databases like PostgreSQL work this way, and for SQLite a tool
  called [Litestream](https://litestream.io) streams changes to cloud storage. It's worth it when
  losing even a few hours of changes matters. For a personal collection, daily snapshots and the
  pre-migration `--backup-now` are the usual choice.
- **Hosted databases** (e.g. PostgreSQL on Azure or AWS) come with automatic backups built in, if
  Quartzwood ever moves off SQLite.
