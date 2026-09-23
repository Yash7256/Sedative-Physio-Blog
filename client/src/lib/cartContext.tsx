import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export interface CartItem {
  id: string
  title: string
  slug: string
  price: number | undefined
  isFree: boolean
  thumbnail: string | null
  level: string
  language: string
}

interface CartContextValue {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  isInCart: (id: string) => boolean
  clearCart: () => void
  total: number
}

const CART_STORAGE_KEY = "sedative_physio_cart"

function loadStoredCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart)

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore storage quota or disabled storage errors
    }
  }, [items])

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => (prev.find((i) => i.id === item.id) ? prev : [...prev, item]))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const isInCart = useCallback((id: string) => items.some((i) => i.id === id), [items])

  const clearCart = useCallback(() => {
    setItems([])
    try {
      localStorage.removeItem(CART_STORAGE_KEY)
    } catch {
      // Ignore
    }
  }, [])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (item.isFree ? 0 : (item.price ?? 0)), 0),
    [items],
  )

  const value = useMemo(
    () => ({ items, addItem, removeItem, isInCart, clearCart, total }),
    [items, addItem, removeItem, isInCart, clearCart, total],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>")
  return ctx
}
