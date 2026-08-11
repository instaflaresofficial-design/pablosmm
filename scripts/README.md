# Development scripts

One-off tools used while integrating **TopSMM** and debugging panels. They are **not** part of the production build.

| Location | Purpose |
|----------|---------|
| `scripts/dev/` | Root-level Python helpers (API checks, scrapers, one-time fixes) |
| `scripts/dev/api/` | Go/Python utilities that were previously loose under `apps/api/` |
| `scripts/dev/catalog-port/` | Ad-hoc porting scripts for admin catalog UI |

Run from the repo root, for example:

```bash
python scripts/dev/check_db.py
```

Do not commit generated dumps (`.json`, `.db`, large HTML captures); patterns are listed in the root `.gitignore`.
