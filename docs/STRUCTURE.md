# PabloSMM repository layout

## Applications

| Path | Role |
|------|------|
| `apps/web` | Next.js customer site, wallet, orders, admin dashboard |
| `apps/api` | Go REST API, order placement, wallet, admin, reseller `/api/v2` |

## Backend (`apps/api`)

```
cmd/server/          HTTP entrypoint
cmd/goose/           Migration helper
cmd/refine/          Offline service tagging tool
internal/
  config/            Environment configuration
  db/                PostgreSQL pool + sqlc queries
  handlers/          HTTP handlers
  provider/          Upstream panel defaults (TopSMM)
  server/            Chi router and middleware
  service/smm/       TopSMM API client + catalog normalization
  service/syncer/    Order status polling (every 2 min)
sql/schema/          Goose migrations
sql/queries/         sqlc query sources
```

## Money and provider

- **Currency:** INR only. Wallet balances and catalog sell prices are in **paise** (integer) or **INR** decimals in `pablo_catalog`; there is no USD/FX conversion layer.
- **Upstream provider:** [TopSMM](https://topsmm.in) (`TOPSMM_API_URL`, `TOPSMM_API_KEY`). Defaults live in `internal/provider/topsmm.go`.

## Frontend (`apps/web`)

- `app/` — App Router pages (landing, order flow, admin, provider verify tokens)
- `components/` — UI including `layout/CurrencyProvider` (INR formatting only)
- `lib/` — API config, auth helpers, service hooks

## Docs and tooling

- Root `README.md` — setup and deploy
- `scripts/` — non-production dev utilities (see `scripts/README.md`)
