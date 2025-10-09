# CSRF Token Integration Fix

## Issue
When attempting to create a channel through the admin interface, the request was rejected with a 403 Forbidden error:
```
Error: CSRF token is required for this request
```

The backend's CSRF protection middleware requires all state-changing requests (POST, PUT, DELETE, PATCH) to include a valid CSRF token in the `x-csrf-token` header.

## Root Cause
The frontend services (`adminService.ts` and `api.ts`) were not fetching or including CSRF tokens in their requests.

## Solution Implemented

### 1. Updated `api.ts` (Used by fileService, uploadService)
Added CSRF token fetching and caching mechanism:
- **Token Caching**: Tokens are cached for 14 minutes to avoid unnecessary requests
- **Automatic Inclusion**: CSRF tokens are automatically included in all POST, PUT, DELETE, PATCH requests via axios interceptor
- **Token Refresh**: Expired tokens are automatically refreshed when needed

**Key Changes:**
```typescript
private csrfToken: string | null = null;
private csrfTokenExpiry: number = 0;

private async getCsrfToken(): Promise<string> {
  // Check if we have a valid cached token
  const now = Date.now();
  if (this.csrfToken && this.csrfTokenExpiry > now) {
    return this.csrfToken;
  }

  // Fetch a new CSRF token
  const response = await axios.get('/api/security/csrf-token', {
    headers: {
      Authorization: this.client.defaults.headers.common['Authorization']
    }
  });

  const token = response.data.data.token;
  this.csrfToken = token;
  this.csrfTokenExpiry = now + 14 * 60 * 1000;
  
  return token;
}
```

Interceptor update:
```typescript
this.client.interceptors.request.use(
  async (config) => {
    // ... existing auth logic ...

    // Add CSRF token for state-changing requests
    if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      const csrfToken = await this.getCsrfToken();
      config.headers['x-csrf-token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);
```

### 2. Updated `adminService.ts`
Added CSRF token support for all admin operations:
- Created `getCsrfToken()` method to fetch tokens from `/api/security/csrf-token`
- Created `getAuthHeadersWithCsrf()` method to include CSRF tokens in headers
- Updated all state-changing methods to use `getAuthHeadersWithCsrf()`:
  - `createUser()`
  - `updateUser()`
  - `deactivateUser()`
  - `updateUserChannels()`
  - `deleteChannel()`
  - `createChannel()` ← **Primary fix for the reported issue**
  - `updateChannel()`
  - `updateChannelUsers()`

## Backend CSRF Protection Details
The backend's CSRF protection middleware (`csrfProtection.ts`):
- **Excluded Paths**: `/api/security/csrf-token`, `/api/health`, `/api/auth/login`, `/api/auth/register`
- **Safe Methods**: GET, HEAD, OPTIONS (no CSRF required)
- **Token Validity**: 15 minutes
- **Token Consumption**: Single-use tokens (consumed after validation)

## Testing Performed
1. ✅ TypeScript compilation successful
2. ✅ Frontend build successful
3. ✅ ESLint validation (warnings only, no errors)
4. 🔄 Manual testing recommended: Create/update/delete channels and users

## Files Modified
- `/Users/0xanyi/Developer/ftp-manager/frontend/src/services/api.ts`
- `/Users/0xanyi/Developer/ftp-manager/frontend/src/services/adminService.ts`

## Benefits
1. **Security**: Full CSRF protection for all state-changing operations
2. **Performance**: Token caching reduces unnecessary API calls
3. **Maintainability**: Centralized CSRF handling in axios interceptor
4. **User Experience**: Automatic token management (no user action required)

## Next Steps
1. Test channel creation, update, and deletion
2. Test user management operations
3. Test file upload and management operations
4. Monitor CSRF token refresh behavior in production

## Notes
- CSRF tokens are single-use and expire after 15 minutes
- Frontend caches tokens for 14 minutes to ensure they're refreshed before expiry
- All services using `apiService` automatically get CSRF protection
- Admin service uses its own CSRF fetching for direct fetch API calls
