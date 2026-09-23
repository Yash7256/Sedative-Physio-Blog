import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth, useUser } from "@clerk/react"
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  FileText,
  Globe,
  GraduationCap,
  Loader2,
  PlayCircle,
  Rocket,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react"
import { useCart, type CartItem } from "../lib/cartContext"
import { AuthModal } from "../components/AuthModal"
import { PaymentSuccessModal } from "../components/PaymentSuccessModal"
import { SmartImage } from "../components/SmartImage"
import { loadRazorpayScript } from "../lib/razorpay"
import {
  fetchCourseDetail,
  type CourseDetail,
  type CourseLesson,
  type CourseSection,
  type LessonType,
} from "../lib/resources"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

/* ─── helpers ─────────────────────────────────────────────────── */

function formatPrice(paise: number | undefined, isFree: boolean): string {
  if (isFree || !paise) return "Free"
  const rupees = paise / 100
  return `₹${rupees.toFixed(Number.isInteger(rupees) ? 0 : 2)}`
}

function formatTotal(paise: number): string {
  if (paise === 0) return "₹0"
  const rupees = paise / 100
  return `₹${rupees.toFixed(Number.isInteger(rupees) ? 0 : 2)}`
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ""
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim()
  return `${minutes}m`
}

const lessonIcon: Record<LessonType, typeof BookOpen> = {
  VIDEO: PlayCircle,
  ARTICLE: FileText,
  QUIZ: BookOpen,
  PROJECT: Rocket,
}

/* ─── SyllabusRow ─────────────────────────────────────────────── */

function SyllabusRow({ section, index }: { section: CourseSection; index: number }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <div className="overflow-hidden rounded-[14px] border border-black/10 bg-white/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#111214] text-xs font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[-.02em]">{section.title}</p>
          <p className="text-[11px] text-[#8a8b8e]">{section.lessons.length} lessons</p>
        </div>
        <ChevronDown
          className={`size-3.5 text-[#8a8b8e] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="divide-y divide-black/5 border-t border-black/10">
          {section.lessons.map((lesson: CourseLesson) => {
            const Icon = lessonIcon[lesson.type]
            return (
              <li key={lesson.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <Icon className="size-3.5 shrink-0 text-[#8a8b8e]" />
                <span className="min-w-0 flex-1 truncate text-xs text-[#3c3e41]">{lesson.title}</span>
                {lesson.isPreview && (
                  <span className="shrink-0 rounded-full bg-[#1683f6]/10 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-[#1683f6]">
                    PREVIEW
                  </span>
                )}
                {lesson.duration && (
                  <span className="shrink-0 text-[11px] tabular-nums text-[#a0a1a3]">
                    {formatDuration(lesson.duration)}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ─── CourseDetails (lazy-fetches on first expand) ────────────── */

function CourseDetails({ slug, expanded }: { slug: string; expanded: boolean }) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded || fetched) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCourseDetail(slug)
      .then((data) => {
        if (!cancelled) {
          setCourse(data)
          setFetched(true)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load course details")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [expanded, slug, fetched])

  if (!expanded) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-[#8a8b8e]">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-xs">Loading course details…</span>
      </div>
    )
  }

  if (error || !course) {
    return <p className="py-4 text-xs text-[#8b4b42]">{error ?? "Could not load course details."}</p>
  }

  const lessonCount = course.sections.reduce((t, s) => t + s.lessons.length, 0)
  const totalMinutes = course.sections.reduce(
    (t, s) => t + s.lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
    0,
  )

  return (
    <div className="mt-4 space-y-5 pb-2">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: BarChart3, label: "Level", value: course.level },
          { icon: Globe, label: "Language", value: course.language },
          { icon: BookOpen, label: "Lessons", value: String(lessonCount) },
          { icon: Clock, label: "Duration", value: formatDuration(totalMinutes) || `${course.estimatedHours ?? 0}h` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-[12px] border border-black/10 bg-white/70 px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#8a8b8e]">
              <Icon className="size-3" /> {label}
            </div>
            <p className="mt-1 text-sm font-semibold tracking-[-.02em]">{value}</p>
          </div>
        ))}
      </div>

      {/* About */}
      {course.shortDescription && (
        <div className="rounded-[14px] border border-black/10 bg-white/70 px-4 py-4">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">About this Course</h4>
          <p className="text-sm leading-relaxed text-[#3c3e41]">{course.shortDescription}</p>
        </div>
      )}

      {/* What's included */}
      {course.highlights.length > 0 && (
        <div className="rounded-[14px] border border-black/10 bg-white/70 px-4 py-4">
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">What's Included</h4>
          <ul className="grid gap-2 sm:grid-cols-2">
            {course.highlights.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-[#3c3e41]">
                <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#1683f6]/10 text-[#1683f6]">
                  <Check className="size-2.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Syllabus */}
      {course.sections.length > 0 && (
        <div>
          <h4 className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">
            Course Syllabus — {course.sections.length} sections · {lessonCount} lessons
          </h4>
          <div className="space-y-2">
            {course.sections.map((section, i) => (
              <SyllabusRow key={section.id} section={section} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Instructor */}
      {course.tutor && (
        <div className="overflow-hidden rounded-[14px] border border-black/10 bg-white/70">
          <div className="border-b border-black/10 px-4 py-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a8b8e]">Your Instructor</h4>
          </div>
          <div className="flex items-start gap-4 px-4 py-4">
            {course.tutor.image ? (
              <SmartImage src={course.tutor.image} alt={course.tutor.name} className="size-14 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#e5e5e3] text-xl font-semibold text-[#77797b]">
                {course.tutor.name.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-serif text-base italic tracking-[.01em] text-[#0b0b0c]">{course.tutor.name}</p>
              {course.tutor.designation && (
                <p className="mt-0.5 text-xs text-[#6b6d70]">{course.tutor.designation}</p>
              )}
              {course.tutor.bio && (
                <p className="mt-2 text-xs leading-relaxed text-[#717376]">{course.tutor.bio}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── main Cart page ──────────────────────────────────────────── */

export function Cart() {
  const { isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const { items, removeItem, total, clearCart } = useCart()
  const paidItems = items.filter((i) => !i.isFree)
  const freeItems = items.filter((i) => i.isFree)

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({})
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([])
  const [successModalData, setSuccessModalData] = useState<{
    open: boolean
    items: CartItem[]
    paymentId?: string
    orderId?: string
    isFree?: boolean
  }>({ open: false, items: [] })

  const toggle = (id: string) =>
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }))

  // Seed state for newly added items; auto-open when cart drops to 1 item
  useEffect(() => {
    setExpandedMap((prev) => {
      const next = { ...prev }
      for (const item of items) {
        if (!(item.id in next)) {
          next[item.id] = items.length === 1
        }
      }
      if (items.length === 1) next[items[0].id] = true
      return next
    })
  }, [items])

  // Fetch user's existing enrollments to guard against duplicate purchases
  useEffect(() => {
    if (!isSignedIn) {
      setEnrolledCourseIds([])
      return
    }

    let cancelled = false
    getToken().then((token) => {
      fetch(`${API_BASE}/api/payments/my-enrollments`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((ids) => {
          if (!cancelled && Array.isArray(ids)) {
            setEnrolledCourseIds(ids)
          }
        })
        .catch(() => {})
    })

    return () => {
      cancelled = true
    }
  }, [isSignedIn, getToken])

  const duplicateEnrolledItems = items.filter((i) => enrolledCourseIds.includes(i.id))
  const hasDuplicateEnrollments = duplicateEnrolledItems.length > 0

  /* ── Checkout Handler ── */
  const handleCheckout = async () => {
    if (!isSignedIn) {
      setAuthModalOpen(true)
      return
    }

    if (hasDuplicateEnrollments) {
      setCheckoutError(
        `You already own ${duplicateEnrolledItems.map((i) => `"${i.title}"`).join(", ")}. Please remove before continuing.`,
      )
      return
    }

    setCheckoutError(null)
    setCheckingOut(true)

    try {
      const token = await getToken()
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      // ── Free Enrollment Flow ──
      if (total === 0) {
        const res = await fetch(`${API_BASE}/api/payments/free-enroll`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            courseIds: items.map((i) => i.id),
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Failed to complete free enrollment")
        }

        const enrolledItems = [...items]
        setEnrolledCourseIds((prev) => [...prev, ...items.map((i) => i.id)])
        clearCart()
        setSuccessModalData({
          open: true,
          items: enrolledItems,
          isFree: true,
        })
        return
      }

      // ── Paid Razorpay Flow ──
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay payment gateway. Please check your internet connection.")
      }

      // 1. Create order on backend (with duplicate purchase & pending reuse protection)
      const orderRes = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          courseIds: items.map((i) => i.id),
          userEmail: user?.primaryEmailAddress?.emailAddress,
          userName: user?.fullName,
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to create payment order")
      }

      const { orderId, amount, currency, keyId } = orderData
      const enrolledItems = [...items]

      // 2. Open Razorpay modal
      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency: currency || "INR",
        name: "Sedative Physio",
        description: `Course Enrollment (${items.length} ${items.length === 1 ? "course" : "courses"})`,
        image: "/bento4.png",
        order_id: orderId,
        handler: async (response) => {
          try {
            setCheckingOut(true)
            const verifyToken = await getToken()
            const verifyRes = await fetch(`${API_BASE}/api/payments/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(verifyToken ? { Authorization: `Bearer ${verifyToken}` } : {}),
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Payment verification failed")
            }

            setEnrolledCourseIds((prev) => [...prev, ...enrolledItems.map((i) => i.id)])
            clearCart()
            setSuccessModalData({
              open: true,
              items: enrolledItems,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              isFree: false,
            })
          } catch (verifyErr) {
            setCheckoutError(
              verifyErr instanceof Error ? verifyErr.message : "Payment verification failed",
            )
          } finally {
            setCheckingOut(false)
          }
        },
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        theme: {
          color: "#111214",
        },
        modal: {
          ondismiss: () => {
            setCheckingOut(false)
          },
        },
      })

      rzp.open()
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed")
      setCheckingOut(false)
    }
  }

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <div className="resources-page min-h-screen bg-[#f4f4f2] text-[#111214]">
        <main className="mx-auto max-w-[1280px] px-4 pb-20 pt-32 sm:px-5 lg:px-[52px]">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 grid size-20 place-items-center rounded-full bg-[#e9e9e7]">
              <ShoppingCart className="size-9 text-[#9a9b9e]" />
            </div>
            <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-[-.045em]">Your cart is empty</h1>
            <p className="mt-3 max-w-[400px] text-sm leading-relaxed text-[#65676a]">
              Browse our courses and add ones you're interested in. Your selections will appear here.
            </p>
            <Link
              to="/resources"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#111214] px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              <BookOpen className="size-4" /> Explore Courses
            </Link>
          </div>
        </main>

        <PaymentSuccessModal
          open={successModalData.open}
          onClose={() => setSuccessModalData({ open: false, items: [] })}
          items={successModalData.items}
          paymentId={successModalData.paymentId}
          orderId={successModalData.orderId}
          isFree={successModalData.isFree}
        />
      </div>
    )
  }

  return (
    <div className="resources-page min-h-screen bg-[#f4f4f2] text-[#111214]">
      <main className="mx-auto max-w-[1280px] px-4 pb-28 pt-28 sm:px-5 sm:pt-32 lg:px-[52px]">

        {/* Page header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            to="/resources"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-black/15 text-[#686a6b] transition-colors hover:border-black/30 hover:text-[#111214]"
            aria-label="Back to Resources"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold tracking-[-.045em]">Your Cart</h1>
            <p className="mt-0.5 text-sm text-[#65676a]">
              {items.length} {items.length === 1 ? "course" : "courses"} selected
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

          {/* ── Left: course cards + expandable details ── */}
          <section className="min-w-0 space-y-6">
            {items.map((item) => {
              const isExpanded = !!expandedMap[item.id]
              const isAlreadyEnrolled = enrolledCourseIds.includes(item.id)

              return (
                <div key={item.id}>
                  {/* Cart item card */}
                  <article
                    className={`overflow-hidden rounded-[18px] border bg-white/70 transition-colors ${
                      isAlreadyEnrolled ? "border-amber-300 ring-1 ring-amber-300/40" : "border-black/10"
                    }`}
                  >
                    <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                      {/* Thumbnail */}
                      <div className="relative aspect-[16/10] w-[120px] shrink-0 overflow-hidden rounded-xl bg-[#dedfdd] sm:w-[160px]">
                        {item.thumbnail ? (
                          <SmartImage src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center bg-[#111214]">
                            <GraduationCap className="size-8 text-white/30" />
                            <span className="mt-1.5 px-2 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40">
                              Course
                            </span>
                          </div>
                        )}
                        <span
                          className={`absolute right-1.5 top-1.5 rounded-full px-2 py-0.5 text-[8px] font-bold tracking-wide ${
                            isAlreadyEnrolled
                              ? "bg-amber-600 text-white"
                              : item.isFree
                              ? "bg-[#22c55e] text-white"
                              : "bg-[#111214]/90 text-white"
                          }`}
                        >
                          {isAlreadyEnrolled ? "Already Owned" : item.isFree ? "Free" : "Paid"}
                        </span>
                      </div>

                      {/* Text details */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div>
                              <h2 className="text-sm font-semibold leading-snug tracking-[-.025em] sm:text-base">
                                {item.title}
                              </h2>
                              {isAlreadyEnrolled && (
                                <p className="mt-0.5 text-xs font-medium text-amber-700">
                                  You are already enrolled in this course.
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              aria-label={`Remove ${item.title} from cart`}
                              className="grid size-8 shrink-0 place-items-center rounded-full border border-black/10 text-[#9a9b9e] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#77797b]">
                            <span className="inline-flex items-center gap-1">
                              <BarChart3 className="size-3" /> {item.level}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Globe className="size-3" /> {item.language}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-lg font-bold tracking-[-.03em] ${item.isFree ? "text-[#22c55e]" : "text-[#0b0b0c]"}`}
                        >
                          {formatPrice(item.price, item.isFree)}
                        </span>
                      </div>
                    </div>

                    {/* ── Show / Hide Details toggle button ── */}
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`details-${item.id}`}
                      className="flex w-full items-center justify-center gap-1.5 border-t border-black/[0.07] px-5 py-2.5 text-xs font-semibold text-[#1683f6] transition-colors hover:bg-[#1683f6]/[0.04]"
                    >
                      {isExpanded ? "Hide Details" : "Show Details"}
                      <ChevronDown
                        className={`size-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </article>

                  {/* ── Expandable full course details panel ── */}
                  <div id={`details-${item.id}`} className="px-1">
                    <CourseDetails slug={item.slug} expanded={isExpanded} />
                  </div>
                </div>
              )
            })}
          </section>

          {/* ── Right: sticky order summary ── */}
          <aside>
            <div className="sticky top-28 space-y-4">

              {/* Summary card */}
              <div className="overflow-hidden rounded-[18px] border border-black/10 bg-white/70">
                <div className="border-b border-black/10 px-5 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-[.14em] text-[#8a8b8e]">Order Summary</h2>
                </div>
                <div className="px-5 py-4">
                  <dl className="divide-y divide-black/5 text-sm">
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-[#717376]">Courses</dt>
                      <dd className="font-medium">{items.length}</dd>
                    </div>
                    {freeItems.length > 0 && (
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-[#717376]">Free courses</dt>
                        <dd className="font-medium text-[#22c55e]">{freeItems.length}</dd>
                      </div>
                    )}
                    {paidItems.length > 0 && (
                      <div className="flex items-center justify-between py-2.5">
                        <dt className="text-[#717376]">Paid courses</dt>
                        <dd className="font-medium">{paidItems.length}</dd>
                      </div>
                    )}
                    {/* Per-item price breakdown */}
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2.5">
                        <dt className="max-w-[160px] truncate text-[#717376]">{item.title}</dt>
                        <dd className={`font-medium ${item.isFree ? "text-[#22c55e]" : ""}`}>
                          {formatPrice(item.price, item.isFree)}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-3">
                      <dt className="font-semibold">Total</dt>
                      <dd className="text-xl font-bold tracking-[-.03em]">{formatTotal(total)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Duplicate enrollment warning */}
              {hasDuplicateEnrollments && (
                <div className="flex items-start gap-2.5 rounded-[14px] border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="leading-relaxed">
                    You already own some courses in your cart. Please remove them using the trash icon
                    before proceeding to avoid duplicate charges.
                  </p>
                </div>
              )}

              {/* Error message */}
              {checkoutError && (
                <div className="flex items-start gap-2.5 rounded-[14px] border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
                  <p className="leading-relaxed">{checkoutError}</p>
                </div>
              )}

              {/* Promo hint */}
              {total > 0 && (
                <div className="flex items-start gap-3 rounded-[14px] border border-black/10 bg-white/50 px-4 py-3.5">
                  <Tag className="mt-0.5 size-4 shrink-0 text-[#f59e0b]" />
                  <p className="text-xs leading-relaxed text-[#717376]">
                    Promo codes &amp; discounts can be applied at checkout.
                  </p>
                </div>
              )}

              {/* Checkout / Enroll button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkingOut || hasDuplicateEnrollments}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111214] px-5 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-black/80 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {checkingOut ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" />
                    {total === 0 ? "Enroll for Free" : "Proceed to Checkout"}
                  </>
                )}
              </button>

              {/* Continue browsing */}
              <Link
                to="/resources"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-transparent px-5 py-3.5 text-sm font-medium text-[#111214] transition-colors hover:bg-black/5"
              >
                <BookOpen className="size-4" /> Continue Browsing
              </Link>

              {/* Trust signals */}
              <div className="rounded-[14px] border border-black/10 bg-white/50 px-4 py-4">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#9a9b9e]">What you get</h3>
                <ul className="space-y-2">
                  {[
                    "Lifetime access to course content",
                    "Downloadable study materials",
                    "Certificate of completion",
                    "Access on all devices",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-xs text-[#55575a]">
                      <CheckCircle2 className="size-3.5 shrink-0 text-[#22c55e]" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Auth Modal for unauthenticated users */}
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      {/* Success Modal */}
      <PaymentSuccessModal
        open={successModalData.open}
        onClose={() => setSuccessModalData({ open: false, items: [] })}
        items={successModalData.items}
        paymentId={successModalData.paymentId}
        orderId={successModalData.orderId}
        isFree={successModalData.isFree}
      />
    </div>
  )
}
