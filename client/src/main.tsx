import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { CartProvider } from './lib/cartContext.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { createQueryClient } from './lib/queryClient.ts'
import './index.css'
import App from './App.tsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const queryClient = createQueryClient()

// The QueryClient wraps every route so resource queries share one cache across
// navigation. ClerkProvider sits inside it and outside the auth context; its
// `publishableKey` is passed explicitly rather than relying on Clerk's own env
// lookup, which expects a different variable name and would silently fall back
// to a broken default here.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClerkProvider publishableKey={publishableKey}>
        <BrowserRouter>
          <CartProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </CartProvider>
        </BrowserRouter>
      </ClerkProvider>
    </QueryClientProvider>
  </StrictMode>,
)
