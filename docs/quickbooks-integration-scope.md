# QuickBooks Online integration scope

This document records the approved product scope for the PLS QuickBooks
integration. Treat it as the implementation target; do not describe future work
as available today.

## Current product scope: read-only bookkeeping access

- A PLS user may connect the QuickBooks Online company authorized for their PLS
  business/workspace.
- After a PLS bid is marked won, PLS may read and associate the bookkeeping
  activity needed to track the job, including materials costs, invoices,
  payments, and related records.
- PLS must retain or present the relevant activity so users can review it and
  export it for tax and reporting purposes. Export format and detailed field
  mapping remain implementation decisions; do not invent tax calculations or
  claim tax filing functionality.
- QuickBooks access is read-only in product behavior. Do not create, update,
  void, or delete QuickBooks records; do not change customers, chart of
  accounts, tax settings, opening balances, or other bookkeeping configuration.
- Before implementing record mapping, inspect the Accounting API entities and
  representative authorized company data. Define how a won PLS bid/project is
  linked to invoices, payments, and material-cost transactions without
  modifying QuickBooks.
- Treat the Intuit OAuth permission as an authorization prerequisite, not as
  proof that every operation is read-only. Enforce the read-only product rule
  in server code with an allowlist of read operations; explicitly prohibit
  mutation operations. Do not assume that every read operation uses HTTP GET:
  some APIs expose read queries through a POST query endpoint.

## Future work only

- Import/migration tools for customers moving to PLS from Procore or
  Buildertrend are a future product goal. They are not part of the current
  QuickBooks connection and must not be represented as implemented or included
  in current Intuit capability claims.
- QuickBooks write-back or automated bookkeeping changes are out of scope
  until separately approved, implemented, and verified.

## Security and tenant prerequisites

The repository does not yet provide a safe foundation for a production
company-scoped connection:

- The API currently accepts `X-User-ID` as identity; the office client creates
  that value locally. It is not verified authentication.
- The schema has no persisted PLS workspace/team membership or authorization
  model for choosing who may connect or disconnect a company's books.
- No QuickBooks OAuth routes, OAuth state store, connection table, encrypted
  token storage, refresh/revocation handling, or native app connection flow
  currently exists.

Before enabling customer connections, implement verified PLS authentication
and workspace membership, bind each OAuth attempt and stored connection to the
authenticated workspace, validate single-use/expiring OAuth state, and protect
access and disconnect actions by workspace authorization. Never bind a
QuickBooks company to a client-supplied user or workspace ID alone.

## Routes, deployment, and release gates

- Build and deploy real HTTPS launch, connect/reconnect, disconnect, and OAuth
  callback routes. The OAuth redirect URI is a separate Intuit setting from
  the customer-facing Host domain, Launch URL, Connect/Reconnect URL, and
  Disconnect URL.
- Do not enter placeholder URLs in Intuit Developer. Publish exact values only
  after the routes are deployed and their behavior is verified.
- Resolve the configured host discrepancy before deployment: `render.yaml`
  names `pls-api.onrender.com`, while the native client config names
  `pls-backend.onrender.com`. The live health and QBO route probes performed on
  2026-10-19 did not return a working endpoint.
- Keep sandbox and production credentials and connections separate. Verify
  the complete authorization, refresh, reconnect, disconnect, tenant-isolation,
  and read-only behaviors in sandbox before enabling production.
- Intuit assessment answers and submission must match implemented and tested
  behavior. Do not claim QuickBooks tiers, data operations, or import support
  until verified against the code and product.

## Implementation order

1. Establish verified PLS identity and workspace authorization.
2. Add secure OAuth state and workspace-scoped token/realm storage.
3. Implement the native connection entry point and deployed web routes,
   including the distinct callback/redirect URI.
4. Implement and verify read-only data retrieval and association to won bids.
5. Add user-reviewed export for tax/reporting.
6. Run sandbox and tenant-isolation checks; only then configure the production
   URLs and complete Intuit's assessment.
