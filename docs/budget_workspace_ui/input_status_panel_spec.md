# Input Status Panel Spec

## Purpose

The input status panel summarizes whether required budget-generation inputs are present, linked, verified, or blocked.

## Required Sections

- Requirement form
- File intake
- Plan Puzzle / quantity source
- Quote Factory package
- Raw Candidate evidence
- MethodSpec readiness

## Display Fields

Each section must show:

- status label
- evidence count
- missing item count
- whether the section can enter Budget Engine dry-run
- disabled reason if not ready

## Aggregate Status

The panel aggregate status is:

- `blocked` if any required module is blocked
- `incomplete` if any required module is incomplete
- `placeholder` if any required module is placeholder-only
- `linked` if all required modules are linked but not verified
- `verified` if all required modules are verified and dry-run gate is ready

## CTA Interaction

The panel must update the next-step CTA:

- `enabled: false` for blocked, incomplete, placeholder, unavailable
- `enabled: false` for linked but not verified
- `enabled: true` only when the Budget Engine dry-run gate explicitly permits it

