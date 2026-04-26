# plumb level and Squared

## Overview

Two-lane construction estimating system:
- **Office/GC Web App** — contractors upload blueprints, tag segments, assign materials, compare 3 vendor bids, and generate hard-bid-ready estimates
- **Field Mobile App** (Expo) — foremen tap blueprint segments to see assigned material, vendor, quantity, and notes; can add field notes, mark segments complete, and attach job site photos

pnpm workspace monorepo using TypeScript. All apps share the same backend API and PostgreSQL database.

## Architecture

```
artifacts/
  api-server/       Express 5 REST API (port from $PORT, default 8080)
  office/           React + Vite web app for GC estimators (preview path /)
  field/            Expo React Native app for foremen (preview path /field/)
  mockup-sandbox/   Vite component preview server
lib/
  db/               Drizzle ORM schema + migrations (PostgreSQL)
  api-spec/         OpenAPI 3.1 spec + Orval codegen config
  api-zod/          Generated Zod validators (from OpenAPI spec)
  api-client-react/ Generated React Query hooks (from OpenAPI spec)
```

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **Object Storage**: Replit Object Storage (GCS-backed)

## Database Schema

| Table | Description |
|-------|-------------|
| `projects` | Construction projects (active/completed/archived) |
| `blueprints` | PDF blueprint files linked to a project |
| `segments` | Tagged regions on a blueprint (wall/grid/elevation/detail) |
| `materials` | Material catalog (name, type, spec, unit, picture) |
| `vendors` | Vendor directory (name, contact, phone, email) |
| `vendor_bids` | Bids per segment/material/vendor with quantity & unit price |
| `estimates` | Generated project estimates (draft/final) |
| `segment_photos` | Field photos attached to segments (fileUrl, caption) |

Segments also carry `fieldNotes` (text, nullable) and `completedAt` (timestamp, nullable) updated by the field crew via `PATCH /segments/:id/field`.

## Segment Coordinates

Segment `x`, `y`, `width`, `height` are stored as **percentage values (0–100)** relative to the blueprint image dimensions. For example, `x=10` means 10% from the left edge. The field app converts to pixels by multiplying `pct / 100 * displaySize`.

## API Endpoints (all under `/api`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check |
| GET/POST | `/projects` | List / create projects |
| GET/PATCH/DELETE | `/projects/:id` | Get / update / delete project |
| GET | `/projects/:id/estimate` | Generate hard-bid estimate |
| GET/POST | `/projects/:projectId/blueprints` | List / add blueprints |
| GET/DELETE | `/blueprints/:id` | Get / delete blueprint |
| GET/POST | `/blueprints/:blueprintId/segments` | List / create segments |
| GET/PATCH/DELETE | `/segments/:id` | Get / update / delete segment |
| PATCH | `/segments/:id/field` | Update field notes + completion (foreman) |
| GET/POST | `/segments/:segmentId/photos` | List / upload field photos |
| GET/POST | `/materials` | List / create materials |
| GET/PATCH/DELETE | `/materials/:id` | Get / update / delete material |
| GET/POST | `/vendors` | List / create vendors |
| GET/PATCH/DELETE | `/vendors/:id` | Get / update / delete vendor |
| GET/POST | `/segments/:segmentId/bids` | List / create bids |
| PATCH/DELETE | `/bids/:id` | Update / delete bid |
| GET | `/dashboard` | Aggregate summary stats |
| POST | `/storage/uploads/request-url` | Get presigned upload URL |
| GET | `/storage/public-objects/*` | Serve public files |
| GET | `/storage/objects/*` | Serve private files |
| GET | `/storage/static/*` | Serve local static files from `artifacts/api-server/static/` (blueprint images) |

## Material Calculator (Office App — /calculator)

A standalone takeoff calculator accessible from the Office app sidebar:

- **CMU Block** — Standard 8", 6", 12", Split Face, Half High, or Custom dimensions. Calculates blocks/SF using the standard modular formula (12/nomL × 12/nomH), courses, and quantity with waste.
- **Brick** — Standard Modular, King Size, Utility, Queen, or Custom. Accounts for single- or double-wythe construction. 10% waste default (per ASTM/industry standard).
- **Natural Stone** — 8 Oregon-specific presets (Basalt, Columbia River Basalt Ledge, Fieldstone, Granite, Limestone, Sandstone, Cultured Stone, Flagstone) with 2024–25 Pacific Northwest material and installed price ranges. Custom pricing available.
- **Custom** — Any unit with actual length/height + mortar joint input. Useful for cultured stone panels, irregular masonry, or non-standard CMU.
- All modes support door/window opening deductions and an overrideable waste factor.

Key files:
- `artifacts/office/src/lib/masonry-calculator.ts` — pure calculation utilities (no React)
- `artifacts/office/src/pages/material-calculator.tsx` — UI page

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Object Storage

Configured via environment secrets:
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID` — GCS bucket
- `PUBLIC_OBJECT_SEARCH_PATHS` — paths served publicly
- `PRIVATE_OBJECT_DIR` — prefix for private object entities

See `artifacts/api-server/src/lib/objectStorage.ts` for implementation.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
