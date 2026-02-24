# Supabase Google OAuth Implementation Guide

## Overview

I've implemented complete Google OAuth authentication using Supabase for your Next.js blog application. This includes authentication flow, protected routes, user dashboard, and comprehensive setup instructions.

## What Was Implemented

### 1. **Authentication Core** 
- **SupabaseProvider** ([src/components/SupabaseProvider.tsx](src/components/SupabaseProvider.tsx)) - Complete auth context provider with:
  - Google OAuth login/sign-out
  - Email/password authentication
  - Password reset
  - Session management
  - Automatic token refresh

### 2. **OAuth Callback Handler**
- **Route Handler** ([src/app/auth/callback/route.ts](src/app/auth/callback/route.ts)) - Handles OAuth redirects from Supabase:
  - Exchanges authorization code for session
  - Error handling
  - Secure token management

### 3. **Login Page**
- **Dedicated Login Page** ([src/app/login/page.tsx](src/app/login/page.tsx)) - Professional authentication UI with:
  - Google OAuth button
  - Email/password login and signup
  - Real-time error/success messages
  - Redirect to dashboard on success
  - Auto-redirect if already logged in

### 4. **Protected Routes**
- **ProtectedRoute Component** ([src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx)) - Wrapper for authenticated pages:
  - Automatic redirect to login if not authenticated
  - Role-based access control support
  - Loading states
  - Custom fallback UI

### 5. **User Dashboard**
- **Dashboard Page** ([src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)) - User profile and account management:
  - Display user information
  - Quick access to other sections
  - Sign out functionality
  - Protected with ProtectedRoute

### 6. **Authentication Utilities**
- **Auth Utils** ([src/lib/authUtils.ts](src/lib/authUtils.ts)) - Helper functions:
  - `isAuthenticated()` - Check if user is logged in
  - `getUserEmail()` - Get user email
  - `getUserRole()` - Get user role
  - `hasRole()` - Check specific role
  - `isAdmin()` - Check if user is admin
  - `formatUserDisplay()` - Format user display name

### 7. **Updated Components**
- **Layout** ([src/app/layout.tsx](src/app/layout.tsx)) - Wrapped with AuthProvider for global auth context
- **LoginButton** ([src/components/LoginButton.tsx](src/components/LoginButton.tsx)) - Updated to use dedicated login page

## Setup Instructions

### Step 1: Environment Variables

Create `.env.local` in the root directory with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Other configurations
NODE_ENV=development
```

Get these values from:
- **Supabase URL & Anon Key**: Settings → API in your Supabase dashboard
- **Service Role Key**: Settings → API → Service Role Key (keep this secret!)

### Step 2: Configure Google OAuth in Supabase

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)
   - `https://your-project.supabase.co/auth/v1/callback` (Supabase callback)
7. Copy **Client ID** and **Client Secret**
8. Go to your Supabase dashboard → **Authentication** → **Providers**
9. Enable **Google** and paste your credentials

### Step 3: Database Setup (Optional)

Create a users table to extend auth data:

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### Step 4: Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and click the n button to test!

## Usage Examples

### Access User Session in Any Component

```tsx
import { useAuth } from '@/components/SupabaseProvider';

export default function MyComponent() {
  const { session, signOut } = useAuth();

  if (!session) return <p>Not logged in</p>;

  return (
    <div>
      <p>Welcome, {session.user.email}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}
```

### Protect a Page with ProtectedRoute

```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <h1>Admin Dashboard</h1>
      <p>Only admins can see this</p>
    </ProtectedRoute>
  );
}
```

### Check User Role

```tsx
import { useAuth } from '@/components/SupabaseProvider';
import { hasRole, formatUserDisplay } from '@/lib/authUtils';

export default function RoleCheck() {
  const { session } = useAuth();

  if (!session) return null;

  return (
    <>
      <p>Hello, {formatUserDisplay(session)}</p>
      {hasRole(session, 'admin') && <p>You are an admin!</p>}
    </>
  );
}
```

### Use Auth Utilities

```tsx
import {
  isAuthenticated,
  getUserEmail,
  getUserRole,
  isAdmin,
  formatUserDisplay
} from '@/lib/authUtils';

// In your component
const { session } = useAuth();

if (isAuthenticated(session)) {
  console.log(getUserEmail(session)); // user@example.com
  console.log(getUserRole(session));  // 'user' or 'admin'
  console.log(isAdmin(session));      // true/false
  console.log(formatUserDisplay(session)); // Formatted name
}
```

## Available Routes

- **`/login`** - Login/signup page with Google OAuth and email options
- **`/auth/callback`** - OAuth callback handler (automatic, no direct access needed)
- **`/dashboard`** - User profile dashboard (protected route)
- **`/`** - Home page with n button in navbar

## File Structure

```
src/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts          # OAuth callback handler
│   ├── login/
│   │   └── page.tsx              # Login page
│   ├── dashboard/
│   │   └── page.tsx              # User dashboard
│   └── layout.tsx                # Updated with AuthProvider
├── components/
│   ├── SupabaseProvider.tsx       # Auth context provider
│   ├── LoginButton.tsx            # Updated login button
│   └── ProtectedRoute.tsx         # Protected route wrapper
└── lib/
    └── authUtils.ts              # Auth helper functions
```

## Key Features

✅ **Google OAuth** - One-click Google login  
✅ **Email/Password Auth** - Traditional email authentication  
✅ **Protected Routes** - Guard pages with authentication  
✅ **Role-Based Access** - Admin and user roles support  
✅ **Session Management** - Automatic token refresh  
✅ **Error Handling** - Comprehensive error messages  
✅ **Type-Safe** - Full TypeScript support  
✅ **Responsive UI** - Mobile-friendly design  

## Troubleshooting

### "Supabase configuration is missing"
- Ensure `.env.local` file exists with correct values
- Restart dev server after updating environment variables
- Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set

### OAuth redirect loop
- Verify redirect URI in Google Cloud Console matches your app
- Check that Google provider is enabled in Supabase
- Clear browser cookies and try again

### Session not persisting
- Update `@supabase/ssr` package: `npm install @supabase/ssr@latest`
- Check browser LocalStorage for Supabase session token
- Verify cookies are not blocked

### Can't sign up with email
- Check email verification settings in Supabase
- Verify email exists in auth users table
- Check Supabase logs for auth errors

## Next Steps

1. **Create Admin Panel** - Protect `/admin` route with role check
2. **Database Triggers** - Create Supabase triggers for new users
3. **User Profile Updates** - Allow users to edit their profile
4. **Two-Factor Authentication** - Add 2FA for security
5. **Social Login Expansion** - Add GitHub, Twitter, etc.

## Documentation

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Next.js Authentication](https://nextjs.org/docs/pages/building-your-application/authentication)

## Support

For detailed setup instructions, see [AUTH_SETUP.md](AUTH_SETUP.md) in the project root.

---

**Implementation Complete!** 🎉

Your authentication system is ready to use. Visit `/login` to test the Google OAuth flow!
