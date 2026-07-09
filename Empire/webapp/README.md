# Empire Remodels Inc — Web App (build v4.0)

Self-contained single-file field/remodeling management app. No build step, no dependencies.

## Deploy
Upload `index.html` to any static web host (shared hosting, Netlify, Vercel, S3, GitHub Pages). Done.

## What it includes
Leads (list + kanban pipeline), cost-catalog estimating with templates, client portal
(schedule / photos / change-order approval / billing), job budgets & job costing,
change orders, purchase orders & vendors, live schedule calendar, daily logs,
live reports (profitability, A/R aging), global search, CSV exports, per-location
scoping, light/dark theme, mobile responsive.

## Data model
All data persists in the visitor's browser localStorage (keys: `empireJournal`,
`empireSettings`). Single-user per browser — there is no backend. Reset via
Settings → Reset Demo Data.
