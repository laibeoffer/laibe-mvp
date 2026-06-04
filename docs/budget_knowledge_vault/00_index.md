# Budget Knowledge Vault

Workstream: `knowledge/budget-vault`

Managed by: `LAIBE_REVIEWER_INTEGRATION_OFFICER`

Status: `ACTIVE_SUPPORT`

Functional acceptance: `NOT_APPLICABLE_DOCS_ONLY`

Not part of the four-line Budget Integration Gate: Yes

## Purpose

The Budget Knowledge Vault is a support-only Markdown vault. It organizes scoped evidence from the four core budget workstreams so the Integration Officer can inspect readiness, gaps, decisions, and proposals without treating this vault as runtime evidence.

This vault does not replace the completion packets for Quote Factory, Raw Candidate, MethodSpec, or Output Documents. It does not create formal prices, production pricing rules, budget estimate lines, renderer output, customer quotes, payment flows, AI API calls, database writes, n8n flows, Obsidian runtime changes, Plancraft changes, or integration harness execution.

## Core Sections

| Section | Purpose |
|---|---|
| `01_quote_factory/` | Quote Factory status, export package notes, and evidence references. |
| `02_raw_candidate/` | Raw Candidate status and handoff notes. |
| `03_method_spec/` | MethodSpec status and rule guard notes. |
| `04_output_documents/` | Output Documents status and snapshot renderer notes. |
| `05_integration_backlog/` | Integration gap register and readiness matrix. |
| `06_proposals/` | Support proposals only; no runtime or formal-pricing authority. |
| `07_decision_logs/` | Reviewer / Commander decision logs from scoped evidence. |

## Current Snapshot

| Workstream | Current evidence state | Gate relation |
|---|---|---|
| Quote Factory | `FUNCTIONAL_ACCEPTANCE_PENDING`; PR #3 draft/open context; validator evidence still needed. | Core gate line. |
| Raw Candidate | `FINAL_PACKET_SUBMITTED`; PR #26 merged; final packet posted; final acceptance pending. | Core gate line. |
| MethodSpec | `BLOCKED`; blocker routed to Budget Engine Entry / Picking via Issue #49. | Core gate line. |
| Output Documents | `WAITING_REVIEW`; PR #23 merged and PR #29 open context; snapshot-only evidence pending. | Core gate line. |

## Context Windows

| Window | Status | Notes |
|---|---|---|
| Requirement Form Window | `placeholder / linked / verified` tracking required. | Must not become direct line-item or pricing authority. |
| Plan Puzzle SVG / Quantity Facts Window | `placeholder / linked / verified` tracking required. | SVG / quantity facts remain non-production authority until verified. |

## Operating Rule

No recurring heartbeat or patrol may create timestamp-only or status-only updates to this vault. Updates must be scoped evidence, explicit decisions, gap changes, readiness changes, or approved replacement PR work.
