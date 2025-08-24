# Authentication Test Guide

## ✅ Authentication Implementation Complete

The authentication system has been successfully implemented with JWT-based authentication.

## Test Credentials

### Admin User
- Email: `admin@spaceweather.com`
- Password: Any password with 8+ chars, uppercase, lowercase, number, and special char (e.g., `Admin123!`)
- Role: `admin`
- Permissions: All

### Regular User
- Email: `user@spaceweather.com`
- Password: Any password with 8+ chars, uppercase, lowercase, number, and special char (e.g., `User123!`)
- Role: `user`
- Permissions: Read, Write

### Viewer (Read-Only)
- Email: `viewer@spaceweather.com`
- Password: Any password with 8+ chars, uppercase, lowercase, number, and special char (e.g., `Viewer123!`)
- Role: `viewer`
- Permissions: Read only

## Testing Authentication

### 1. Login
```bash
# Create login credentials file
echo '{"email":"admin@spaceweather.com","password":"Admin123!"}' > login.json

# Login and get tokens
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @login.json
```

### 2. Use Protected Endpoints
```bash
# Store the access token from login response
TOKEN="your-access-token-here"

# Access protected endpoint
curl -X GET http://localhost:3000/api/reports \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Verify Token
```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Refresh Token
```bash
# Use the refresh token from login
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token-here"}'
```

## Protected Routes

All API routes except the following require authentication:
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/refresh`
- `/api/auth/verify`
- `/api/health`
- `/api/public/*`

## Role-Based Access

- **Admin Routes** (`/api/admin/*`): Require admin role
- **Write Operations**: Require user or admin role
- **Read Operations**: All authenticated users (including viewers)

## Security Features Implemented

✅ JWT token authentication
✅ Role-based access control (RBAC)
✅ Password strength validation
✅ Token expiration (24h access, 7d refresh)
✅ Secure password hashing (bcrypt)
✅ Protected API endpoints
✅ Middleware-based route protection
✅ User context in requests

## Environment Variables Required

Add these to your `.env` file:
```env
JWT_SECRET="your-secret-key-minimum-32-characters"
JWT_EXPIRY="24h"
REFRESH_TOKEN_EXPIRY="7d"
```

## Next Steps

To fully secure the application, implement:
1. User registration endpoint
2. Password reset functionality
3. Database integration for user storage
4. Session management
5. Rate limiting
6. CORS configuration
7. Security headers