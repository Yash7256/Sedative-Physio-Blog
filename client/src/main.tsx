import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { CartProvider } from './lib/cartContext.tsx'
import { AuthProvider } from './lib/auth.tsx'
import './index.css'
import App from './App.tsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// ClerkProvider is mounted outermost so every route — and the auth context that
// reads the session — sits inside it. `publishableKey` is passed explicitly
// rather than relying on Clerk's own env lookup, which expects a different
// variable name and would silently fall back to a broken default here.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <BrowserRouter>
        <CartProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </CartProvider>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
