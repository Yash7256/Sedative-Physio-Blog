# 🔧 OAuth PKCE Troubleshooting Guide

## Quick Checklist Before Testing

- [ ] Clear browser cookies and storage (DevTools → Application → Clear site data)
- [ ] Restart dev server (`npm run dev`)
- [ ] Check that `.env.local` has all required variables
- [ ] Verify Google Cloud Console has correct redirect URIs
- [ ] Verify Supabase has Google provider enabled

## Common Errors & Solutions

### ❌ "PKCE code verifier not found in storage"

**Cause:** Browser storage was cleared or auth flow was interrupted

**Solution:**
1. Clear all browser data:
   - Chrome: Settings → Privacy → Clear browsing data (select "Cookies and site data")
   - Firefox: Options → Privacy → Clear Data (select "Cookies" and "Site Data")
2. Close the browser tab with the error
3. Go back to `http://localhost:3000` in a fresh tab
4. Try logging in again

---

### ❌ "Invalid Origin: URIs must not contain a path or end with '/'"

**Cause:** Google OAuth redirect URI includes the full path instead of just the domain

**Solution:**
1. Go to Google Cloud Console
2. Edit OAuth 2.0 credentials
3. In "Authorized redirect URIs", ensure you have:
   - ✅ `http://localhost:3000` (correct)
   - ❌ Remove: `http://localhost:3000/auth/callback` (wrong)
   - ❌ Remove: `http://localhost:3000/` (ends with slash)

---

### ❌ "Google OAuth not redirecting"

**Cause:** Redirect URI mismatch or OAuth not properly configured

**Solution:**
1. Check Google Cloud Console:
   - Verify Client ID is correct in `.env.local`
   - Verify Client Secret is correct in `.env.local`
   - Verify redirect URI is exactly: `http://localhost:3000`

2. Check Supabase:
   - Go to Authentication → Providers → Google
   - Verify it's enabled (toggle is ON)
   - Paste correct Client ID
   - Paste correct Client Secret
   - Click Save

3. Restart dev server after any changes

---

### ❌ "Failed to fetch: CORS error"

**Cause:** Browser is blocking cross-origin request

**Solution:**
1. Check browser console (F12 → Console tab)
2. This usually means Supabase URL or credentials are wrong
3. Verify `.env.local` has correct values
4. Restart dev server

---

### ❌ "Error exchanging code for session"

**Cause:** Code exchange failed (PKCE verifier issue, invalid code, etc.)

**Solution:**
1. Check browser console for detailed error message
2. Try clearing storage and trying again
3. Verify Supabase URL and keys are correct
4. If error persists, check Supabase logs in dashboard

---

### ❌ "Session not persisting after login"

**Cause:** LocalStorage not being saved or SSR not configured properly

**Solution:**
1. Check browser allows LocalStorage:
   - F12 → Application → LocalStorage
   - Look for entries like `sb-*`
2. If empty, try logging in again
3. Check that page loads with `<AuthProvider>` wrapper (check [src/app/layout.tsx](src/app/layout.tsx))

---

## Debug Checklist

### In Browser Console

```javascript
// Check if Supabase config is available
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Check for auth session
// Go to /dashboard (protected route) and check if redirected to /login
```

### In DevTools

**Application → LocalStorage:**
- Look for keys starting with `sb-`
- Should contain session data when logged in

**Application → Cookies:**
- Check for cookies if SSR is being used
- Should have auth-related cookies

**Console:**
- Look for any red error messages
- Copy the error message and search in troubleshooting guide

### Check Files

Verify these files exist and have correct content:
- ✓ `src/components/SupabaseProvider.tsx` - Has PKCE config
- ✓ `src/app/auth/callback/page.tsx` - Has PKCE config
- ✓ `src/app/layout.tsx` - Has `<AuthProvider>`
- ✓ `.env.local` - Has all required variables

---

## Testing Steps

### 1. Test Environment Variables
```bash
# In browser console, verify these exist:
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. Test OAuth Page Load
```
1. Visit http://localhost:3000
2. Open browser console (F12)
3. Click "n"
4. Should navigate to /login page without errors
```

### 3. Test Google Button
```
1. On /login page, click "n with Google"
2. Should be redirected to Google login (accounts.google.com)
3. n with your Google account
4. Should be redirected back to /auth/callback
5. Should complete and redirect to home page
```

### 4. Test Protected Routes
```
1. After logging in, click on username in navbar
2. Should go to /dashboard
3. Should NOT redirect to /login (means you're authenticated)
```

### 5. Test Sign Out
```
1. On /dashboard, click "Sign Out"
2. Should redirect to home page
3. Navbar should show "n" button again
```

---

## Reset Everything (Nuclear Option)

If nothing works, do a complete reset:

1. **Clear all browser data:**
   ```
   DevTools → Application → Clear all site data
   ```

2. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Stop and restart dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

4. **Hard refresh browser:**
   ```
   Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   ```

5. **Try OAuth again**

---

## Still Stuck?

1. **Check these docs:**
   - [PKCE_FIX_GUIDE.md](PKCE_FIX_GUIDE.md) - Technical PKCE explanation
   - [AUTH_SETUP.md](AUTH_SETUP.md) - Complete setup steps
   - [OAUTH_QUICK_REFERENCE.md](OAUTH_QUICK_REFERENCE.md) - Quick reference

2. **Check Supabase logs:**
   - Dashboard → Logs → Auth
   - Look for your attempted login

3. **Check Google Cloud logs:**
   - Console → APIs & Services → Credentials
   - Look for recent OAuth requests

4. **Check browser console:**
   - F12 → Console tab
   - Copy exact error message
   - Search in this guide

---

## Key Points

✅ PKCE is now **enabled** in Supabase client  
✅ Code verifier is stored automatically by `@supabase/ssr`  
✅ No manual cookie handling needed  
✅ OAuth flow is secure against code interception  

---

**Need help?** Start with clearing browser data and restarting the dev server. That fixes 90% of PKCE issues!
