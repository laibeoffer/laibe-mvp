# Requirement Status Panel Spec

## Purpose

The requirement panel displays readiness of the owner's requirement form or ProjectRequirementBrief placeholder.

## Status Values

- `incomplete`
- `completed`
- `placeholder`
- `verified`
- `blocked`

## Required Requirement Groups

- project type
- location or region
- space type
- existing condition
- target scope
- budget expectation
- schedule expectation
- must-have constraints
- unknown assumptions

## Verification Rules

`completed` does not equal `verified`.

The panel may mark data as `verified` only when a defined review source confirms it. Until then, the workspace should display:

`completed / not verified`

## CTA Rule

If required fields are missing, the dry-run CTA must be disabled with a reason such as:

`Requirement form is incomplete`

