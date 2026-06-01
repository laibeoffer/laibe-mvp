# MethodSpec Status Panel Spec

## Purpose

The MethodSpec panel shows readiness of method/spec warehouse rules for budget dry-run coordination.

## Status Values

- `ready`
- `blocked by engine entry`
- `validated`
- `blocked`

## Required Display

- MethodSpec rule package
- validator status
- known blocker
- engine entry dependency
- whether rules can be read by the dry-run layer

## Blocker Rule

If Budget Engine entry is unresolved, the panel must show:

`blocked by engine entry`

The panel must not route the blocker back to MethodSpec for self-repair unless the assigned integration owner explicitly decides that MethodSpec owns the fix.

## Forbidden Behavior

The panel must not:

- modify MethodSpecCatalog
- modify Budget Engine runtime
- call renderer
- generate output documents
- create formal prices

