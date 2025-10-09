# Security Hardening Plan

## Objective

Close the remaining security gaps required for production readiness by adding CSRF protections, malware scanning for file uploads, and persistent audit logging.

## Implementation Steps

1. **Create Branch & Baseline**
   - Switch to a dedicated branch for security updates.
   - Capture current lint/test status to compare after changes.

2. **CSRF Protection**
   - Integrate a CSRF protection middleware (e.g., `csurf`) for state-changing routes.
   - Expose CSRF tokens through an authenticated endpoint for the frontend.
   - Exclude API routes used by the websocket handshake or public health checks if incompatible.
   - Update relevant tests to cover CSRF token retrieval and rejection of missing/invalid tokens.

3. **File Upload Malware Scanning**
   - Add a pluggable scanning layer (initially using a mock interface so the upload flow blocks suspicious files but remains testable without ClamAV).
   - Run scans after chunk assembly and before FTP transfer, short-circuiting on failures with audit logging.
   - Provide configuration toggles via environment variables for real scanner integration later.
   - Extend upload tests to cover clean vs. flagged files.

4. **Audit Logging**
   - Introduce a Prisma-backed `audit_logs` table and data access utilities.
   - Instrument key controllers (auth, user management, file actions, admin operations) to record structured audit events.
   - Replace the placeholder `/api/admin/audit-logs` response with real pagination.
   - Add tests verifying log persistence and API retrieval security.

5. **Documentation & Configuration**
   - Update `.env.example` files with any new secrets/toggles.
   - Document CSRF usage and scanning requirements in AGENTS and roadmap files, adjusting checklist items accordingly.

6. **Validation**
   - Run IDE diagnostics, lint, and tests.
   - Capture evidence (e.g., sample logs, test outputs) demonstrating the new protections.

## Questions / Dependencies

- Confirm acceptable behavior for API clients (e.g., admin scripts) that cannot easily fetch CSRF tokens.
- Determine target antivirus engine for production (mock interface initially).

## Progress

- [x] CSRF protection middleware and token issuance implemented with coverage tests.
- [x] Malware scanning enforced with EICAR detection and configurable toggle.
- [x] Audit logging persisted via Prisma with admin retrieval endpoint and tests.
