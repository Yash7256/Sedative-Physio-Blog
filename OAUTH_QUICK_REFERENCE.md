# Google OAuth Authentication - Quick Reference

## 🚀 Quick Start

### 1. Set Environment Variables
Create `.env.local` in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Configure Google OAuth
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create OAuth 2.0 credentials
- Add redirect URIs:
  - `http://localhost:3000/auth/callback` (dev)
  - `https://yourdomain.com/auth/callback` (prod)
  - `https://your-project.supabase.co/auth/v1/callback` (Supabase)

### 3. Enable Google in Supabase
- Dashboard → Authentication → Providers → Google
- Paste Client ID and Secret

### 4. Run Development Server
```bash
npm run dev
```

## 📖 Usage Patterns

### Check if User is Logged In
```tsx
import { useAuth } from '@/components/SupabaseProvider';

const { session, isLoading } = useAuth();

if (!isLoading && session) {
  // User is logged in
}
```

### Protect a Page
```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <h1>Admin Only</h1>
    </ProtectedRoute>
  );
}
```

### Sign Out User
```tsx
const { signOut } = useAuth();

const handleLogout = async () => {
  await signOut();
};
```

### Get User Email
```tsx
import { getUserEmail } from '@/lib/authUtils';

const { session } = useAuth();
const email = getUserEmail(session); // "user@example.com"
```

### Check User Role
```tsx
import { isAdmin, hasRole } from '@/lib/authUtils';

const { session } = useAuth();
if (isAdmin(session)) {
  // Show admin features
}
```

## 🔗 Important Routes

| Route | Purpose |
|-------|---------|
| `/login` | Login page with OAuth |
| `/auth/callback` | OAuth redirect handler |
| `/dashboard` | User profile (protected) |

## 🛠️ Helpful Functions

```tsx
// From SupabaseProvider
const { session, isLoading, signInWithGoogle, signOut } = useAuth();

// From authUtils
import {
  isAuthenticated,       // Check if logged in
  getUserEmail,          // Get email
  getUserRole,           // Get role ('user', 'admin', etc)
  hasRole,               // Check specific role
  isAdmin,               // Check if admin
  formatUserDisplay,     // Get display name
  getUserAvatar          // Get avatar URL
} from '@/lib/authUtils';
```

## 📁 Key Files

- `src/components/SupabaseProvider.tsx` - Auth context
- `src/app/auth/callback/route.ts` - OAuth callback
- `src/app/login/page.tsx` - Login page
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/app/dashboard/page.tsx` - User dashboard
- `src/lib/authUtils.ts` - Helper functions

## ⚙️ Configuration

**Session Management**
- Sessions stored in browser LocalStorage
- Auto-refresh with Supabase SSR
- Token persists across page reloads

**OAuth Flow**
1. User clicks "n with Google"
2. Redirected to Google login
3. Google redirects to `/auth/callback`
4. Session set automatically
5. Redirected to home page

## 🐛 Debugging

**Check Session in Console**
```tsx
const { session } = useAuth();
console.log(session);
```

**Test Protected Route**
Visit `/dashboard` → should redirect to `/login` if not authenticated

**Check Environment Variables**
```bash
# In browser console
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
```

## 📚 See Also

- **Full Setup Guide**: [AUTH_SETUP.md](AUTH_SETUP.md)
- **Implementation Details**: [AUTHENTICATION_IMPLEMENTATION.md](AUTHENTICATION_IMPLEMENTATION.md)
- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Google OAuth**: https://supabase.com/docs/guides/auth/social-login/auth-google

---

**Questions?** Check the full documentation files listed above!
