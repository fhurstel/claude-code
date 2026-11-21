# Reference copy: not this team's work

This branch is an unmodified copy of **Pantry / occasions-agent** by Shivay Lamba
(https://github.com/shivaylamba/occasions-agent), commit `13dcfad`, taken 2026-11-21 for reference.

- The original repository has **no license**, so its author keeps all rights. Don't merge this branch
  into `main` or submit any of it as our own work without the author's permission.
- The commits below this note are the author's. Only this file was added.
- **Database:** the app's system of record is a remote SingleStore cluster (`SINGLESTORE_URL`), with a
  SQLite fallback that `app/db.py` creates at runtime and `app/seed.py` fills with demo data. No
  database file is part of the repository.
- **To run it** you need the keys listed in its README (`.env` section): Nebius, Senso, Cognee,
  Firedrill, SingleStore, Superlinked SIE, Statsig, Amplitude, Persona, Tokens& and Guild.

Ideas from it that the main branch re-implements in its own code: approve-then-pay with plan versions
(any change voids approval, the agent can never approve), idempotent order placement, and shopper
preferences that change the plan.
