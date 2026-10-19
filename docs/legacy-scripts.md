# Legacy scripts (kept on purpose)

The repository root contains a number of one-off import / analysis / debugging
scripts created during the data-acquisition phase. They are **not** part of the
running application and are **not** imported by `server/` or `client/`.

Nothing here is deleted — the audit rule for this codebase is "repair, don't remove".
This file exists so future contributors know what they are and when they can be
safely retired.

## Scraping / import (one-off, safe to run manually)

| Script | Purpose |
|---|---|
| `analyze-and-import-subcategories.js` | Classifies scraped businesses into subcategories |
| `analyze-apify-actors.cjs` | Lists Apify actors and their cost/quality |
| `analyze-categories.cjs`, `analyze-complete.js`, `analyze-database.js`, `analyze-db-clean.js` | Reporting over the scraped dataset |
| `analyze-district-coverage.js` | District coverage report for Lima |
| `analyze-openstreet-*.js` | OSM quality / coverage analysis |
| `batch-import-remaining.js`, `complete-import.js` | Batch import of pending records |
| `comas-import-*.js`, `import-comas-*.{js,cjs}` | Comas district import |
| `import_all_data.js`, `import_all_data.py`, `import_gastronomia.sql` | Bulk gastronomy import |
| `import-apify-data.js`, `import-gastronomia-data.js` | Apify dataset import |
| `import-openstreet-geojson.js` | OSM GeoJSON import |
| `run-*.js` | Runners for scraping waves / marketing analysis |
| `quick-openstreet-check.js`, `check-osm-import-status.js` | Status checks |

## Debug / auth helpers

`check-users.js`, `check-schema.js`, `debug-*.js`, `link-stack-user.js`,
`link-users.js`, `list-stack-users.js`, `setup-*`, `test-*.js`, `test-api.ps1`,
`create-user-preferences.js`.

These were used to debug the Stack Auth → self-hosted auth migration. They are
superseded by `scripts/ensure-auth-schema.mjs`, `scripts/smoke-auth.mjs` and
`scripts/verify-neon.mjs`.

## Notes

- Production code paths never import these files.
- `services/` is the maintained home for orchestration (`scraping-orchestrator`,
  `incremental-scraping`, `ai-content-generator`).
- If you retire a script, move it to `docs/archive/` rather than deleting it, so
  the history of the dataset work stays auditable.
