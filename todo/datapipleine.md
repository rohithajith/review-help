## Pipeline Plan: Collected Reviews (Business In-App Flow)

### Summary
Design a **single-canonical-review pipeline** for in-app collected reviews, with:
- one authoritative review row per submission,
- append-only change log for lifecycle/audit,
- intent/click tracking for external posting behavior,
- daily KPI rollups in Postgres.
This keeps operational simplicity while preserving analytics lineage and consent governance.

### Key Changes
- **Canonical storage (`how/where/why`)**
  - Create a primary `reviews` table in Postgres (Supabase) as the source of truth for each collected review.
  - Store: `review_id`, `business_id`, `template_id` (nullable), `rating`, `review_text`, `submitted_at`, `consent_state`, `consent_statement_version`, `consent_granted_at`, `consent_revoked_at`, `source_channel='in_app'`, `schema_version`.
  - Why: one stable business object for product logic, support, and analytics joins.

- **Lifecycle metadata layer**
  - Add append-only `review_change_log` table for events like `created`, `edited`, `consent_revoked`, `status_changed`.
  - Include metadata: `event_id`, `review_id`, `event_ts`, `actor_type`, `actor_id_hash`, `change_payload_json`, `ingest_job_id`.
  - Why: auditable lineage without full immutable version storage overhead.

- **External sharing behavior tracking**
  - Add `review_distribution_events` table for in-app intent/click actions: `copied_to_clipboard`, `channel_opened`, `channel_selected`.
  - No external platform confirmation in phase 1; only in-app measurable behavior.
  - Why: realistic conversion proxy while avoiding unreliable off-platform dependencies.

- **Analytics-serving layer (daily batch)**
  - Build daily curated facts/views:
    - `fact_reviews_daily` (volume, avg rating, template vs own-review split),
    - `fact_consent_daily` (grant/revoke rates),
    - `fact_distribution_daily` (copy/click/open funnel).
  - Why: fast KPI querying and dashboard stability without touching transactional queries.

- **Metadata governance**
  - Register datasets/columns in metadata registry tables with owner, purpose, sensitivity class, refresh cadence, retention.
  - Pseudonymize actor identifiers and keep consent token hashes only.
  - Why: traceability, privacy-by-design, and clearer handoff for future warehouse migration.

### Interfaces / Contracts
- Introduce a versioned **review ingestion contract** for new records and lifecycle events (`schema_version` required).
- Keep current submission endpoint behavior, but map writes into canonical `reviews` + change log.
- Add internal read interfaces (SQL views first) for:
  - review collection KPIs,
  - consent lifecycle metrics,
  - distribution funnel metrics.

### Test Plan
- Contract validation: required fields + schema version compatibility.
- Idempotency: duplicate event/retry does not duplicate lifecycle rows.
- Data integrity: every `review_change_log.review_id` maps to canonical `reviews.review_id`.
- Consent correctness: revoke transitions reflected in both snapshot and log.
- Funnel accuracy: copy/click/open daily aggregates match raw distribution events.
- Retention checks: event-level analytics records enforce 13-month window.

### Assumptions
- Source scope: **in-app collected reviews only** (no external imports in phase 1).
- Canonical unit: **single review snapshot** per submission.
- History model: **snapshot + append-only change log**.
- Text policy: store **raw review text in canonical table** plus derived non-PII analytics features.
- Freshness: **daily batch**; event retention **13 months**.
