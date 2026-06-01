# File Intake Status Panel Spec

## Purpose

The file intake panel shows whether required files are present and whether they are usable for the mock workspace.

## File Types

The panel must support:

- current-condition drawing
- current-condition photos
- style reference images
- vendor quotes
- PDF files

## Status Values

- `incomplete`
- `placeholder`
- `linked`
- `verified`
- `unavailable`
- `blocked`

## Required Display

For each file type, show:

- expected file type
- current state
- source evidence
- privacy note
- whether it can be used for dry-run context
- blocker or missing reason

## Forbidden Behavior

The panel must not:

- upload files to a real backend
- send files to AI API
- store private files in production assets
- treat style reference images as official designs
- treat vendor quote uploads as final accepted price
- parse PDF into production budget lines

