# Data pipeline: how Mobility Talk finds, checks and adds listings

Started November 23, 2026, modeled on the Ohio Cannabis Directory (`travisvought-byte/ohio-cannabis-directory`):
a registry of where to look, a normalized staging file per research batch, evidence levels on every row,
duplicate checks against what is already published, and a coverage report that says what to work on next.
The rule that matters most is unchanged: every listing names the page it was checked against and the date.

## The pieces

| Piece | What it is |
|---|---|
| `pipeline/registry.json` | Source families (state AT programs, Centers for Independent Living, UCEDDs, ADA Centers, talking-book libraries, equipment loan and reuse, local transit, and the five country sections), what each place should have, and the national directories to start from. Also defines the evidence levels. |
| `pipeline/batches/DATE-NAME/candidates.csv` | One normalized row per candidate listing from a research run, with its decision (`new`, `duplicate`, `rejected`, `review`, `promoted`) and why. Columns are in `scripts/mining/common.py` (`COLUMNS`). |
| `pipeline/batches/DATE-NAME/skipped.csv` | What researchers looked for and could not trace (blocked site, no own page, closed). These are the next batch's leads. |
| `pipeline/batches/DATE-NAME/research/*.json` | The researchers' raw output, kept so a batch can be re-staged. |
| `pipeline/coverage.json`, `docs/COVERAGE.md` | Generated coverage report: missing families per state and territory, missing sections per country, thinnest places first, and the queue for the next batch. |
| `scripts/mining/stage.py` | Checks and normalizes researcher output, finds duplicates (same page, same phone number, or nearly the same name in the same place), writes the two CSVs. |
| `scripts/mining/promote.py` | Publishes a batch's `new` rows: US rows into `data/added-programs.json`, country rows into `data/world.json`. Never overwrites or deletes. |
| `scripts/mining/coverage.py` | Writes the coverage report; `--check` fails if it is out of date (CI runs it through `tests/pipeline.py`). |
| `scripts/mining/fetch_open_data.py` | Pulls machine-readable open data (first source: the FTA National Transit Database reporter list) and stages every row as `review`, placed in a county by its listed location. Needs ordinary internet access. |

## Evidence levels

- `official_source_reviewed`: read on the organization's or government's own page, and the page supports the listing.
- `directory_listed`: only a directory or list page supports it (a government list, a national network's member list). The site shows these with a note.
- `official_search_extract_only` and `news_reported`: older guide records still to be re-read on the own page.

A search snippet, an AI summary, a social post or memory is a lead, never evidence. A page that would not load or
showed a bot check is not a review: it goes in `skipped.csv`, and nobody works around it through caches or mirrors.

## How to run a batch from cold

1. Pull both repositories side by side: `mobility` and `vhg-veteran-resident-guide`.
2. Sync the guide's records and see where the gaps are:
   ```
   python3 scripts/extract_local_programs.py ../vhg-veteran-resident-guide
   python3 scripts/mining/coverage.py
   ```
   Read the "Next batch" list at the end of `docs/COVERAGE.md`.
3. Research. Give each researcher (a person or an AI agent with read-only web access) one slice of the queue, for example
   "rights listings for these 20 countries" or "equipment loan programs in these 18 states", the list of what each place
   already has, and the row rules below. Each writes a JSON list to `pipeline/batches/DATE-NAME/research/`.
4. Stage, look over, publish:
   ```
   python3 scripts/mining/stage.py pipeline/batches/DATE-NAME pipeline/batches/DATE-NAME/research/*.json
   # read candidates.csv: change a decision to rejected (with a note) for anything that should not go up
   python3 scripts/mining/promote.py pipeline/batches/DATE-NAME
   python3 scripts/extract_local_programs.py ../vhg-veteran-resident-guide
   npm run build && python3 scripts/mining/coverage.py
   ```
5. Check and publish: `npm test`, `python3 tests/pipeline.py`, the Python checks in `README.md`, then commit.

Open data, on a computer with internet access: `python3 scripts/mining/fetch_open_data.py` writes
`pipeline/batches/DATE-open-data/` with every row as `review`. A reviewer reads each provider's own page, confirms it
offers rides disabled people can use, fills in the counties it serves, sets the evidence level and changes the decision
to `new`; then promote as above.

## Row rules for researchers

Every row has: `place` (USPS code or ISO country code), `family` (a registry family id), `name`, `org`, `what` (one or
two plain sentences, only what the page states), `sources` (the https pages actually read, own page first),
`reviewed_on`, `record_status`, and `evidence_note` (one line on what the page shows). US rows also have `category`,
`next_step` and `counties` (only if the page names them). Country rows have `section` and `how`, and a phone only when
the page prints it the way it is dialed inside the country. Never invent or tidy a phone, email or link. Copy what the
page shows or leave it out. Read-only work: no forms, sign-ins, accounts or messages.

## Suggested cadence

- Research batches: weekly, one or two slices from the queue at a time.
- Guide sync and coverage report: with every batch.
- Re-reading published listings: by family, on `cadence_days` in the registry (120 days for local equipment programs,
  180 for Centers for Independent Living, a year for statewide agencies and country listings).
- Open data: once a year after FTA publishes the new NTD release, on a computer with internet access.
