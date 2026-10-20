# Quartzwood
*Physical MTG Collection Manager*

Most collection apps track **what** cards you own. Quartzwood also tracks **where** each one is:
which binder, which box, which shelf. It's for finding a card in a physical collection, pulling a
deck's worth of cards out of a dozen boxes, and keeping track of trades.

---

## Features

### Organise a collection the way it sits on your shelf
- **Groups and boxes**
  - Groups nest inside groups, and boxes sit inside groups
  - e.g. *Collection › Binders › Red Binder*
  - Breadcrumbs show where you are
- **Every copy is its own card**
  - Printing, condition, foil/etched, stamp, language
  - Proxy, signed, alter artist, notes, purchase price
  - Identical copies stack in the box view
- **Adding cards**
  - By set code + collector number, or by name with suggestions
  - Promos, stamped and *The List* cards
  - Many copies at once
- **Mass edit**
  - Select cards in a box, then edit, move, tag or delete them together

### Find things
- **Search**
  - Your whole collection, by name or set code
  - Each result shows its box and where that box is
- **Sort**
  - Name, date added, release date, mana value, colour, price
- **Filter**
  - Mana value range, price range, tags
- **Find a list**
  - Paste or import a deck list / CSV export
  - Shows what you have and where every copy is
  - Missing cards are highlighted in red
  - **Optimize fetch**: a pick list that opens as few boxes as possible
  - Then move the collected cards to a new or existing box, or delete them
- **Tags**
  - Your own labels, e.g. *Trade*, *Cube*, *For deck X*
  - Everyone sees a card's tags; suggestions only show your own

### Prices and trading
- **Prices**
  - USD, TCGplayer market price via Scryfall
  - Refreshed daily, matched to each card's foil type
  - Shown on cards; usable as a sort and a filter
- **Trade page**
  - Add what you receive; pick what you give from your collection
  - Running balance, with cards worth more than what's left to give greyed out
  - Pick list to collect your side box by box
  - Finishing adds and removes the cards in one step (all or nothing)

### Import, export and backups
- **Import / export**
  - A box or a whole group
  - Plain text list, Moxfield/Deckbox CSV, ManaBox CSV
- **Automatic backups**
  - Daily, while the server runs
  - Keeps the last 7 days, 4 weeks and 12 months
  - One command to back up now or restore
  - See [Quartzwood.Server/BACKUPS.md](Quartzwood.Server/BACKUPS.md)

### Accounts
- Register and log in
- Each user gets their own personal collection

---

## Stack

| | |
|---|---|
| **Server** | ASP.NET Core (.NET 10) Web API · Entity Framework Core · ASP.NET Identity (cookie auth) · SQLite |
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS · React Router |
| **API client** | Generated from the server's OpenAPI description with [Hey API](https://heyapi.dev) |
| **Card data** | [Scryfall](https://scryfall.com): the daily bulk data file is kept in a local database (`scryfall.db`), so lookups, suggestions, prices and images don't call Scryfall's API for every request |

Two databases:
- **`quartzwood.db`**: everything users create. It's backed up automatically.
- **`scryfall.db`**: a cache of Scryfall's card data. It's downloaded and refreshed by the server, so it never needs backing up.

---

## Running it locally

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download), [Node.js](https://nodejs.org) 20+,
and the EF Core tools (`dotnet tool install --global dotnet-ef`).

```bash
git clone https://github.com/OscarPatchworth/Quartzwood
cd Quartzwood

# Server: http://localhost:5163
cd Quartzwood.Server
dotnet ef database update --context AppDbContext   # creates quartzwood.db
dotnet run

# Frontend: http://localhost:5173 (in a second terminal)
cd frontend
npm install
npm run dev
```

On first start the server downloads Scryfall's card data (~80 MB) into `scryfall.db`. Card lookups
fall back to Scryfall's live API until that finishes. Then open http://localhost:5173 and register
an account.

### Common tasks

| Task | Command |
|---|---|
| Apply new database migrations | `dotnet ef database update --context AppDbContext` (in `Quartzwood.Server`) |
| Back up the database now | `dotnet run -- --backup-now` |
| Restore a backup (server stopped) | `dotnet run -- --restore Backups/quartzwood-<date>.db` |
| Update the frontend's API types after changing a server DTO | With the server running: `npm run generate-types` (in `frontend`) |

---

## Project layout

```
Quartzwood.Server/        ASP.NET Core API
  Controllers/            HTTP endpoints (/api/...)
  Services/               The logic: cards, search, trades, tags, import/export, Scryfall, backups
  Repositories/           Database queries
  Models/  DTOs/  Data/   EF Core entities, API shapes, DbContexts
  Migrations/             Schema history for quartzwood.db and scryfall.db
frontend/                 React app
  src/pages/              One per route (Collection, Box, Search, Trade, ...)
  src/components/         UI pieces, grouped by feature
  src/hooks/              Shared state helpers (selection, sort, filters, saved drafts)
  src/interfaces/         Generated API client (don't edit by hand)
```

---

## Roadmap

**Next**
- **UI make-over**
  - A consistent look across pages
  - More personalized look
  - Better on phones
- **Testing**
  - Automated server tests (services, endpoints)
  - Frontend / end-to-end tests for the main flows
- **Shared collections**
  - Invite other users to an Entity (a shop, a playgroup, a lending library)
  - Roles: Owner, Editor, Viewer
  - The data model already supports this; the invite UI doesn't exist yet
- **Card lending library**
  - Lend cards out and track who has them
- **Trade history**
  - A record of finished trades
- **Box rules**
  - Auto-sort incoming cards and deck lists into the right boxes

**Considering**
- **Selling interface**
- **Currency setting**
  - Prices in something other than USD
- **PostgreSQL**
  - Only if Quartzwood is ever hosted publicly
  - A database server that several copies of the app can share, instead of a single file on one machine

---

## How it was built

Quartzwood's design, features and direction are mine. Much of the .NET + React code for the later
features (mass edit, sort/filter, prices, tags, trading, Find a list, backups) was written with
Claude (Anthropic's AI assistant), working in stages that I reviewed, tested and committed.
Commits titled 'Claude Opus 5.5 ...' mark that work.

## Legacy Python CLI

Quartzwood started as a Python command-line tool (Typer, SQLModel, FastAPI). That code is still in
`quartzwood/`, `migrations/`, `alembic.ini` and `pyproject.toml`, but it's no longer developed and
uses its own separate database. The .NET + React app above replaces it.
