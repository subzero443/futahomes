# FUTA Homes — Local Full-Stack Reconstruction

A **new, editable local recreation** of the FUTA Homes platform based on the supplied screenshots and feature decisions. This is not a recovered copy of previously written source code. The project folder is named **`FUTA Homes`**, and the MariaDB database is **`futa_homes`**.

## Stack

- **Frontend:** React 18, TypeScript, Vite, React Router, Lucide icons, **Tailwind CSS v4** (Vite integration, CSS-first theme, reusable `@apply` components) with a clean **white and orange** UI across phones, tablets, laptops and desktops.
- **Backend:** PHP 8.1+ REST-style JSON API, PDO, PHP sessions, CSRF protection.
- **Database:** MariaDB 10.2.1+ using `database/futa_homes.sql` and PHP's PDO_MYSQL driver.
- **Development:** XAMPP (Apache/PHP/MariaDB), Node.js, VS Code.
- **PWA:** Included manifest, icon and minimal production service worker (app shell only; no offline private API data).
- **Not used:** Gmail SMTP or signup email verification. Sign up / sign in use **email and password only**.

## Tailwind CSS v4 and responsive UI

The frontend now uses **Tailwind CSS v4** rather than the previous handcrafted stylesheet. `@tailwindcss/vite` is configured inside `frontend/vite.config.ts`. The source imports `frontend/src/style.css`, which starts with `@import "tailwindcss";`. That file defines FUTA Homes brand colours via `@theme` and shared component recipes via Tailwind `@apply`. All screen layouts use Tailwind's mobile-first responsive utilities and variants.

Responsive behavior includes: **small phones (320px+), larger phones, tablets, laptops, widescreen desktops**; a sticky translucent header; a phone-only fixed bottom navigation; tablet-friendly listing grids; compact listing rows on phones; flexible detail and gallery layouts; horizontally scrollable admin/agent sidebar tabs; responsive charts and stat cards; and overflow-safe tables. Focus indicators and reduced-motion settings are included.

**Customize the appearance** in `frontend/src/style.css` under `@theme`: `--color-futa`, `--color-futa-dark`, `--color-ink`, and `--color-canvas`. Component styles reside in the `@layer components` section. Any newly added JSX can use Tailwind utilities directly, e.g. `className="rounded-2xl bg-white p-5 shadow-card sm:p-7"`.

There is no `tailwind.config.js` or `postcss.config.js`: Tailwind v4 with its Vite plugin does not require either file. **Run `npm install` again after updating** so the two Tailwind dependencies install. The old CSS has been replaced, not layered on top of the new one.

## Frontend source layout

All React pages and reusable components live directly in `frontend/src`—there are no separate `pages` or `components` subfolders. Authentication routes show only the centered sign-in or registration form; the site header, footer, and mobile navigation remain on the other routes.

The blurred authentication background uses a photo of 41–42 Cloth Fair in London by No Swan So Fine, from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:41_and_42_Cloth_Fair,_Farringdon,_April_2023.jpg), licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The image is stored locally at `frontend/public/demo/london-house-auth.jpg`.

## MariaDB setup

The site uses the MariaDB service installed on this PC at `C:\Program Files\MariaDB 13.0`, port `3307`. `backend/config.php` is a loader; private connection values are stored in the ignored `backend/config.local.php`.

To create the database and tables, open Command Prompt or the XAMPP Shell and import `database/futa_homes.sql`:

```text
"C:\Program Files\MariaDB 13.0\bin\mariadb.exe" -h 127.0.0.1 -P 3307 -u root -p < "C:\xampp\htdocs\FUTA Homes\database\futa_homes.sql"
```

Enter the MariaDB password when prompted. Adjust the executable path, host, port, and username if your setup differs. The script creates `futa_homes` if needed and does not drop existing tables. Enable PHP's `pdo_mysql` extension for Apache and restart Apache if you change the PHP configuration.

### Create the restricted application account

The website must not connect as MariaDB `root`. After importing the schema, create the dedicated `futa_homes_app` account:

1. Copy `backend/config.admin.example.php` to `backend/config.admin.local.php`. Fill in the local MariaDB administrator username/password and port; keep the file private and do not commit it.
2. Run the CLI provisioner in PowerShell:

   ```powershell
   & "C:\xampp\php\php.exe" "C:\xampp\htdocs\FUTA Homes\backend\provision-app-user.php"
   ```

3. On a new setup, the script creates `futa_homes_app`@`127.0.0.1` with only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `futa_homes`, then writes the generated password to ignored `backend/config.local.php`. It will not overwrite an existing app account. If `config.local.php` already exists, rerunning the same command safely checks the existing database connection and required tables without changing credentials or database users.
4. Delete `backend/config.admin.local.php` after successful provisioning. Keep `config.local.php` private; never publish its contents or commit it. The web server denies direct HTTP access to local PHP config files.

There is no separate application `config.example.php`: the provisioner creates `config.local.php` for this PC, and `config.admin.example.php` is the template for setting up another local installation.

Use the administrator account only for schema imports and database administration. The website and its integration test use the restricted application account. HeidiSQL or DBeaver can also use that account for browsing; use an administrator account only when you need operations beyond its grants.

On this MariaDB installation, `SHOW GRANTS` also reports inherited `PUBLIC` permissions on the separate `test` and `test_%` schemas. These do not grant access to `futa_homes`, but they may allow every database account to modify those test schemas. If no local user needs that access, an administrator can revoke it server-wide:

```sql
REVOKE ALL PRIVILEGES ON `test`.* FROM PUBLIC;
REVOKE ALL PRIVILEGES ON `test_%`.* FROM PUBLIC;
```

This affects all MariaDB accounts, not just the FUTA Homes app user; verify the test schemas are unused before applying it.

For this local-only application, `C:\Program Files\MariaDB 13.0\data\my.ini` now specifies `bind-address=127.0.0.1`. Restart the MariaDB Windows service as an administrator for the change to take effect, then confirm port `3307` listens only on `127.0.0.1`. HeidiSQL and DBeaver on this PC should connect using that TCP/IP host and port; do not expose the database port to the internet.

## Viewing registered accounts in MariaDB

The application stores user and agent accounts in the `users` table. Admin accounts also use this table and have `role='admin'`.

### Command line

In PowerShell, connect to the configured MariaDB server:

```powershell
& "C:\Program Files\MariaDB 13.0\bin\mariadb.exe" -h 127.0.0.1 -P 3307 -u root -p futa_homes
```

Enter the MariaDB database password when prompted, then list accounts:

```sql
SELECT id, name, email, role, created_at
FROM users
ORDER BY id DESC;
```

### DBeaver

Create or open a MariaDB connection using host `127.0.0.1`, port `3307`, database `futa_homes`, and username `futa_homes_app`. Its password is in the private `backend/config.local.php`; do not share or paste that file. Open a SQL Editor for `futa_homes` and run either query above. You can also expand **futa_homes → Tables → users**, right-click `users`, and choose **View Data**.

### HeidiSQL

1. Open HeidiSQL and create a **New** session.
2. Set **Network type** to **MariaDB or MySQL (TCP/IP)**, **Hostname / IP** to `127.0.0.1`, **User** to `futa_homes_app`, **Password** to the private app password in `backend/config.local.php`, and **Port** to `3307`. An administrator account may be used for schema changes, but should not be used by the website.
3. Click **Open**. In the left database tree, expand `futa_homes` and then **Tables**. Double-click a table such as `users` to browse its rows.
4. To run SQL, open a query tab, select `futa_homes` in the database tree, enter a query, and press **F9** (or click **Run**). You can also select the database in a query with `USE futa_homes;`.

To view account details, run:

```sql
SELECT id, name, email, role, created_at
FROM futa_homes.users
ORDER BY id DESC;
```

Agents have a related row in `agent_profiles`. To view the account together with its agent profile:

```sql
SELECT u.id, u.name, u.email, u.role,
       ap.business_name, ap.verification_status, ap.plan, ap.plan_expires_at
FROM futa_homes.users AS u
LEFT JOIN futa_homes.agent_profiles AS ap ON ap.user_id = u.id
WHERE u.role = 'agent'
ORDER BY u.id DESC;
```

To view agent payments with the agent's account details:

```sql
SELECT p.id, p.reference, p.plan, p.amount_kobo, p.provider,
       p.status, p.paid_at, p.created_at,
       u.name AS agent_name, u.email AS agent_email
FROM futa_homes.payments AS p
JOIN futa_homes.users AS u ON u.id = p.agent_id
ORDER BY p.id DESC;
```

To see all tables in this database, run:

```sql
SHOW TABLES FROM futa_homes;
```

The current schema includes `users`, `agent_profiles`, `properties`, `property_media`, `favorites`, `bookings`, `enquiries`, `agent_reviews`, `property_views`, `payments`, `support_tickets`, `notifications`, `conversations`, `direct_messages`, `property_questions`, and `property_reviews`. There is no `payment_verifications` table in the current schema; payment records are stored in `payments`. To inspect another table, double-click it in HeidiSQL or run (replace the table name with one from the list):

```sql
SELECT *
FROM futa_homes.properties
LIMIT 100;
```

Use `LIMIT` when browsing large tables. Some tables contain private user, payment, or agent-verification data; avoid sharing query results or screenshots containing personal information.

**Passwords cannot be viewed in plain text.** `password_hash` is a one-way hash, not the password. Do not expose or share password hashes; reset a user's password through the app instead.

## Safely stop and restart local services

DBeaver is a database client, not the database server. Its connection can normally stay open while you develop; disconnecting it is optional and does not stop MariaDB or cause database errors.

To shut down cleanly:

1. In the terminal running Vite (`npm run dev`), press **Ctrl+C**.
2. In DBeaver, right-click the MariaDB connection and choose **Disconnect** if you want to close the client connection.
3. Stop **Apache** from the XAMPP Control Panel.
4. Stop MariaDB using the same method you used to start it. On this PC, MariaDB is installed as a Windows service on port `3307`; stop that service from the Windows **Services** app. If you started a database module directly from XAMPP instead, click its **Stop** button in XAMPP.

To start again, start MariaDB and Apache, reconnect DBeaver only if needed, then run `npm run dev` from the `frontend` directory. Leave the database files and data directory in place; do not force-terminate the server process. If a database connection error remains, confirm the MariaDB service is running and that the private `backend/config.local.php` uses its active host and port. You do not need to stop the services between development sessions.

## Run the MariaDB integration test

After creating the schema and provisioning the restricted app account as described above, run this in PowerShell:

```powershell
& "C:\xampp\php\php.exe" -d extension=pdo_mysql "C:\xampp\htdocs\FUTA Homes\backend\database-test.php"
```

The test checks the PDO connection, required tables, inserts and joins, case-insensitive listing search, aggregates, date arithmetic and boolean handling. It rolls back its test records when complete. The `-d extension=pdo_mysql` option enables the bundled driver for this test process; Apache still needs `pdo_mysql` enabled in `php.ini`.

## Local installation: Windows + XAMPP

1. Extract this ZIP and copy the **whole `FUTA Homes` directory** into:

   ```text
   C:\xampp\htdocs\FUTA Homes
   ```

2. Start the installed MariaDB Windows service and **Apache** in **XAMPP Control Panel**. On this PC, MariaDB is installed under `C:\Program Files\MariaDB 13.0` and uses port `3307`. Make sure `pdo_mysql` is enabled in the PHP `php.ini` used by Apache, then restart Apache if you changed it.

3. Import `database/futa_homes.sql` using the command in the **MariaDB setup** section. The script creates the `futa_homes` database if it does not exist and does not drop existing databases or tables.

4. Follow **Create the restricted application account** above. The provisioner writes `backend/config.local.php`; do not put administrator credentials in `backend/config.php` or the frontend.

5. Optional but recommended: **create a demo admin, agent, user and 4 sample listings**. From VS Code terminal (PowerShell):

   ```powershell
   & "C:\xampp\php\php.exe" "C:\xampp\htdocs\FUTA Homes\backend\seed.php"
   ```
  The seeder prints random passwords for accounts it creates. Save those passwords securely; existing accounts are not overwritten. Demo photos and listings are examples for UI testing, not verified rental properties.

6. In VS Code open folder `C:\xampp\htdocs\FUTA Homes`, then open a new terminal:

   ```powershell
   cd "C:\xampp\htdocs\FUTA Homes\frontend"
   npm install
   npm run dev
   ```

7. Visit the website: **`http://127.0.0.1:5173`**.

   - **User sign-in:** `http://127.0.0.1:5173/auth-loginfutahomes?/user/login`
   - **Agent sign-in:** `http://127.0.0.1:5173/auth-loginfutahomes?/agent/login`
   - **Admin sign-in/dashboard:** `http://127.0.0.1:5173/auth-loginfutahomes?/admin` (requires an admin account)

   User, agent, and admin sessions use separate role-specific cookies, so separate tabs can stay signed in to one account of each role at the same time. Each tab remembers its selected role context. This does not allow multiple simultaneous accounts of the same role in separate tabs. Use **`127.0.0.1:5173`** consistently, rather than switching to `localhost:5173`, so the local sessions remain predictable. The Vite dev server automatically forwards `/api` and `/media` to Apache. Keep XAMPP running.

## Local navigation URLs

These are local development URLs. Replace `http://127.0.0.1:5173` with your deployed domain after deployment; no public FUTA Homes domain is configured by this project.

| Page | URL |
| --- | --- |
| Home | `http://127.0.0.1:5173/` |
| Explore homes | `http://127.0.0.1:5173/explore` |
| Property details | `http://127.0.0.1:5173/properties/{property-id}` |
| User sign-in | `http://127.0.0.1:5173/auth-loginfutahomes?/user/login` |
| User registration | `http://127.0.0.1:5173/auth-loginfutahomes?/user/register` |
| User profile | `http://127.0.0.1:5173/user/profile?futahomes/account` |
| Agent sign-in | `http://127.0.0.1:5173/auth-loginfutahomes?/agent/login` |
| Agent registration | `http://127.0.0.1:5173/auth-loginfutahomes?/agent/register` |
| Agent overview | `http://127.0.0.1:5173/agent/profile?section=overview` |
| Agent add listing | `http://127.0.0.1:5173/agent/profile?section=add` |
| Agent listings | `http://127.0.0.1:5173/agent/profile?section=listings` |
| Agent verification | `http://127.0.0.1:5173/agent/profile?section=verification` |
| Agent subscriptions | `http://127.0.0.1:5173/agent/profile?section=subscriptions` |
| Agent analytics | `http://127.0.0.1:5173/agent/profile?section=analytics` |
| Agent tools | `http://127.0.0.1:5173/agent/profile?section=tools` |
| Agent bookings | `http://127.0.0.1:5173/agent/profile?section=bookings` |
| Agent enquiries | `http://127.0.0.1:5173/agent/profile?section=enquiries` |
| Agent profile | `http://127.0.0.1:5173/agent/profile?section=profile` |
| Admin dashboard | `http://127.0.0.1:5173/auth-loginfutahomes?/admin` |
| Admin users | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/users` |
| Admin agents | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/agents` |
| Admin verification | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/verification` |
| Admin payments | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/payments` |
| Admin properties | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/properties` |
| Admin bookings | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/bookings` |
| Admin reviews | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/reviews` |
| Admin enquiries | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/enquiries` |
| Admin support | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/support` |
| Admin reports | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/reports` |
| User saved properties | `http://127.0.0.1:5173/user/saved` |
| Admin profile | `http://127.0.0.1:5173/auth-loginfutahomes?/admin/profileacc` |
| Session API (via Vite proxy) | `http://127.0.0.1:5173/api?route=session` |

Admin credentials are never stored in this README or application source. The requested admin account was provisioned only in this machine's local database; it is not included in the repository. The optional CLI demo seeder generates a password for new demo accounts and prints it only during setup.

## Included features

| Area | Implemented |
| --- | --- |
| Accounts | Role-based registration (**User** or **Agent**), sign-in, sign-out, profile editing, change password; CLI-provisioned **Admin** |
| User | Search/filter rent and sale listings, browse property details and media, save/favourite listings, manage a saved-properties page with direct WhatsApp agent links, in-app direct chat with listing agents, viewing inspection requests, booking statuses, WhatsApp enquiries with **FH-ENQ** reference, student community Q&A, and property living reviews (water, power, security) |
| Agent | Responsive dashboard with overview KPIs; direct messages and inquiry chat center; listing create/edit/delete; rent and separate total package; up to 12 photos/videos per property; admin moderation status; answering student Q&A; viewing requests; enquiries/lead status; verification upload and status; active plan and expiry; payment history; optional Pro analytics; Premium JSON bulk imports. Admin verification approval is required before creating or bulk-importing listings |
| Community & Feedback | Public student Q&A on property pages with agent replies; property-specific ratings & reviews with campus living scores (Borehole water constancy, Prepaid power stability, Gated compound security) |
| Admin (`/auth-loginfutahomes?/admin`) | Overview stats, user directory table with contact details, suspend/restore accounts, permanently remove non-admin accounts with confirmation, moderate listings, verify/reject agents and inspect private documents, view bookings and enquiries, grant/revoke local plans, view payments, approve/reject reviews, respond to support tickets, export monthly growth, user account, and payment reports as CSV/PDF |
| Plans | Free **₦0 / 3 active listings**, Pro **₦10,000/month / 100 listings**, Premium **₦15,000/month / 250 listings**. Verified status is distinct from paid plan badges; listings still require admin moderation |
| Payments | Optional Paystack initialize / server-side verify / signed webhook; test secret lives on PHP backend only. Admin can provision test/demo plans without charging money |
| Support | In-app support tickets and in-app admin replies; in-app notifications; **no SMTP** required |
| Other | Responsive mobile bottom navigation, top-of-page action notifications, separate admin URL, uploads/media, SQL indexes, role guards, password hashing, CSRF, private verification docs, login/PIN attempt limits |

## Project files

```text
FUTA Homes/
├── README.md
├── .gitignore
├── examples/
│   └── premium-import.json     # Example Premium bulk listing file
├── database/
│   └── futa_homes.sql          # Creates MariaDB tables in futa_homes
├── backend/
│   ├── api.php                 # All JSON API routes / access controls
│   ├── config.admin.example.php # Temporary administrator setup template
│   ├── config.php             # Loads ignored config.local.php
│   ├── provision-app-user.php # One-time least-privilege app account setup
│   ├── seed.php               # CLI demo accounts + four listings
│   ├── database-test.php      # MariaDB integration smoke test
│   ├── uploads/               # Approved MIME file uploads (public)
│   └── private/               # Agent verification documents (HTTP denied)
└── frontend/
    ├── package.json
    ├── vite.config.ts          # Tailwind Vite plugin + /api and /media proxy
    ├── tsconfig.json
    ├── index.html
    ├── public/demo/           # Screenshot-derived demonstration images
    ├── public/manifest.webmanifest
    ├── public/app-icon.svg
    ├── public/sw.js           # Production app-shell offline fallback
    └── src/
        ├── App.tsx            # Pages, layouts, User/Agent/Admin dashboards
        ├── api.ts             # Fetch client + CSRF + formatting
        ├── main.tsx
        ├── types.ts
        └── style.css          # Tailwind v4 design tokens, @apply components + breakpoints
```

## Upload size troubleshooting

If large images or videos fail to upload, edit `C:\xampp\php\php.ini` and set:

```ini
upload_max_filesize = 32M
post_max_size = 40M
max_file_uploads = 20
```

Restart **Apache** in XAMPP after saving. The API still enforces its own limits (8 MB/image, 30 MB/video, 5 MB/verification document).

## Creating accounts

- Anyone may sign up as **User** (students, employees, families and other house seekers) or **Agent** (landlords/agency representatives).
- Admin accounts **cannot** be created through public registration. Create the demo admin using `seed.php`, then change its password under Profile.
- The app requires only an email and password at login. There are **no verification links or email OTPs**.
- An optional four-digit recovery PIN can be set in Profile **after signing in with a password**. Because a four-digit PIN is low entropy, it has account-based failure limits and is a **local-demo feature**, not a sufficient production password-reset system.

## Typical demo walkthrough

1. Sign in as **Agent** → **My listings** → **Add property** → Save → upload photos/video.
2. Sign in as **Admin** at `/auth-loginfutahomes?/admin` → **Listings** → approve the property. The approval is required whether the agent is Free, Pro or Premium.
3. Sign in as **User** → **Explore** → choose the property → add to favorites, request a viewing, or generate a WhatsApp lead reference.
4. Sign in as **Agent** → **Bookings** → confirm the request; **Enquiries** → track leads.
5. Sign in as **Admin** → **Agents** → approve an uploaded verification document, or set an optional demo Pro/Premium plan. Admin → **Reviews** and **Support** moderate the other workflows.

## Paystack: optional

In the private, ignored `backend/config.local.php`, set your **Paystack test** secret to enable checkout:

```php
'paystack_secret' => 'sk_test_YOUR_SECRET_HERE',
```

Never place this secret in frontend code or GitHub. Pro is **₦10,000** (1,000,000 kobo), Premium **₦15,000** (1,500,000 kobo). The server verifies the payment amount, currency, reference, and customer email before activating a subscription. Localhost cannot receive public webhooks: **the frontend payment-return page calls server-side Paystack verification**. Real webhooks require a public HTTPS endpoint, configured separately.

Admin-granted memberships are **demo grants**, not real payments, and their transaction records are labelled `provider=admin` and `amount_kobo=0`.

## API routes

`frontend/src/api.ts` sends requests to `/api?route=...` with session cookies and a CSRF header on writes.

- Session/auth: `session`, `register`, `login`, `logout`, `profile/update`, `profile/password`, `profile/pin`, `recovery/reset`
- Properties: `properties/list`, `properties/get`, `properties/view`, `properties/my`, `properties/save`, `properties/media`, `properties/media/list`, `properties/media/delete`, `properties/delete`
- Direct Chat & Inquiries: `conversations/list`, `conversations/start`, `conversations/messages`, `conversations/send`
- Community Q&A & Reviews: `properties/qa/list`, `properties/qa/ask`, `properties/qa/answer`, `properties/reviews/list`, `properties/reviews/create`
- User: `favorites/list`, `favorites/toggle`, `bookings/create`, `bookings/my`, `bookings/status`, `reviews/list`, `reviews/create`, `enquiries/create`
- Agent: `agent/overview`, `agent/verification` (GET status / POST document), `agent/analytics`, `agent/payments`, `agent/bulk`, `bookings/agent`, `enquiries/agent`, `enquiries/status`
- Admin: `admin/overview`, `admin/users`, `admin/users/status`, `admin/users/delete` (permanently deletes a non-admin account and cascading related records), `admin/properties`, `admin/properties/status`, `admin/agents`, `admin/agents/document`, `admin/agents/status`, `admin/plan/grant`, `admin/payments`, `admin/payment/recheck`, `admin/bookings`, `admin/enquiries`, `admin/reviews`, `admin/reviews/status`, `admin/support`, `admin/support/reply`
- Payments/support: `paystack/init`, `paystack/verify`, `paystack/webhook`, `support/create`, `support/my`, `notifications`, `notifications/read`

## Important limitations before a public launch

This is a **local-development reconstruction**. PHP syntax checks, the MariaDB integration test (including rollback), and the frontend production build have passed on this PC. Before public launch, add independent security assessment, automated API/browser testing, persistent login rate limiting, strong verified password recovery, stronger document protection, full upload scanning, public Paystack webhook configuration, moderation abuse reports, HTTPS/session hardening, privacy notices and lawful data handling. Demo property photos are screenshot crops; replace them with genuine permitted images before going live.

**About role URLs and sessions:** User and Agent sign-in use `/auth-loginfutahomes?/user/login` and `/auth-loginfutahomes?/agent/login`; the Admin dashboard uses `/auth-loginfutahomes?/admin`. These are on the same local React dev origin. Role-specific session cookies let one User, one Agent, and one Admin remain signed in concurrently in separate tabs. The URLs and cookie names are not security boundaries: the backend still checks account roles and permissions on every protected API. This is not an independent server/second hostname. Deploying `admin.example.com` later would require a separate host configuration.












PROJECT: FUTA HOMES
FEATURE: VERIFIED AGENT MONTHLY BUSINESS PROMOTION SYSTEM

You are a senior full-stack software engineer working
on my existing FUTA Homes real estate platform.

EXISTING TECHNOLOGY STACK:

Frontend:
- React
- TypeScript
- JavaScript
- HTML/CSS

Backend:
- PHP
- REST APIs

Database:
- MariaDB
- SQL
- HeidiSQL for database management

Development environment:
- Windows
- VS Code
- XAMPP

IMPORTANT:
Inspect my existing project structure, authentication
system, database schema, agent dashboard, admin
dashboard, and payment integration before modifying code.

Do not rebuild my application from scratch.
Do not change my existing technology stack.
Preserve all existing features and user data.

OBJECTIVE:

Implement a complete monthly recurring business
promotion subscription system for verified agents.

FEATURE 1: VERIFICATION INTEGRATION

When an agent registers, their verification
status should initially be pending.

An admin must review and approve the agent's
verification documents.

Only verified agents can subscribe to
business promotions.

Unverified agents must not access the
promotion payment feature.

Reuse the existing verification workflow.

FEATURE 2: PROMOTION POPUP

After an agent's verification is approved,
display a professional promotional popup
inside their dashboard.

Popup heading:

"Grow Your Agency Business on FUTA Homes"

Description:

"Promote your business to potential tenants
and property seekers searching for accommodation."

Display the following benefits:

- Featured Agent Placement
- Business Advertisement
- Increased Profile Visibility
- Business Profile Promotion

Include:

Monthly subscription price: ₦20,000
Billing cycle: Monthly
Automatic renewal disclosure
Cancellation information

Buttons:

"Promote My Business"
"Maybe Later"

Show the introductory popup only once
after verification.

If dismissed, keep a promotion option
available in the agent dashboard.

Do not show promotional offers to agents
who already have an active subscription.

FEATURE 3: PAYSTACK RECURRING SUBSCRIPTION

Integrate Paystack recurring subscriptions.

Reuse my existing Paystack integration
where possible.

Create or configure a monthly Paystack
subscription plan.

Use the official Paystack Subscription API.

The monthly price must be configurable
from a secure backend configuration.

Never expose Paystack secret keys.

Implement:

- Subscription checkout
- Payment verification
- Recurring billing
- Payment history
- Subscription status tracking
- Renewal date display
- Subscription cancellation
- Failed payment handling

Use secure Paystack webhooks to synchronize
subscription statuses.

Verify webhook signatures using Paystack's
current official documentation.

Never activate promotions based solely
on frontend payment callbacks.

Prevent duplicate subscriptions and
duplicate payment processing.

FEATURE 4: DATABASE INTEGRATION

Inspect my existing MariaDB schema.

Create migrations for any missing tables.

Suggested tables:

agent_promotion_plans

agent_promotion_subscriptions

agent_business_promotions

promotion_payments

promotion_webhook_events

Store appropriate information including:

agent_id
plan_id
subscription_code
payment_reference
subscription_status
payment_status
amount
currency
started_at
next_billing_at
paid_through_at
cancelled_at

Use foreign keys and appropriate indexes.

Do not modify or delete existing records
unnecessarily.

FEATURE 5: BUSINESS ADVERTISEMENT PROFILE

After successful subscription payment,
allow the agent to create an advertisement.

Advertisement details:

- Business name
- Business logo
- Business banner
- Business description
- Business location
- Business phone number
- WhatsApp contact button
- Agent profile link

Use secure image uploads.

The advertisement must be linked to
the existing verified agent account.

Admin approval should be required
before displaying advertisements publicly.

FEATURE 6: ADVERTISEMENT DISPLAY

Display active approved business advertisements
on FUTA Homes.

Recommended locations:

- Homepage featured agents section
- Property search results
- Agent discovery page

Mark paid placements clearly as "Sponsored".

Advertisements must be responsive on
desktop, tablet, and mobile devices.

Only display advertisements when:

- Agent account is verified
- Promotion subscription is paid
- Current advertising period is valid
- Advertisement has admin approval

FEATURE 7: AGENT DASHBOARD

Create a Business Promotions section.

Show:

- Current promotion plan
- Subscription status
- Monthly fee
- Next billing date
- Advertisement preview
- Payment history
- Manage subscription button
- Cancel renewal button

Allow agents to edit their business advertisements.

FEATURE 8: ADMIN DASHBOARD

Create a Promotion Management section.

Allow admins to:

- View subscribed agents
- View active subscriptions
- Review submitted advertisements
- Approve or reject advertisements
- View successful payments
- View failed payments
- Monitor monthly promotion revenue
- Manage promotional placements
- Configure promotional plan pricing

FEATURE 9: SUBSCRIPTION EXPIRATION

Use payment verification and backend
subscription records to control access.

When a subscription is cancelled,
allow promotional access until the
already-paid billing period expires.

When payment fails or the paid period expires,
remove the advertisement from sponsored placements.

Do not delete the agent's account
or their ordinary property listings.

FEATURE 10: UI/UX DESIGN

Maintain FUTA Homes existing branding.

Use:
- White background
- Orange primary buttons
- Modern typography
- Responsive layouts
- Professional modal animations

Make the experience similar to a modern
real estate SaaS advertising platform.

FEATURE 11: TESTING

Implement and test:

- Pending verification restrictions
- Newly verified agent popup
- Dismiss popup behavior
- Successful subscription payments
- Failed payments
- Recurring renewals
- Subscription cancellation
- Promotion expiration
- Admin advertisement approval
- Duplicate webhook delivery
- Unauthorized API requests

Use Paystack test mode during development.

DELIVERABLES:

1. Inspect the existing project.
2. Propose an implementation plan.
3. Implement the required React components.
4. Implement PHP backend endpoints.
5. Create MariaDB migrations.
6. Integrate Paystack recurring subscriptions.
7. Connect the feature to existing dashboards.
8. Test the complete workflow.
9. Provide setup instructions.

Do not replace existing application features.

Work directly within the current FUTA Homes
project structure.
