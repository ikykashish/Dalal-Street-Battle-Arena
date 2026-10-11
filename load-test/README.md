# Load testing

This k6 harness tests realistic app traffic and a separate same-stock trade burst. It adds no app dependency and does not change application, Prisma, migration, or Docker files.

## Safety

- `BASE_URL` is loopback-only by default (`127.0.0.1`, `localhost`, `::1`). Prefer `127.0.0.1` for local runs to avoid IPv6 ambiguity. Remote use requires HTTPS, `LOAD_TEST_ALLOW_STAGING=YES`, a hostname containing `staging`, and an exact `LOAD_TEST_STAGING_ORIGIN` match.
- `DATABASE_URL` must be PostgreSQL and its database name must contain `loadtest`. Remote DB access also requires a hostname containing `staging`, the acknowledgement above, and an exact `LOAD_TEST_STAGING_DB_HOST` match.
- Never point this tooling at production. Use a dedicated app and DB. These checks are guardrails, not permission to load test a live competition.
- Test users use `@example.invalid`, are created only by the separate local DB script, and their password manifest is ignored by Git and removed by cleanup.

## Prerequisites

Windows PowerShell, Node.js 20 (or compatible), npm, Docker Desktop, and k6 installed locally (`k6 version`). The project dependencies and Prisma Client must be available (`npm ci`, `npm run db:generate`). k6 is a small established load-testing tool with staged virtual users, checks, latency thresholds, and JSON summaries; it needs no app dependency.

## Isolated local setup

Create a dedicated PostgreSQL instance and load-test database on port 5433:

```powershell
docker run --detach --name dsba-loadtest-postgres `
  --publish 127.0.0.1:5433:5432 `
  --env POSTGRES_USER=loadtest `
  --env POSTGRES_PASSWORD=local-loadtest-only-change-me `
  --env POSTGRES_DB=dalal_street_loadtest `
  --volume dsba-loadtest-pgdata:/var/lib/postgresql/data `
  postgres:16-alpine

$env:DATABASE_URL = 'postgresql://loadtest:local-loadtest-only-change-me@127.0.0.1:5433/dalal_street_loadtest'
$env:NEXTAUTH_SECRET = 'local-only-load-test-secret-change-me'
$env:NEXTAUTH_URL = 'http://127.0.0.1:3000'
$env:BASE_URL = 'http://127.0.0.1:3000'
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Keep the app running. In a second PowerShell window set the same `DATABASE_URL` and `BASE_URL` before provisioning/verifying. The app and tooling must use this dedicated DB. The scripts can validate the database URL they use, but cannot inspect the DB connection inside an already-running app process; start the app from the explicitly configured terminal above before testing. For production-build testing, use `npm run build` and `npm run start` instead of `npm run dev`.

## Local smoke test (2–5 users)

This is a separate, short local-only path. It does not change the existing 100/150/200/300 VU scenarios. Its provisioner accepts only 2–5 users, writes only generated `@example.invalid` accounts, and refuses a missing/non-PostgreSQL/non-loopback `DATABASE_URL` or a database name without `loadtest`. The smoke scenario independently refuses a non-loopback `BASE_URL`; staging override variables cannot enable remote targets for this path. Run commands from the repository root.

The commands below create a dedicated PostgreSQL 16 container named `dsba-loadtest-smoke-postgres`, a new named volume `dsba-loadtest-smoke-pgdata`, and the database `dalal_street_loadtest`. Port 5433 is bound only to `127.0.0.1`. They do not use Compose's `dsba_postgres` container or `postgres_data` volume. The preflight stops if the named container/volume already exists or port 5433 is in use; do not remove or reuse an existing volume.

### 1. Start and verify the isolated database

```powershell
$ErrorActionPreference = 'Stop'
$container = 'dsba-loadtest-smoke-postgres'
$volume = 'dsba-loadtest-smoke-pgdata'

docker info | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker Engine is not available.' }
if (@(docker ps -a --format '{{.Names}}') -contains $container) { throw "Container $container already exists; inspect it and choose a fresh isolated name." }
if (@(docker volume ls --format '{{.Name}}') -contains $volume) { throw "Volume $volume already exists; do not reuse it for this fresh smoke run." }
if (Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue) { throw 'Local port 5433 is already in use.' }

docker run --detach --name $container `
  --publish 127.0.0.1:5433:5432 `
  --env POSTGRES_USER=loadtest `
  --env POSTGRES_PASSWORD=local-loadtest-only-change-me `
  --env POSTGRES_DB=dalal_street_loadtest `
  --mount "type=volume,source=$volume,target=/var/lib/postgresql/data" `
  --health-cmd "pg_isready -U loadtest -d dalal_street_loadtest" `
  --health-interval 5s --health-timeout 3s --health-retries 20 --health-start-period 10s `
  postgres:16-alpine
if ($LASTEXITCODE -ne 0) { throw 'Failed to start the dedicated smoke PostgreSQL container.' }

$deadline = (Get-Date).AddMinutes(2)
do {
  $health = docker inspect --format='{{.State.Health.Status}}' $container
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect the smoke database container.' }
  if ($health -eq 'healthy') { break }
  if ((Get-Date) -ge $deadline) { throw "Smoke PostgreSQL did not become healthy (status: $health)." }
  Start-Sleep -Seconds 2
} while ($true)

docker inspect --format='container={{.Name}} ports={{json .HostConfig.PortBindings}} volumes={{range .Mounts}}{{.Name}}->{{.Destination}} {{end}}' $container
docker exec $container psql -U loadtest -d dalal_street_loadtest -Atc 'SELECT current_database();'
if ($LASTEXITCODE -ne 0) { throw 'Could not verify the smoke database name.' }
```

Check that the output names `dsba-loadtest-smoke-postgres`, shows host IP `127.0.0.1` and host port `5433`, shows volume `dsba-loadtest-smoke-pgdata`, and prints `dalal_street_loadtest` before continuing.

### 2. Set the application and database target, migrate, seed, provision, and start the app

Use this in Terminal A. The explicit process-level `DATABASE_URL` is the target for both Prisma commands; the guard below fails before either command if it is not the intended loopback load-test URL. `db:seed` writes the stock catalog and seed prices to this disposable test DB, so never run it with a different URL.

```powershell
$ErrorActionPreference = 'Stop'
$env:DATABASE_URL = 'postgresql://loadtest:local-loadtest-only-change-me@127.0.0.1:5433/dalal_street_loadtest'
$env:NEXTAUTH_SECRET = 'local-smoke-only-secret-change-me-32-characters'
$env:NEXTAUTH_URL = 'http://127.0.0.1:3000'
$env:LOAD_TEST_RUN_ID = 'smoke-20261004-a'
$smokeUsers = 5
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) { throw 'Local port 3000 is already in use; identify the listener before continuing.' }

if (-not $env:DATABASE_URL) { throw 'DATABASE_URL is required.' }
$dbUrl = [System.Uri]$env:DATABASE_URL
$dbName = [System.Uri]::UnescapeDataString($dbUrl.AbsolutePath.TrimStart('/'))
if ($dbUrl.Scheme -notin @('postgres', 'postgresql')) { throw 'DATABASE_URL must use PostgreSQL.' }
if ($dbUrl.Host -notin @('127.0.0.1', 'localhost', '::1')) { throw 'DATABASE_URL host must be loopback.' }
if ($dbName -notmatch 'load[-_]?test') { throw 'DATABASE_URL database name must contain loadtest.' }
if ($dbUrl.Host -ne '127.0.0.1' -or $dbUrl.Port -ne 5433 -or $dbName -ne 'dalal_street_loadtest') { throw 'DATABASE_URL does not match the dedicated smoke database.' }

npm run db:migrate:deploy
if ($LASTEXITCODE -ne 0) { throw 'Prisma migrations failed.' }
npm run db:seed
if ($LASTEXITCODE -ne 0) { throw 'Local smoke stock seeding failed.' }
node .\load-test\scripts\provision-smoke.mjs --count $smokeUsers
if ($LASTEXITCODE -ne 0) { throw 'Smoke fake-user provisioning failed.' }
npm run dev
```

Keep Terminal A running. Set `$smokeUsers` to the same integer from 2 through 5 in both terminals. The provisioner rejects counts outside that range. Use a fresh `smoke-...` run ID if repeating; the run ID namespaces the fake accounts, team, and ignored credential manifest.

### 3. Run the tiny k6 test and verify the ledger

In Terminal B, from the repository root, set the exact same local database URL, run ID, and `$smokeUsers` value. The k6 test starts that many independent VUs together; each authenticates as its own fake user, loads the four app pages and their core data APIs, then submits one BUY and one SELL against ITC. The BUY requests exercise concurrent trades against the same stock.

```powershell
$ErrorActionPreference = 'Stop'
$env:DATABASE_URL = 'postgresql://loadtest:local-loadtest-only-change-me@127.0.0.1:5433/dalal_street_loadtest'
$env:BASE_URL = 'http://127.0.0.1:3000'
$env:LOAD_TEST_RUN_ID = 'smoke-20261004-a'
$smokeUsers = 5
$env:EXPECTED_TRADE_SUCCESSES = [string](2 * $smokeUsers)
New-Item -ItemType Directory -Force .\load-test\results | Out-Null

k6 run `
  -e "BASE_URL=$env:BASE_URL" `
  -e "RUN_ID=$env:LOAD_TEST_RUN_ID" `
  -e "VUS=$smokeUsers" `
  --summary-export .\load-test\results\smoke-20261004-a.json `
  .\load-test\scenarios\local-smoke.js
if ($LASTEXITCODE -ne 0) { throw 'The local smoke scenario failed; inspect its summary before proceeding.' }

node .\load-test\scripts\verify-integrity.mjs
if ($LASTEXITCODE -ne 0) { throw 'Smoke database trade/balance integrity verification failed.' }
```

The integrity checker must report `"integrity": "PASS"`; with all configured users completing both trades, the stored trade count must equal two times `$smokeUsers`. The smoke scenario's origin guard and the provisioner/verifier database guard remain active even if staging environment variables are set.

### 4. Remove only the smoke-test records (optional)

In Terminal B, after reviewing the integrity result, cleanup deletes only this run's `loadtest-smoke-20261004-a-*@example.invalid` users, its generated team, and its credential manifest. It requires the same loopback load-test database URL and matching smoke run ID.

```powershell
node .\load-test\scripts\cleanup.mjs
if ($LASTEXITCODE -ne 0) { throw 'Smoke data cleanup failed.' }
```

To discard the entire disposable smoke database after confirming the exact names and volume shown by `docker inspect`, and only if this smoke workflow created them:

```powershell
docker stop dsba-loadtest-smoke-postgres
docker rm dsba-loadtest-smoke-postgres
docker volume rm dsba-loadtest-smoke-pgdata
```

Removing that named volume permanently deletes the smoke DB contents. Do not substitute Compose or any existing project container/volume name.

## Fake users

Use a fresh run ID per independent run. Generated users each have ₹10,00,000 and a one-stock watchlist; about 90% start in generated teams and the rest can exercise the team-join route. The local DB must be migrated and seeded first.

```powershell
$env:LOAD_TEST_RUN_ID = 'normal-100'
node .\load-test\scripts\provision.mjs --count 100
```

Allowed counts are 100, 150, 200, and 300. Credentials are written to ignored `load-test/data/<run-id>.json`; the scripts never call `/api/seed` or `/api/admin/setup`.

## Sustained scenarios

The default workload ramps up for two minutes, holds the requested VU level for ten minutes, and ramps down for one minute. `HOLD_DURATION` can be overridden, e.g. `-e HOLD_DURATION=20m`. Run in order and review results before each increase. Create the ignored output directory:

```powershell
New-Item -ItemType Directory -Force .\load-test\results | Out-Null
```

Each run should have a new ID and matching fake-user count:

```powershell
$env:LOAD_TEST_RUN_ID = 'normal-100'
node .\load-test\scripts\provision.mjs --count 100
k6 run -e BASE_URL=$env:BASE_URL -e RUN_ID=$env:LOAD_TEST_RUN_ID -e VUS=100 --summary-export .\load-test\results\normal-100.json .\load-test\scenarios\competition.js
node .\load-test\scripts\verify-integrity.mjs
node .\load-test\scripts\cleanup.mjs
```

```powershell
$env:LOAD_TEST_RUN_ID = 'normal-150'
node .\load-test\scripts\provision.mjs --count 150
k6 run -e BASE_URL=$env:BASE_URL -e RUN_ID=$env:LOAD_TEST_RUN_ID -e VUS=150 --summary-export .\load-test\results\normal-150.json .\load-test\scenarios\competition.js
node .\load-test\scripts\verify-integrity.mjs
node .\load-test\scripts\cleanup.mjs
```

```powershell
$env:LOAD_TEST_RUN_ID = 'normal-200'
node .\load-test\scripts\provision.mjs --count 200
k6 run -e BASE_URL=$env:BASE_URL -e RUN_ID=$env:LOAD_TEST_RUN_ID -e VUS=200 --summary-export .\load-test\results\normal-200.json .\load-test\scenarios\competition.js
node .\load-test\scripts\verify-integrity.mjs
node .\load-test\scripts\cleanup.mjs
```

```powershell
$env:LOAD_TEST_RUN_ID = 'normal-300'
node .\load-test\scripts\provision.mjs --count 300
k6 run -e BASE_URL=$env:BASE_URL -e RUN_ID=$env:LOAD_TEST_RUN_ID -e VUS=300 --summary-export .\load-test\results\normal-300.json .\load-test\scenarios\competition.js
node .\load-test\scripts\verify-integrity.mjs
node .\load-test\scripts\cleanup.mjs
```

The 300-user run is manual and should only happen after reviewing lower-level results and confirming the isolated target.

## Trade burst

Use a fresh run ID and matching user count. Each VU authenticates, waits ten seconds for sessions to establish, BUYs one share of the same stock, then SELLs it. This is a short single burst, not continuous trading. `ITC` is the default seeded symbol.

```powershell
$env:LOAD_TEST_RUN_ID = 'burst-300'
node .\load-test\scripts\provision.mjs --count 300
k6 run -e BASE_URL=$env:BASE_URL -e RUN_ID=$env:LOAD_TEST_RUN_ID -e VUS=300 --summary-export .\load-test\results\burst-300.json .\load-test\scenarios\trade-burst.js
node .\load-test\scripts\verify-integrity.mjs
node .\load-test\scripts\cleanup.mjs
```

For a smaller burst, set both count and VUS to 100, 150, or 200. Choose another seeded symbol using `-e BURST_STOCK_SYMBOL=...`.

## Modeled flows and traffic

The workload uses NextAuth’s real CSRF token, credentials callback, and per-VU cookie session. It exercises login and `/api/user`; stock list/search/detail; portfolio and recent-trades reads; individual/team leaderboard; watchlist and team info/join; notifications; and occasional authenticated trades. VUs switch among dashboard, market, portfolio, leaderboard, teams, and watchlist pages. Portfolio polling approximates the existing 8–10 second UI intervals; leaderboard polling is about every 15–20 seconds while that page is selected; notifications are polled about every 30 seconds. Most iterations do not trade (5% chance, alternating one-share BUY/SELL). Registration is setup-only; no login or registration flood is included. Client-side price animation generates no API traffic. The dashboard ActivityFeed has polling disabled by default, so no extra trade-list polling is invented.

## Metrics and integrity

k6 reports request rate (`http_reqs`), average/median (p50)/p90/p95/p99 latency, failed request rate, checks, HTTP 4xx/5xx, transport failures, and trade successes/failures. Initial sustained thresholds are p95 < 1.5s and p99 < 3s; burst allows greater lock contention. Thresholds are signals for review, not a readiness certificate.

`verify-integrity.mjs` checks only the generated email namespace: nonnegative cash, cash equal to initial virtual capital adjusted by recorded BUY/SELL totals, final holdings equal to net trade quantities, valid positive trade prices and stock prices, and trade total equal to price × quantity within one paisa. For a fresh run ID, compare its trade-row count to k6 `trade_successes`; to make the verifier enforce that count, set `EXPECTED_TRADE_SUCCESSES` to the counter value from the exported k6 summary before running it. This detects partial balance/holding effects and ledger mismatches; it is not a production accounting certification.

While running, capture the k6 JSON summary, app logs, app CPU/memory (Windows Task Manager/Resource Monitor for the host-run app), DB CPU/memory, connections, and active/slow queries:

```powershell
docker stats dsba-loadtest-postgres
docker exec dsba-loadtest-postgres psql -U loadtest -d dalal_street_loadtest -c "SELECT state, count(*) FROM pg_stat_activity WHERE datname = current_database() GROUP BY state ORDER BY state;"
docker exec dsba-loadtest-postgres psql -U loadtest -d dalal_street_loadtest -c "SELECT pid, state, wait_event_type, now() - query_start AS age, left(query, 160) AS query FROM pg_stat_activity WHERE datname = current_database() AND state <> 'idle' ORDER BY query_start;"
```

Investigate latency degradation, errors, DB saturation/connection exhaustion, and integrity failures. Successful HTTP statuses alone are insufficient. This harness does not enable `pg_stat_statements`.

## Staging (optional)

Prefer local. Use a dedicated staging app and a dedicated PostgreSQL database whose name contains `loadtest`. Example:

```powershell
$env:LOAD_TEST_ALLOW_STAGING = 'YES'
$env:LOAD_TEST_STAGING_ORIGIN = 'https://dsba-staging.example.edu'
$env:LOAD_TEST_STAGING_DB_HOST = 'dsba-staging-db.example.edu'
$env:BASE_URL = $env:LOAD_TEST_STAGING_ORIGIN
# DATABASE_URL must use that exact DB host and a loadtest-named database.
```

Pass the app acknowledgement/origin to k6 with `-e LOAD_TEST_ALLOW_STAGING=YES -e LOAD_TEST_STAGING_ORIGIN=$env:LOAD_TEST_STAGING_ORIGIN`. Never use production URLs or credentials.

## Cleanup

With the same run ID and dedicated test `DATABASE_URL`:

```powershell
node .\load-test\scripts\cleanup.mjs
```

Cleanup deletes only that run’s fake users, generated teams, and credential manifest; related trades, holdings, watchlist entries, and notifications follow existing user cascades. To remove the local test database, first verify the names, then remove only its dedicated container and volume:

```powershell
docker stop dsba-loadtest-postgres
docker rm dsba-loadtest-postgres
docker volume rm dsba-loadtest-pgdata
```
