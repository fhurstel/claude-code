# PocketBase setup for ProField

This ProField build now expects **PocketBase** to be the shared multi-device backend for internal users.

## What is still server-side outside PocketBase
These pieces still stay in the Flask proxy:
- Mailgun email sending (`/api/send-email`)
- client approve/decline email action capture (`/action/approve`, `/action/decline`)
- polling/clearing those actions (`/api/actions`, `/api/actions/clear`)

Everything else in the main dashboard should live in PocketBase.

## 1) Start PocketBase

```bash
cd /root/.hermes/workspace/profield
./scripts/start-pocketbase.sh
```

Default URL:
- `http://SERVER_IP:8090`

## 2) Create the PocketBase superuser
On first launch PocketBase will prompt you in the terminal, or you can use the admin UI.

Admin UI:
- `http://SERVER_IP:8090/_/`

Create one **superuser** account.

## 3) Create the application collections
Create these collections in PocketBase admin UI:

### users (auth collection)
Use PocketBase **Auth collection** named `users`.
Required fields:
- `full_name` (text)
- `role` (select or text; e.g. admin, office, tech)

Recommended auth settings:
- email/password auth enabled
- email visibility off
- only internal staff accounts created by admin

### Base collections
Create these **base** collections:
- `clients`
- `leads`
- `estimates`
- `jobs`
- `invoices`
- `payments`
- `service_types`
- `settings`

### Common field rule
For all base collections above, create:
- `app_id` (text, required, unique if possible)

The React app uses `app_id` as the cross-device stable record id.
PocketBase keeps its own internal record id separately.

### Suggested fields per collection

#### clients
- `app_id` text
- `full_name` text
- `email` email
- `phone` text
- `address` text
- `notes` editor/text
- `created_at` date

#### leads
- `app_id` text
- `name` text
- `email` email
- `phone` text
- `address` text
- `notes` editor/text
- `service_needed` text
- `source` text
- `estimated_value` number
- `preferred_date` date
- `status` text
- `created_at` date

#### estimates
- `app_id` text
- `estimate_number` text
- `client_id` text
- `client_name` text
- `client_email` email
- `client_phone` text
- `service_address` text
- `service_type` text
- `title` text
- `description` editor/text
- `line_items` json
- `tax_rate` number
- `discount_amount` number
- `status` text
- `notes` editor/text
- `terms` editor/text
- `valid_until` date
- `subtotal` number
- `tax_amount` number
- `total_amount` number
- `email_message_id` text
- `client_action_at` date
- `created_at` date

#### jobs
- `app_id` text
- `job_number` text
- `title` text
- `client_id` text
- `client_name` text
- `client_email` email
- `client_phone` text
- `estimate_id` text
- `service_type` text
- `service_address` text
- `description` editor/text
- `status` text
- `priority` text
- `notes` editor/text
- `completion_notes` editor/text
- `invoiced` bool
- `scheduled_start` date
- `scheduled_end` date
- `technician` text
- `updates` json
- `line_items` json
- `subtotal` number
- `total_amount` number
- `created_at` date

#### invoices
- `app_id` text
- `invoice_number` text
- `client_id` text
- `client_name` text
- `client_email` email
- `client_phone` text
- `job_id` text
- `estimate_id` text
- `title` text
- `service_address` text
- `line_items` json
- `subtotal` number
- `tax_rate` number
- `tax_amount` number
- `discount_amount` number
- `total_amount` number
- `amount_paid` number
- `balance_due` number
- `status` text
- `due_date` date
- `notes` editor/text
- `email_message_id` text
- `created_at` date

#### payments
- `app_id` text
- `invoice_id` text
- `client_id` text
- `client_name` text
- `amount` number
- `method` text
- `status` text
- `reference` text
- `notes` editor/text
- `paid_at` date
- `created_at` date

#### service_types
- `app_id` text
- `name` text
- `rate` number

#### settings
- `app_id` text
- `businessName` text
- `defaultTaxRate` number
- `defaultPaymentTerms` text
- `defaultEstimateTerms` editor/text
- `defaultInvoiceNotes` editor/text
- `apiKey` text

## 4) API rules for a small internal app
For a simple internal shared dashboard, start with:
- list/view/create/update/delete allowed for authenticated users only

In PocketBase rule editor, use:

```txt
@request.auth.id != ""
```

for:
- listRule
- viewRule
- createRule
- updateRule
- deleteRule

That gives you a basic authenticated internal app model.

## 5) Create at least one staff user
In the `users` auth collection, create at least one user account.
That account is what you use on the new ProField login screen.

## 6) Configure the frontend
Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Then set:

```bash
VITE_POCKETBASE_URL=http://SERVER_IP:8090
```

## 7) Run ProField

```bash
npm install
npm run build
npm run dev
```

or serve the built app through nginx as before.

## Notes
- If PocketBase collections are missing, the app may load but data calls will fail.
- The old localStorage model is no longer the intended primary data store.
- Existing email approval links still depend on the Flask proxy action endpoints.
