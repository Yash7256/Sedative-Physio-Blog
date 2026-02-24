# 🔐 PKCE Authentication Fix Guide

## Problem

You were getting this error:
```
PKCE code verifier not found in storage. This can happen if the auth flow was 
initiated in a different browser or device, or if the storage was cleared. 
For SSR frameworks (Next.js, SvelteKit, etc.), use @supabase/ssr on both 
the server and client to store the code verifier in cookies.
```

## Root Cause

PKCE (Proof Key for Code Exchange) is a security mechanism for OAuth 2.0 flows. During the authentication process:
1. A **code verifier** is generated and stored locally
2. A **code challenge** is sent to Google
3. When Google redirects back with a code, the **code verifier** is used to prove the request is legitimate

The error occurred because the code verifier wasn't being stored properly in the browser.

## Solution Applied

### 1. Updated SupabaseProvider.tsx

Added PKCE flow type configuration to the Supabase client:

```tsx
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',  // ← Added this
    },
  }
);
```

And updated the Google sign-in to remove `skipBrowserRedirect`:

```tsx
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    // Removed: skipBrowserRedirect: true
  }
});
```

### 2. Updated Auth Callback Page

Updated `/src/app/auth/callback/page.tsx` to use PKCE config:

```tsx
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',  // ← Added this
    },
  }
);
```

## How PKCE Works in Your App

```
1. User clicks "n with Google"
   ↓
2. Browser generates random code_verifier
3. Code verifier is stored in browser storage (handled by @supabase/ssr)
4. Code challenge is sent to Google
   ↓
5. User logs in with Google
   ↓
6. Google redirects to /auth/callback?code=...
   ↓
7. Callback page retrieves code_verifier from storage
8. Uses code_verifier to verify the authorization code
9. Session is created
   ↓
10. User is logged in! ✓
```

## Testing the Fix

1. **Clear browser cookies and storage** (very important!):
   - Open DevTools → Application → Clear site data
   - Or: Settings → Privacy & Security → Clear browsing data

2. **Restart dev server**:
   ```bash
   npm run dev
   ```

3. **Test the OAuth flow**:
   - Go to `http://localhost:3000`
   - Click "n"
   - Click "n with Google"
   - You should be redirected to Google login
   - After signing in, you should be redirected back to the app (logged in)

## Key Points

✅ **PKCE is enabled** - The Supabase client now uses PKCE flow  
✅ **Code verifier storage** - Supabase SSR handles storing/retrieving it  
✅ **No manual cookie handling needed** - The `@supabase/ssr` package does it automatically  
✅ **Secure OAuth flow** - PKCE prevents authorization code interception attacks  

## Environment Check

Make sure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## If You Still Get Errors

### "PKCE code verifier not found"
- Clear all browser cookies/storage
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Restart dev server
- Try the OAuth flow again

### "Storage quota exceeded"
- This shouldn't happen with PKCE
- Clear browser data and try again

### "Invalid redirect URI"
- Check that Google Cloud Console has `http://localhost:3000` as authorized redirect URI (not with `/auth/callback`)
- Check that Supabase has the correct Google credentials

## Files Modified

1. **[src/components/SupabaseProvider.tsx](src/components/SupabaseProvider.tsx)**
   - Added PKCE flowType configuration
   - Removed skipBrowserRedirect from OAuth call

2. **[src/app/auth/callback/page.tsx](src/app/auth/callback/page.tsx)**
   - Added PKCE flowType configuration
   - Enhanced error handling

## Additional Resources

- [PKCE Explanation](https://datatracker.ietf.org/doc/html/rfc7636)
- [Supabase Auth with PKCE](https://supabase.com/docs/guides/auth/authentication-flow)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/rfc6749)

---

**The authentication flow should now work smoothly!** 🚀

If you continue to experience issues, check the browser console for detailed error messages and refer to the [AUTH_SETUP.md](AUTH_SETUP.md) guide.
