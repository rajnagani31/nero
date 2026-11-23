# Architectural Decision Record: Database Architecture Strategy for NeroAI

**Document Status**: Proposed / Evaluated  
**Author**: Antigravity Principal Architecture Team  
**Date**: November 2026  
**File Path**: `docs/architecture/DATABASE_ARCHITECTURE_DECISION.md`

---

## 1. Executive Summary & Context

As NeroAI scales its AI code review engine, engineering analytics, and team collaboration workspaces, the system faces two critical database design challenges:
1. **Decoupling Transactional Data from High-Velocity Telemetry/Audit Logs**: AI code reviews generate thousands of detailed LLM call traces, prompt/completion token logs, and diff spans. Storing these inside the primary transactional database introduces index bloat, lock contention, and high I/O latency.
2. **Multi-Tenancy & Data Isolation**: Enterprise organizations (e.g., banks, healthcare, enterprise SaaS) require varying guarantees around data segregation, privacy, and compliance.

This document evaluates the six major database architecture patterns used across top tech organizations (Stripe, Linear, Datadog, GitHub, Slack) and outlines NeroAI's recommended implementation roadmap.

---

## 2. Architecture Patterns Evaluated

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SPECTRUM OF DATABASE ARCHITECTURES                              │
├──────────────────────┬──────────────────────┬──────────────────┬───────────────────────┤
│ Pattern              │ Isolation Level      │ Migration Effort │ Ideal Workload        │
├──────────────────────┼──────────────────────┼──────────────────┼───────────────────────┤
│ 1. Multi-Database    │ Physical Instance    │ Low (Alembic)    │ App DB + Audit/Logs   │
│ 2. Multi-Schema      │ Schema (search_path) │ Moderate (Loop)  │ 50-500 Enterprise orgs│
│ 3. Shared Schema+RLS │ Row-level (Postgres) │ Minimal (1 DB)   │ Fast-scaling B2B SaaS │
│ 4. Polyglot OLTP+OLAP│ Engine-level split   │ Moderate         │ Telemetry & Analytics │
│ 5. Outbox + Stream   │ Decoupled Async      │ Moderate         │ Event-driven Auditing │
│ 6. Distributed SQL   │ Sharded Cluster      │ High             │ Hyper-scale (>10 TBs) │
└──────────────────────┴──────────────────────┴──────────────────┴───────────────────────┘
```

---

### Pattern 1: Two Separate Databases (App DB + Audit/Tracing DB)

This pattern separates the transactional application database (`codebot_app`) from the audit and high-volume LLM telemetry store (`codebot_audit`).

```
                      ┌──────────────────────────────────────┐
                      │             FastAPI App              │
                      └──────────────────┬───────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
         ┌───────────────────┐                       ┌───────────────────┐
         │   get_db()        │                       │  get_audit_db()   │
         │  (SessionApp)     │                       │  (SessionAudit)   │
         └─────────┬─────────┘                       └─────────┬─────────┘
                   ▼                                           ▼
         ┌───────────────────┐                       ┌───────────────────┐
         │   Primary DB      │                       │   Audit / Trace   │
         │  (PostgreSQL)     │                       │  (PostgreSQL/Logs)│
         │                   │                       │                   │
         │ • users           │                       │ • ai_call_logs    │
         │ • repositories    │                       │ • audit_events    │
         │ • pull_requests   │                       │ • telemetry_spans │
         └───────────────────┘                       └───────────────────┘
```

#### Technical Implementation Details:
* **Dual Declarative Bases**:
  ```python
  # Core setup
  engine_app = create_engine(os.getenv("DATABASE_URL"), pool_size=20)
  SessionApp = sessionmaker(bind=engine_app)
  BaseApp = declarative_base()

  engine_audit = create_engine(os.getenv("AUDIT_DATABASE_URL"), pool_size=10)
  SessionAudit = sessionmaker(bind=engine_audit)
  BaseAudit = declarative_base()
  ```
* **Alembic Multi-DB Migrations**:
  Using `alembic.ini` multi-db configuration:
  ```ini
  [alembic]
  databases = app, audit
  [app]
  sqlalchemy.url = %(DATABASE_URL)s
  [audit]
  sqlalchemy.url = %(AUDIT_DATABASE_URL)s
  ```
  In `env.py`, map `target_metadata = {"app": BaseApp.metadata, "audit": BaseAudit.metadata}`.
* **Trade-off**: Cross-database foreign keys are not supported. Link entities via soft IDs (e.g. `job_id: int` indexed on the audit table).

---

### Pattern 2: Multi-Schema in a Single Database (Schema-per-Tenant)

Master metadata (tenants, billing, users) lives in `public`, while tenant-specific operational data lives in dedicated PostgreSQL schemas (`ten_nero`, `ten_google`, etc.).

```
┌────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                  │
├────────────────────────────────────────────────────────┤
│  Schema: public (Master / Shared)                      │
│  ├── tenants (id, name, schema_name, plan)             │
│  ├── users (id, email, password_hash)                  │
│  └── tenant_memberships (user_id, tenant_id, role)     │
├────────────────────────────────────────────────────────┤
│  Schema: ten_nero (Tenant 1)                           │
│  ├── repositories                                      │
│  ├── pull_requests                                     │
│  └── review_findings                                   │
├────────────────────────────────────────────────────────┤
│  Schema: ten_google (Tenant 2)                         │
│  ├── repositories                                      │
│  ├── pull_requests                                     │
│  └── review_findings                                   │
└────────────────────────────────────────────────────────┘
```

#### Technical Implementation Details:
* **Dynamic Search Path**: Models are schema-agnostic. At request time, FastAPI resolves the tenant from JWT/header and sets:
  ```python
  session.execute(text(f"SET search_path TO {tenant_schema}, public"))
  ```
  `SELECT * FROM pull_requests` resolves to `{tenant_schema}.pull_requests`, while `SELECT * FROM users` resolves to `public.users`.
* **Migrations**: `alembic/env.py` discovers tenant schemas from `public.tenants` and loops over them, applying DDL sequentially.
* **Trade-off**: Higher migration complexity when onboarding hundreds of schemas.

---

### Pattern 3: Shared Database & Shared Schema with Row-Level Security (Postgres RLS)
*(Used by: Stripe, Linear, Supabase)*

All organizations share the exact same physical tables (`pull_requests`, `review_jobs`). Every row carries a `tenant_id` or `workspace_id`. Security is enforced by the PostgreSQL kernel:

```sql
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON pull_requests
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```
FastAPI sets the session variable per request:
```python
db.execute(text(f"SET LOCAL app.current_tenant_id = '{user.tenant_id}'"))
```
* **Pros**: Single migration updates all customers in seconds. Lowest resource overhead.
* **Cons**: Noisy neighbor risk if one customer performs massive writes.

---

### Pattern 4: Polyglot Persistence (OLTP + OLAP Split)
*(Used by: Datadog, PostHog, Figma, Greptile)*

Relational PostgreSQL is paired with a columnar OLAP database (such as **ClickHouse** or **DuckDB**):
* **PostgreSQL (OLTP)**: Manages users, accounts, PR review jobs, and current state with ACID consistency.
* **ClickHouse (OLAP)**: Ingests millions of raw LLM call events, token metrics, and time-series data. Aggregation queries across 1,000,000 PRs execute in milliseconds.

---

### Pattern 5: Transactional Outbox Pattern + Event-Driven Log Streaming
*(Used by: Uber, Netflix, Airbnb)*

APIs never write audit logs synchronously. Instead, an `outbox_events` row is written inside the same atomic PostgreSQL transaction as the application record. A Change-Data-Capture (CDC) worker or Debezium tailing Postgres WAL streams the event to **Kafka / RabbitMQ**, which asynchronously loads the audit data warehouse.

---

### Pattern 6: Sharded Distributed SQL
*(Used by: Slack, YouTube, Cockroach Labs)*

When data scales past 5–10 Terabytes, distributed query routers (**Vitess**, **Citus Data**, or **CockroachDB**) partition tables across database clusters by hash of `tenant_id`.

---

## 3. Comparison Matrix

| Criteria | Multi-DB (App+Audit) | Multi-Schema | Shared + RLS | Polyglot (PG + ClickHouse) |
| :--- | :--- | :--- | :--- | :--- |
| **Data Isolation** | Physical (High) | Schema (High) | Row (Logical) | Engine-level |
| **Maintenance Cost** | Low | Moderate | Very Low | Moderate |
| **Analytics Query Speed** | Standard SQL | Standard SQL | Standard SQL | 100x Columnar Speed |
| **Cross-Entity Joins** | No | Yes (Cross-schema) | Yes | No (Stream-joined) |
| **Zero-Downtime Migration**| Easy | Moderate (Loops) | Simplest | Independent |

---

## 4. Recommended Evolutionary Roadmap for NeroAI

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   PHASE 1 (CURRENT)    │      │    PHASE 2 (GROWTH)    │      │  PHASE 3 (ENTERPRISE)  │
├────────────────────────┤      ├────────────────────────┤      ├────────────────────────┤
│ • Shared Schema        │      │ • Two DBs / Outbox     │      │ • Tiered Hybrid        │
│ • Scoped Workspace IDs │ ───> │ • App DB (PostgreSQL)  │ ───> │ • Enterprise: Schema   │
│ • apply_workspace_scope│      │ • Audit DB (Logs/Traces│      │   or dedicated VPC DB  │
│   (Already implemented)│      │ • Async Celery logging │      │ • ClickHouse Analytics │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

1. **Current Phase (Phase 1)**: Continue with **Shared Schema + Scoped Workspace IDs** using `apply_workspace_scope()` (already in `apps/backend/shared/query_helpers.py`).
2. **Next Milestone (Phase 2)**: Implement **Architecture 1 (Separate Audit DB)** or stream LLM review telemetry through Celery workers into a dedicated logging database, keeping the primary PostgreSQL clean.
3. **Enterprise Expansion (Phase 3)**: Offer **Architecture 2 (Schema-per-Tenant)** for high-tier enterprise clients demanding strict data boundaries.
