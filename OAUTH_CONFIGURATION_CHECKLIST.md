# 📋 Google OAuth Configuration Checklist

## Pre-Implementation Checklist
- [x] Node.js and npm installed
- [x] Next.js project set up
- [x] Supabase account created
- [x] Dependencies already installed (@supabase/supabase-js, @supabase/ssr)

## Implementation Checklist (Already Done! ✅)

### Code Implementation
- [x] OAuth callback route handler created (`/src/app/auth/callback/route.ts`)
- [x] Login page with OAuth UI created (`/src/app/login/page.tsx`)
- [x] User dashboard page created (`/src/app/dashboard/page.tsx`)
- [x] ProtectedRoute component created (`/src/components/ProtectedRoute.tsx`)
- [x] Auth utilities created (`/src/lib/authUtils.ts`)
- [x] Layout updated with AuthProvider (`/src/app/layout.tsx`)
- [x] LoginButton component updated (`/src/components/LoginButton.tsx`)
- [x] SupabaseProvider already fully configured (`/src/components/SupabaseProvider.tsx`)

### Documentation
- [x] Quick reference guide created (`OAUTH_QUICK_REFERENCE.md`)
- [x] Detailed setup guide created (`AUTH_SETUP.md`)
- [x] Implementation guide created (`AUTHENTICATION_IMPLEMENTATION.md`)
- [x] Summary document created (`OAUTH_IMPLEMENTATION_SUMMARY.md`)

## Configuration Checklist (Your Turn!)

### Google Cloud Console Setup
- [ ] Go to https://console.cloud.google.com/
- [ ] Create a new project or select existing one
- [ ] Enable Google+ API
- [ ] Go to Credentials → Create OAuth 2.0 Client ID
- [ ] Select "Web application"
- [ ] Add Authorized JavaScript origins:
  - [ ] `http://localhost:3000`
  - [ ] `https://yourdomain.com`
- [ ] Add Authorized redirect URIs:
  - [ ] `http://localhost:3000/auth/callback`
  - [ ] `https://yourdomain.com/auth/callback`
  - [ ] `https://your-project.supabase.co/auth/v1/callback`
- [ ] Copy Client ID
- [ ] Copy Client Secret

### Supabase Configuration
- [ ] Go to https://supabase.com/dashboard
- [ ] Select your project
- [ ] Navigate to Authentication → Providers
- [ ] Find Google and click Enable
- [ ] Paste Client ID from Google Cloud Console
- [ ] Paste Client Secret from Google Cloud Console
- [ ] Click Save

### Environment Variables Setup
- [ ] Create `.env.local` file in project root
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` (from Supabase Settings → API)
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase Settings → API)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Settings → API → Service Role)
- [ ] Add `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- [ ] Do NOT commit `.env.local` to git!

### Database Setup (Optional but Recommended)
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Create `users` table (see AUTH_SETUP.md for SQL)
- [ ] Set up Row Level Security policies
- [ ] Create indexes for better performance

### Testing
- [ ] Start dev server: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Click "n" button
- [ ] Click "n with Google"
- [ ] n with your Google account
- [ ] Verify redirected to home page and logged in
- [ ] Click username to go to `/dashboard`
- [ ] Verify dashboard shows your information
- [ ] Click "Sign Out" button
- [ ] Verify logged out and redirected

### Production Preparation
- [ ] Update Google Cloud Console redirect URIs for production domain
- [ ] Update Supabase Google provider redirect URIs
- [ ] Set up production environment variables in deployment platform
- [ ] Test OAuth flow on production domain
- [ ] Enable email verification (optional)
- [ ] Set up RLS policies on database tables
- [ ] Configure password recovery email template (optional)

## Common Tasks After Setup

### Adding Admin Features
```tsx
// Use in components to check admin status
import { isAdmin } from '@/lib/authUtils';

const { session } = useAuth();
if (isAdmin(session)) {
  // Show admin features
}
```

### Checking User Authentication
```tsx
import { isAuthenticated } from '@/lib/authUtils';

const { session } = useAuth();
if (!isAuthenticated(session)) {
  return <Redirect to="/login" />;
}
```

### Getting User Information
```tsx
import { 
  getUserEmail, 
  getUserRole, 
  formatUserDisplay 
} from '@/lib/authUtils';

const { session } = useAuth();
const email = getUserEmail(session);
const role = getUserRole(session);
const name = formatUserDisplay(session);
```

## Troubleshooting Checklist

If something doesn't work:

### OAuth not starting
- [ ] Verify Google credentials are correct
- [ ] Check that Google provider is enabled in Supabase
- [ ] Check browser console for error messages
- [ ] Clear browser cookies and try again

### Redirect URI mismatch error
- [ ] Verify `NEXT_PUBLIC_BASE_URL` matches your domain
- [ ] Check Google Cloud Console redirect URIs include callback path
- [ ] Check Supabase Google provider redirect URIs
- [ ] Verify URL doesn't have trailing slash

### Session not persisting
- [ ] Check `.env.local` has correct Supabase URL and keys
- [ ] Verify browser allows LocalStorage
- [ ] Check browser console for errors
- [ ] Restart dev server after changing environment variables

### Protected routes not working
- [ ] Verify ProtectedRoute is wrapping the component
- [ ] Check AuthProvider is in layout.tsx
- [ ] Verify `@supabase/ssr` is installed and up to date
- [ ] Check browser console for loading/auth state logs

### "Supabase configuration is missing"
- [ ] Create `.env.local` with required variables
- [ ] Ensure no typos in variable names
- [ ] Restart dev server
- [ ] Verify variables are exported (NEXT_PUBLIC_ prefix for client)

## Files Reference

### Routes
- `/login` - Login page
- `/auth/callback` - OAuth callback (internal)
- `/dashboard` - User profile (protected)

### Components
- `SupabaseProvider` - Auth context
- `ProtectedRoute` - Route protection wrapper
- `LoginButton` - Updated navbar button

### Utilities
- `authUtils.ts` - Auth helper functions

### Documentation
- `AUTH_SETUP.md` - Step-by-step setup
- `OAUTH_QUICK_REFERENCE.md` - Quick reference
- `AUTHENTICATION_IMPLEMENTATION.md` - Technical details
- `OAUTH_IMPLEMENTATION_SUMMARY.md` - Overview

## Support Resources

- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Google OAuth Guide**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Next.js Auth**: https://nextjs.org/docs/pages/building-your-application/authentication

---

**Ready to start?** ✅

1. Follow the "Configuration Checklist" above
2. Test with the "Testing" section
3. If issues arise, check "Troubleshooting Checklist"
4. Deploy to production following "Production Preparation"

Good luck! 🚀
