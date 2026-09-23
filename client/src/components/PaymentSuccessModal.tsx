import { Dialog } from "radix-ui"
import { CheckCircle2, GraduationCap, X, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { CartItem } from "../lib/cartContext"

interface PaymentSuccessModalProps {
  open: boolean
  onClose: () => void
  items: CartItem[]
  paymentId?: string | null
  orderId?: string | null
  isFree?: boolean
}

export function PaymentSuccessModal({
  open,
  onClose,
  items,
  paymentId,
  orderId,
  isFree,
}: PaymentSuccessModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-[#f4f4f2] p-6 text-[#111214] shadow-2xl animate-in zoom-in-95 sm:p-8">
          <div className="flex items-start justify-between">
            <div className="grid size-12 place-items-center rounded-full bg-[#22c55e]/15 text-[#22c55e]">
              <CheckCircle2 className="size-6" />
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="grid size-8 place-items-center rounded-full border border-black/10 text-[#686a6b] transition-colors hover:border-black/25 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5">
            <Dialog.Title className="text-xl font-bold tracking-[-.03em] sm:text-2xl">
              {isFree ? "Enrollment Successful!" : "Payment Successful!"}
            </Dialog.Title>
            <p className="mt-1 text-sm text-[#65676a]">
              {isFree
                ? "You have been successfully enrolled in your chosen course(s)."
                : "Thank you for your purchase. Your payment was verified and you now have full access."}
            </p>
          </div>

          {/* Reference IDs */}
          {(paymentId || orderId) && (
            <div className="mt-4 rounded-xl border border-black/10 bg-white/60 p-3 text-xs">
              {paymentId && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#8a8b8e]">Payment ID</span>
                  <span className="font-mono font-medium text-[#111214]">{paymentId}</span>
                </div>
              )}
              {orderId && (
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#8a8b8e]">Order ID</span>
                  <span className="font-mono font-medium text-[#111214]">{orderId}</span>
                </div>
              )}
            </div>
          )}

          {/* Enrolled Courses */}
          <div className="mt-5">
            <h4 className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8a8b8e]">
              Enrolled Courses ({items.length})
            </h4>
            <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-black/8 bg-white/70 p-2.5"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#111214] text-white">
                    <GraduationCap className="size-4 text-white/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#111214] sm:text-sm">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-[#717376]">
                      {item.level} · {item.language}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[9px] font-bold text-[#16a34a]">
                    ENROLLED
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/resources"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#111214] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-black/80"
            >
              Browse Library <ArrowRight className="size-4" />
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
