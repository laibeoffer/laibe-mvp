# Plan Quantity Status Panel Spec

## Purpose

The plan quantity panel shows whether Plan Puzzle / SVG / quantity facts are available and trustworthy enough for a dry-run.

## Status Values

- `placeholder`
- `linked`
- `verified`
- `unavailable`
- `blocked`

## Required Display

- source type: Plan Puzzle, SVG, JSON, room-based facts, manual note
- source id or artifact id
- quantity scope
- confidence label
- missing quantity categories
- whether the quantity source is accepted for dry-run

## Dry-Run Entry Rule

Only `verified` plan quantity can pass the dry-run gate.

`placeholder` and `linked` states must be visible but must not silently enter Budget Engine dry-run.

## Forbidden Behavior

The panel must not:

- modify Plancraft core
- create formal quantity facts
- convert `.pc` files
- call Budget Engine
- create formal estimate lines

