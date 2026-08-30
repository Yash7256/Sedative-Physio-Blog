import { useEffect, useState } from "react"
import { Dialog } from "radix-ui"
import { X } from "lucide-react"
import { LoginForm } from "./LoginForm"
import { RegisterForm } from "./RegisterForm"

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")

  // Reset to login tab whenever the modal opens
  useEffect(() => {
    if (open) {
      setActiveTab("login")
    }
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-canvas p-8 shadow-2xl">
          {/* Visually hidden title for accessibility */}
          <Dialog.Title className="sr-only">Authentication</Dialog.Title>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid size-7 place-items-center rounded text-slate hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X size={18} />
          </button>

          {/* Tab buttons */}
          <div className="flex gap-0 border-b border-black/10 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={
                activeTab === "login"
                  ? "mr-6 pb-3 text-sm font-medium text-ink border-b-2 border-ink -mb-px"
                  : "mr-6 pb-3 text-sm text-slate hover:text-ink transition-colors"
              }
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={
                activeTab === "register"
                  ? "mr-6 pb-3 text-sm font-medium text-ink border-b-2 border-ink -mb-px"
                  : "mr-6 pb-3 text-sm text-slate hover:text-ink transition-colors"
              }
            >
              Register
            </button>
          </div>

          {/* Active form */}
          {activeTab === "login" ? (
            <LoginForm
              onSuccess={onClose}
              onSwitchToRegister={() => setActiveTab("register")}
            />
          ) : (
            <RegisterForm
              onSuccess={onClose}
              onSwitchToLogin={() => setActiveTab("login")}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
