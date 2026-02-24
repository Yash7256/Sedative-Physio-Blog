# Supabase Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication with Supabase for this Next.js application.

## Prerequisites

1. A Supabase project created at [https://supabase.com](https://supabase.com)
2. A Google Cloud project with OAuth credentials configured
3. Node.js and npm installed locally

## Step 1: Create a Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (for local development)
   - `https://your-domain.com/auth/callback` (for production)
   - `https://your-project.supabase.co/auth/v1/callback` (Supabase callback)
7. Copy the **Client ID** and **Client Secret**

## Step 2: Configure Supabase with Google OAuth

1. Go to your Supabase dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **Enable**
4. Paste your Google Client ID and Client Secret
5. Click **Save**

## Step 3: Set Up Environment Variables

1. Create a `.env.local` file in the project root (copy from `.env.local.example`)
2. Fill in the following variables from your Supabase project:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3. Get these values from **Settings** → **API** in your Supabase dashboard

## Step 4: Database Setup (Optional)

Create a users extension table to store additional user metadata:

```sql
-- Create users table for storing additional user information
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_users_email ON users(email);

-- Set up RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

Run this SQL in your Supabase SQL Editor.

## Step 5: Use Authentication in Your App

### Login with Google

Use the `LoginButton` component or call the authentication hook:

```tsx
import { useAuth } from '@/components/SupabaseProvider';

export default function MyComponent() {
  const { session, signInWithGoogle, signOut, isLoading } = useAuth();

  return (
    <div>
      {!session ? (
        <button onClick={signInWithGoogle} disabled={isLoading}>
          n with Google
        </button>
      ) : (
        <div>
          <p>Welcome, {session.user.email}</p>
          <button onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}
```

### Protect Routes

Use the `ProtectedRoute` component to guard pages that require authentication:

```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <div>This page is only visible to authenticated users</div>
    </ProtectedRoute>
  );
}
```

## Step 6: Testing

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)
3. Click the login button and select "n with Google"
4. You should be redirected to Google's login, then back to your app
5. Your session should be available via the `useAuth()` hook

## Deployment to Production

When deploying to production:

1. Update the Google OAuth redirect URIs to match your production domain
2. Update `NEXT_PUBLIC_BASE_URL` in your environment variables to your production URL
3. Update the Supabase authorized redirect URIs if needed
4. Test the OAuth flow on your production domain

## Troubleshooting

### "Supabase configuration is missing"
- Ensure `.env.local` file exists and has correct values
- Restart the development server after updating `.env.local`

### OAuth redirect fails
- Check that the redirect URI in Google Cloud Console matches your app's callback URL
- Verify that Supabase Google provider is enabled
- Check browser console for detailed error messages

### Session not persisting
- Clear browser cookies and try again
- Ensure `@supabase/ssr` version is up to date

### Users not being created
- Check Supabase auth logs in the dashboard
- Ensure email is verified if email verification is required
- Check RLS policies on the users table if you created one

## Available Auth Methods

The `useAuth()` hook provides:

- `session`: Current user session (null if not authenticated)
- `isLoading`: Whether auth is still loading
- `signInWithGoogle()`: n with Google OAuth
- `signInWithEmail(email, password)`: n with email/password
- `signUpWithEmail(email, password)`: Sign up with email/password
- `signOut()`: Sign out current user
- `resetPassword(email)`: Send password reset email

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/pages/building-your-application/authentication)
