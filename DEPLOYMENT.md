# Production container preparation

This project keeps `prisma/schema.prisma` for local SQLite development. The container uses `prisma/schema.production.prisma` and the PostgreSQL migrations.

## Prepare and run locally

1. Copy `.env.production.example` to `.env` and set a unique PostgreSQL password, a random `NEXTAUTH_SECRET` and `SEED_SECRET` (each at least 32 characters), and the public HTTPS `NEXTAUTH_URL`.
2. Make sure the password in `DATABASE_URL` matches `POSTGRES_PASSWORD`. Keep the hostname `postgres` in that URL for the Compose network.
3. Build and start the database: `docker compose up -d --build postgres`.
4. Apply the checked-in migrations once: `docker compose run --rm migrate`.
5. On a new database only, seed the initial stock catalog once: `docker compose run --rm seed`. The seed uses upserts and resets stock prices to the seed values, so do not rerun it during normal restarts.
6. Start the app: `docker compose up -d app`.

The app is available on `http://127.0.0.1:3000` on the host machine. Port 3000 is not exposed to the public internet, and PostgreSQL is not published on a host port.

## Deployment notes

The application image runs the compiled custom Next.js and Socket.IO server as a non-root user. The database uses a persistent Docker volume. Back up the PostgreSQL volume before upgrades and take a database backup before applying migrations to an existing database. The production schema now has a migration for the `Notification` model, which was missing from the repository's existing migration history.

## Publish through the domain on EC2

The current fast-start setup runs PostgreSQL in a container on the EC2 instance. Its data stays in the named Docker volume, so back it up regularly. A managed database such as Amazon RDS is a separate option that requires additional setup.

1. Copy `.env.production.example` to `.env` on the server. Replace every placeholder, set `DOMAIN` to the real domain, and set `NEXTAUTH_URL` to `https://` followed by that domain. Keep the database password in `DATABASE_URL` identical to `POSTGRES_PASSWORD`.
2. Associate a stable Elastic IP with the EC2 instance. In GoDaddy DNS, point the root A record (`@`) to that IP. Add a `www` CNAME only if you want the `www` address too. Keep any mail records unchanged.
3. In the EC2 security group, allow SSH only from your own IP, and allow public TCP ports 80 and 443. Do not open ports 3000 or 5432 to the internet.
4. Start PostgreSQL, apply migrations, seed the stock catalog once, and start the app using the local preparation steps above.
5. While ports 80 and 443 remain closed publicly, bootstrap the admin by sending `POST /api/admin/setup` to `http://127.0.0.1:3000` from the EC2 server. Provide the configured `SEED_SECRET`, email `pavithandgrover@outlook.com`, and a new password in the request body. Keep the secret and password private.
6. After DNS points to the Elastic IP, open ports 80 and 443 and start Caddy with `docker compose --profile public up -d`. Caddy forwards web traffic to the app and manages the HTTPS certificate. The app remains reachable directly only from the EC2 host.
7. Open the HTTPS domain and verify the login, admin panel, stock API, and real-time features. Restart the app and confirm the database data remains.

The administrator must be created before opening public traffic, because the app grants admin access based on that exact email. The endpoint requires `SEED_SECRET`; the repository does not have a default setup secret.

Before exposing the app publicly, bootstrap the administrator with `POST /api/admin/setup` using the configured `SEED_SECRET` and a new password. The endpoint fails closed when `SEED_SECRET` is missing; the repository no longer supplies a default secret. Complete this from a trusted connection before opening public traffic. The admin account email is `pavithandgrover@outlook.com`.
