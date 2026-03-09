# Hasura Seed Files

This folder stores SQL seed files applied during Hasura restore/bootstrap.

## Current Flow

1. Generate SQL seed from backend script:
   - `npm run seed:generate`
2. Apply metadata + seed SQL:
   - `powershell -ExecutionPolicy Bypass -File .\restore-hasura.ps1`

## Source of Generated SQL

- Auto-generated from:
  - `src/scripts/generateHasuraSeed.ts`
- Common output file:
  - `products_seed.sql`

## Notes

- Run commands from `internship-backend` root.
- Seed files in this folder are treated as environment bootstrap artifacts.
