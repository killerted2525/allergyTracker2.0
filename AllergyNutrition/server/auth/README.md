# Authentication Module

This folder contains all authentication-related code for the backend.

## Files

- **index.ts** - Main authentication setup, routes, and middleware
  - `setupAuth()` - Configures session management and auth routes
  - `isAuthenticated` - Middleware to protect routes
  - `getUserId()` - Helper to get user ID from request

## API Routes

- `POST /api/register` - Create new user account
- `POST /api/login` - Login with username/password
- `POST /api/logout` - Logout and destroy session
- `GET /api/auth/user` - Get current authenticated user

## Session Management

- Uses `express-session` with PostgreSQL storage
- Sessions stored in `sessions` table
- Session TTL: 7 days
- Requires `SESSION_SECRET` environment variable in production

## Security Features

- bcrypt password hashing (10 rounds)
- Session regeneration on login/register (prevents fixation attacks)
- httpOnly cookies
- Secure cookies in production
