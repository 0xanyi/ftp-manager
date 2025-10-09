# Fix Audit Metadata Type Error

## Goal
Resolve the Prisma metadata typing mismatch so the backend dev server can start successfully.

## Plan
1. Verify the Prisma model definition for `AuditLog.metadata` and confirm accepted input types, then audit existing service call sites to ensure their payloads remain compatible.
2. Update the audit service typing so `AuditEvent.metadata` maps to `Prisma.InputJsonValue`, and adjust the create call to supply a Prisma-compatible null when metadata is absent, propagating any required changes to dependent services (e.g., Redis helpers) uncovered during compilation.
3. Add a regression test around `auditService.recordEvent` that covers recording an event without metadata to ensure the service remains type-safe and Prisma receives the expected value.
4. Execute linting, tests, and IDE diagnostics for touched files, capturing any follow-up work if failures occur.

## Risks & Mitigations
- **Mismatch with existing callers**: Ensure all call sites still satisfy the updated `AuditEvent` signature by running TypeScript checks.
- **Test isolation**: Mock Prisma client in the new test to prevent database writes during unit tests.

## Definition of Done
- TypeScript compilation succeeds for the backend dev server.
- Added regression test passes and guards against future regressions.
- All linting, test, and diagnostic steps succeed or have documented follow-ups.
