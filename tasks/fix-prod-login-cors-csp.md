# Task: Fix Production Login CORS and CSP Issues

## Goal
Restore production login flow by allowing the frontend origin to access backend APIs and WebSocket endpoints without violating CORS or Content Security Policy (CSP) restrictions.

## Implementation Plan
1. **Review current security configuration**
   - Confirm how `helmet` and `cors` are configured in `backend/src/app.ts`.
   - Inventory existing environment variables related to allowed origins and WebSocket URLs.

2. **Adjust CORS handling**
   - Replace the single-origin setup with a small utility that accepts a comma-separated list of origins via a new `CORS_ALLOWED_ORIGINS` (fallback to prior env var for compatibility).
   - Ensure responses set `Access-Control-Allow-Origin` to the requesting origin when it is allowed, while continuing to support credentialed requests.
   - Add minimal unit coverage for the origin filtering helper (e.g., verifying allowed vs. denied origins).

3. **Update CSP to support WebSockets**
   - Configure backend `helmet` with explicit directives so `connect-src` includes `'self'`, `https:`, `wss:`, plus configured API/WS endpoints.
   - Update `frontend/nginx.conf` CSP header to mirror the backend policy (include `connect-src` for production domains) so static assets served via Nginx allow WebSocket connections.
   - Keep other defaults intact to avoid weakening existing protections, documenting any deviations.
   - Add a focused test (supertest) that asserts the backend CSP header includes the expected `connect-src` entries.

4. **Documentation & environment updates**
   - Document the new environment variables and defaults in `README.md` or appropriate deployment guide, emphasizing production values (`https://drop.toovy.tech`, `wss://drop-api.toovy.tech`).

5. **Verification**
   - Run backend unit tests (`npm test`) and lint (`npm run lint`).
   - Execute `getIdeDiagnostics` on touched TypeScript files.
   - Provide guidance for validating production after deployment (login + WS connection).

## Open Questions / Dependencies
- Confirm if any additional production domains (e.g., admin subdomains) need to be whitelisted simultaneously.
- Validate whether CDN/proxy layers enforce their own CSP that also must be updated.

## Progress Log
- [x] Reviewed existing `helmet` / CORS configuration and deployment environment defaults.
- [x] Implemented flexible origin parsing with credential-aware CORS handling.
- [x] Applied CSP updates on backend (`helmet`) and frontend Nginx to allow WebSocket connections.
- [x] Added targeted Jest coverage for CORS helpers and CSP header behavior.
- [ ] Awaiting production validation of updated policies and any additional domain inputs.
