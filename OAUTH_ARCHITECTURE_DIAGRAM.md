# 🔐 Google OAuth Architecture & Data Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR NEXT.JS APP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐        ┌──────────────────────────────┐  │
│  │  User Browser    │        │   Next.js Frontend           │  │
│  │  (Localhost)     │◄──────►│  ┌────────────────────────┐  │  │
│  │                  │        │  │ SupabaseProvider       │  │  │
│  │ Session Storage  │        │  │ (Auth Context)         │  │  │
│  │ (LocalStorage)   │        │  └────────────────────────┘  │  │
│  └──────────────────┘        │                              │  │
│           ▲                   │  ┌────────────────────────┐  │  │
│           │                   │  │ Login Page (/login)    │  │  │
│           │                   │  │ - Google Button        │  │  │
│           │                   │  │ - Email/Password       │  │  │
│           │                   │  └────────────────────────┘  │  │
│           │                   │                              │  │
│           │                   │  ┌────────────────────────┐  │  │
│           │                   │  │ Dashboard (/dashboard) │  │  │
│           │                   │  │ - User Profile         │  │  │
│           │                   │  │ - Protected Route      │  │  │
│           │                   │  └────────────────────────┘  │  │
│           │                   │                              │  │
│           │                   │  ┌────────────────────────┐  │  │
│           │                   │  │ Auth Callback Route    │  │  │
│           │                   │  │ (/auth/callback)       │  │  │
│           └───────────────────┼──┤ - Code Exchange        │  │  │
│                               │  │ - Session Creation     │  │  │
│                               │  └────────────────────────┘  │  │
│                               └──────────────────────────────┘  │
│                                              ▲                   │
└──────────────────────────────────────────────┼───────────────────┘
                                               │
                    ┌──────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Supabase Auth       │
         │  ┌────────────────┐  │
         │  │ Auth Endpoint  │  │
         │  └────────────────┘  │
         │  ┌────────────────┐  │
         │  │ Token Manager  │  │
         │  └────────────────┘  │
         │  ┌────────────────┐  │
         │  │ Session Store  │  │
         │  └────────────────┘  │
         └──────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Google   │   │ Email    │   │ Database │
│ OAuth    │   │ Auth     │   │ Users    │
└──────────┘   └──────────┘   └──────────┘
```

## OAuth 2.0 Flow Sequence

```
User                    App                 Supabase              Google
│                       │                      │                     │
├──────n────────►│                      │                     │
│                       │                      │                     │
│                       ├─────Redirect to Auth────────────►│         │
│                       │                      │             │       │
│                       │                      │           Google    │
│                       │                      │           Login      │
│                       │                      │             │       │
│                       │                      │◄──Auth Code──│       │
│                       │◄────Redirect with Code────────────────────┤
│                       │                      │                     │
│                       ├──Exchange Code──────►│                     │
│                       │                      │                     │
│                       │◄──Session Token──────┤                     │
│                       │                      │                     │
│  Save Session        │                      │                     │
│◄──Redirect Home──────┤                      │                     │
│                       │                      │                     │
```

## Component Architecture

```
RootLayout
│
├── AuthProvider (SupabaseProvider)
│   │
│   ├── ChatProvider
│   │   │
│   │   ├── StickyNavbar
│   │   │   └── LoginButton
│   │   │       ├── [Not Authenticated] → Link to /login
│   │   │       └── [Authenticated] → Display User + Sign Out
│   │   │
│   │   ├── LoadingWrapper
│   │   │   ├── Page Routes
│   │   │   │   ├── / (Home)
│   │   │   │   ├── /login (Public)
│   │   │   │   ├── /dashboard (Protected)
│   │   │   │   ├── /admin (Can be Protected)
│   │   │   │   └── /auth/callback (Internal)
│   │   │   │
│   │   │   └── Footer
│   │   │
│   └── (Context available to all children via useAuth())
│
└── Session State
    ├── Persists in LocalStorage
    ├── Auto-refreshes with Supabase SSR
    └── Available to all components
```

## Data Flow: Authentication

```
1. USER INITIATES LOGIN
   ┌──────────────────────┐
   │ User visits /login   │
   └──────────────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Checks useAuth()     │
   │ - If authenticated   │
   │   → Redirect to home │
   └──────────────────────┘
            │
            ▼

2. USER CLICKS GOOGLE BUTTON
   ┌──────────────────────────────────────┐
   │ signInWithGoogle() called            │
   │ - Opens Google OAuth URL             │
   │ - Includes redirect_uri parameter    │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ Redirected to Google Login           │
   │ - User signs in with Google          │
   │ - Grants permission to app           │
   └──────────────────────────────────────┘
            │
            ▼

3. CALLBACK RECEIVED
   ┌──────────────────────────────────────┐
   │ /auth/callback?code=... received     │
   │ - Route handler extracts code        │
   │ - Exchanges code for session token   │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ Session Created in Supabase          │
   │ - Access token issued                │
   │ - Refresh token issued               │
   │ - Session duration set               │
   └──────────────────────────────────────┘
            │
            ▼

4. SESSION STORED LOCALLY
   ┌──────────────────────────────────────┐
   │ Browser LocalStorage Updated         │
   │ - Session data stored                │
   │ - Tokens secured by Supabase SSR     │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ AuthProvider Updates Context         │
   │ - session state updated              │
   │ - All components notified            │
   │ - UI re-renders with user info       │
   └──────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ User Redirected to Home              │
   │ - Navbar shows user name             │
   │ - Can access protected routes        │
   │ - Session persists on page reload    │
   └──────────────────────────────────────┘
```

## Protected Route Flow

```
User Visits Protected Page (/dashboard)
        │
        ▼
┌──────────────────────┐
│ ProtectedRoute Wrap  │
└──────────────────────┘
        │
        ├─ isLoading? ──YES──► Show Loading Spinner
        │                      │
        │                      └─ Wait for auth check
        │
        └─ NO
            │
            ├─ Has Session?
            │   │
            │   ├─ NO  ──► Redirect to /login
            │   │
            │   └─ YES
            │       │
            │       ├─ Required Role?
            │       │   │
            │       │   ├─ YES ──┐
            │       │   │        │
            │       │   │        ├─ Check user role
            │       │   │        │
            │       │   │        ├─ Role matches?
            │       │   │        │   │
            │       │   │        │   ├─ YES ──► Render Page ✓
            │       │   │        │   │
            │       │   │        │   └─ NO ──► Show Access Denied
            │       │   │        │
            │       │   └─ NO ───┘
            │       │
            │       └─ Render Protected Content ✓
            │
```

## State Management: Session Object

```
Session = {
  user: {
    id: "uuid",
    email: "user@example.com",
    user_metadata: {
      full_name: "John Doe",
      avatar_url: "https://...",
      role: "admin",  // Custom metadata
      ...other fields
    },
    aud: "authenticated",
    created_at: "2024-02-24T...",
    ...
  },
  expires_at: 1708970400,
  expires_in: 3600,
  ...
}

null  // When not authenticated
```

## Key Interactions

### LoginButton Component
```
LoginButton
│
├─ NOT AUTHENTICATED
│   └─ Display: "n" button
│       └─ Redirects to /login
│
└─ AUTHENTICATED
    └─ Display: [User Name] [Sign Out]
        ├─ Click name → Go to /dashboard
        └─ Click Sign Out → Clear session
```

### useAuth Hook
```
useAuth()
│
├─ Provides: session state
├─ Provides: isLoading flag
├─ Provides: signInWithGoogle()
├─ Provides: signInWithEmail()
├─ Provides: signUpWithEmail()
├─ Provides: signOut()
└─ Provides: resetPassword()
```

### Auth Utilities
```
authUtils.ts
│
├─ isAuthenticated(session) → boolean
├─ getUserEmail(session) → string
├─ getUserRole(session) → string
├─ hasRole(session, role) → boolean
├─ isAdmin(session) → boolean
├─ getUserName(session) → string
├─ getUserAvatar(session) → string
└─ formatUserDisplay(session) → string
```

## Error Handling Flow

```
OAuth Error
    │
    ├─ Error from Google?
    │   └─ Redirect to /login?error=error_code
    │
    ├─ Code exchange failed?
    │   └─ Redirect to /login?error=exchange_failed
    │
    └─ Network error?
        └─ Show alert, let user retry
```

## Security Measures

```
✓ Access Token
  └─ Short-lived (expires in ~1 hour)
  └─ Sent with each request
  └─ Validated by Supabase

✓ Refresh Token
  └─ Long-lived (used to get new access tokens)
  └─ Securely stored via Supabase SSR
  └─ Never exposed to frontend directly

✓ Environment Variables
  └─ NEXT_PUBLIC_* = Safe for client
  └─ Service Role Key = Server-only (hidden)
  └─ Never committed to git

✓ Row Level Security (RLS)
  └─ Database policies check user ID
  └─ Users can only access their own data
  └─ Server-side enforcement

✓ Protected Routes
  └─ Client-side validation
  └─ Server-side redirect
  └─ Role checking
```

---

This diagram shows the complete architecture and flow of your Google OAuth implementation!
