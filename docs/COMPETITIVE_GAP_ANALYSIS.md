# Competitive Gap Analysis and Feasibility Roadmap

This document translates market expectations into a practical, personal-use roadmap for this project while preserving its markdown-first, git-based architecture.

## Project Constitution

All roadmap decisions must satisfy these principles:

1. Markdown under `projects/**` remains the canonical source of truth.
2. Git history remains the primary audit and recovery trail.
3. Automations are deterministic, idempotent, and explainable.
4. Personal-use ergonomics (low friction, fast triage) take priority.
5. Write safety is explicit (`versionToken`, preview/dry-run for high impact actions).
6. Complexity grows only when measurable value is proven.
7. Core workflows remain resilient offline and during integration failures.
8. Integrations are optional adapters around local files, never required core state.

## Current Product Baseline

Current capabilities already cover:
- dashboard search/filter/saved views and focus filters
- timeline + gantt + health + dependencies + trends + alerts
- write APIs with optimistic conflict protection
- actionable alert playbooks via API/dashboard/MCP
- scripted operations cadence and MCP tooling

Primary references:
- `public/app.js`
- `src/server.js`
- `src/mcp-server.js`
- `src/action-playbook.js`

## Feature Matrix (Top Players vs Current)

Legend: `Parity` = roughly equivalent, `Partial` = present but limited, `Missing` = absent.

| Category | Jira / Asana / ClickUp / Linear / Monday / Notion | Current status | Gap level |
|---|---|---|---|
| Task + status management | Rich issue/task workflows and metadata | Core task/status updates exist | Partial |
| Multi-view planning | Board, timeline, calendar, roadmap variants | Timeline/calendar/gantt present | Partial |
| Dependency handling | Native links, blockers, portfolio dependency views | Dependency insights and alerting exist | Partial |
| Alerting and risk insight | Dashboards with risk/progress signals | Alerts, health, today brief, trends | Partial |
| Automation rules | Trigger-condition-action builders | Scripted ops + playbooks, limited rule DSL | Partial |
| Recurring work | Recurring tasks/events with visibility | No native recurrence model yet | Missing |
| Workload/capacity | Team or personal capacity visualization | No formal estimate/capacity model | Missing |
| Time tracking | Built-in or integrated timers/timesheets | No native time-entry model | Missing |
| Intake/forms | Request forms with routing/templating | No first-class intake forms | Missing |
| Keyboard triage | Command palette, shortcuts, batch actions | Basic UI interactions only | Missing |
| Explainability | Usually weak or implicit in many tools | Action reasons exist, deeper evidence missing | Partial |
| Offline/local-first | Usually limited in SaaS PM tools | Git/local model is strong base | Partial |
| Portability/migration | Import/export quality varies | Git portability strong, migration tooling limited | Partial |

## Highly Requested Features (Personal-Use Feasible)

1. Recurring tasks with full calendar/timeline projection.
2. Personal workload view using effort estimates.
3. Noise-controlled reminders (overdue/stale/blocked digests, quiet hours).
4. Forms/intake pipelines that create tasks/projects from structured inputs.
5. Rule-based automations with dry-run and explicit audit output.
6. Command palette, keyboard shortcuts, and bulk edits.
7. Better dependency/staleness reporting and proactive rescue nudges.
8. Lightweight local time-tracking entries linked to tasks/milestones.

## Underserved Market Gaps (Differentiator Opportunities)

Most PM products still underperform on:
- signal quality over notification volume
- contextual decision history ("why changed") next to status changes
- dependency explainability with concrete unblock paths
- early staleness prevention before board decay
- realistic capacity allocation without heavy setup
- explainable automation recommendations with evidence and confidence

## Feasibility Tiers (No-DB / Git Constraints)

### High Feasibility (low architecture risk)

- recurring task engine with deterministic occurrence generation
- personal notification relevance profiles and digest controls
- decision-log append-only records tied to state transitions
- dependency explainability panel + unblock checklists
- command palette + batch edits over existing write endpoints
- forms-to-markdown ingestion with validation
- explainable action payload fields: `reason`, `evidence`, `sourceFiles`

Risks:
- UX clutter from too many control surfaces
- noisy event streams

Mitigations:
- start with minimal presets
- enforce notification throttling and digest defaults

### Medium Feasibility (careful design required)

- workload/capacity modeling with uneven day allocation
- local time-tracking + rollup reporting
- offline draft queue and later merge/reconcile UX
- advanced automation editor with replay/sandbox boundaries
- migration assistant for external PM schema mapping

Risks:
- model complexity and user confusion
- reconcile conflicts in offline edits

Mitigations:
- ship opinionated v1 schemas
- add migration validators and explicit conflict flows

### Low Feasibility (without major tradeoffs)

- fully seamless multi-device offline collaboration with near-zero merge friction
- zero-config automatic migration from heterogeneous external PM schemas
- large-scale analytics without introducing a query/data store

## Phased Implementation Roadmap

## Phase 1: Personal Throughput Foundation (Weeks 1-3)

Deliver:
- command palette (quick open, quick update, quick add)
- bulk status/priority actions
- notification digest controls (overdue/stale/blocked)
- recurrence schema v1 for tasks

Success metrics:
- 30-40% fewer manual clicks for daily triage flows
- >=80% of daily updates achievable via keyboard-first interactions

## Phase 2: Explainable Planning Core (Weeks 4-7)

Deliver:
- recurrence projection in calendar/gantt
- dependency explainability panel with unblock steps
- decision rationale capture on key state changes
- pre-stale nudges and rescue playbooks

Success metrics:
- earlier intervention before stale threshold
- reduced unresolved blocker age

## Phase 3: Personal Capacity + Intake (Weeks 8-11)

Deliver:
- effort estimate field and personal capacity widget
- local time-entry log model + summary reports
- forms/intake definitions that route to task/project creation

Success metrics:
- clearer weekly load planning
- lower backlog intake friction

## Phase 4: Advanced Automation + Portability (Weeks 12-16)

Deliver:
- automation rule editor v1 (safe trigger-condition-action)
- dry-run/replay inspection views
- migration/import assistant and portable workspace snapshot packaging

Success metrics:
- higher automation coverage for repetitive flows
- predictable migration/export outcomes

## Constitution Compliance Checklist

Use this gate before coding and before merging:

1. Source-of-truth check: state stays canonical in `projects/**`.
2. Git/audit check: transitions and automation outputs are traceable.
3. Determinism check: reruns are safe and reproducible.
4. Safety check: explicit write intent and preview paths exist.
5. Personal UX check: reduced friction and cognitive load.
6. Complexity budget check: simplest viable file-native approach.
7. Resilience check: graceful degradation and visible failure states.
8. Interoperability check: open import/export and no adapter lock-in.
9. Documentation check: schema/runbook updates included.

