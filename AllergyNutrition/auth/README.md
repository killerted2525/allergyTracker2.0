# Authentication Feature

This folder contains all authentication-related code for the frontend.

## Structure

```
auth/
├── pages/
│   └── landing.tsx     # Login/Register UI with tabs
├── hooks/
│   └── useAuth.ts      # Hook to get current user and auth status
├── lib/
│   └── authUtils.ts    # Auth utility functions
└── index.ts            # Barrel exports
```

## Usage

```typescript
import { Landing, useAuth, isUnauthorizedError } from '@/features/auth';

// In components
function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  // ...
}
```

## Components

- **Landing** - Login/register page with tabbed interface
- **useAuth** - Hook that returns current user and authentication status
- **isUnauthorizedError** - Utility to check if an error is a 401 Unauthorized error
