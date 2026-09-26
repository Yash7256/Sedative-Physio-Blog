import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useClerk, useUser } from "@clerk/clerk-react"
import {
  AlertCircle,
  Bell,
  BookOpen,
  Box,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Heart,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Mic,
  Pencil,
  Shield,
  ShoppingBag,
  User,
  UserRound,
  X,
} from "lucide-react"

import { useAuthProfile } from "@/lib/auth"
import {
  fetchEnrolledCourses,
  fetchMyOrders,
  formatDate,
  formatMoney,
  type EnrolledCourse,
  type UserOrder,
} from "@/lib/account"

/**
 * The account page.
 *
 * Two rules run through all of it:
 *
 * 1. It shows what the API actually returned. Where this app has no data for a
 *    field or a section, the page says so rather than rendering a plausible
 *    placeholder — a dashboard that invents data is worse than an empty one,
 *    because it cannot be trusted to be wrong in a visible way.
 * 2. Profile data comes from `/api/auth/me`, not from Clerk's user object. Clerk
 *    is identity; role and college are this app's, and only the profile row has
 *    them. Clerk is used only for what it alone knows: the avatar and the
 *    original sign-up date.
 */
type SectionId =
  | "profile"
  | "courses"
  | "orders"
  | "notes"
  | "models"
  | "podcasts"
  | "addresses"
  | "wishlist"
  | "notifications"
  | "help"

const navItems: Array<{ icon: React.ReactNode; label: string; id: SectionId }> = [
  { icon: <User size={18} />, label: "Profile", id: "profile" },
  { icon: <BookOpen size={18} />, label: "My Courses", id: "courses" },
  { icon: <ShoppingBag size={18} />, label: "Orders", id: "orders" },
  { icon: <FileText size={18} />, label: "My Notes", id: "notes" },
  { icon: <Box size={18} />, label: "3D Models", id: "models" },
  { icon: <Mic size={18} />, label: "Podcasts", id: "podcasts" },
  { icon: <MapPin size={18} />, label: "Addresses", id: "addresses" },
  { icon: <Heart size={18} />, label: "Wishlist", id: "wishlist" },
  { icon: <Bell size={18} />, label: "Notifications", id: "notifications" },
  { icon: <HelpCircle size={18} />, label: "Help & Support", id: "help" },
]

/**
 * Sections with no data source yet.
 *
 * `courses` and `orders` are live. `addresses` and `wishlist` have no table and
 * no endpoint, so there is nothing to render and no honest way to fake it.
 * `notifications` is the awkward one: Clerk knows about sessions and email, not
 * about in-app notifications, so it cannot be delegated either.
 */
const UNAVAILABLE: Partial<Record<SectionId, string>> = {
  notes: "This app does not track which notes you have downloaded yet.",
  models: "This app does not track which models you have viewed yet.",
  podcasts: "There is no podcast library to track yet.",
  addresses: "Addresses are not stored for your account.",
  wishlist: "Wishlists are not stored for your account.",
  notifications: "In-app notifications are not wired up yet.",
  help: "There is no support system here yet — use the contact form for now.",
}

const panel = "rounded-[26px] border border-black/10 bg-[#f3f3f3] px-6 py-7 shadow-[0_2px_4px_rgba(20,24,40,0.04)] dark:border-white/10 dark:bg-white/[0.04] sm:px-10 sm:py-10"

export function Account() {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const { profile, isProfilePending, error, updateProfile } = useAuthProfile()

  const [activeSection, setActiveSection] = useState<SectionId>("profile")
  const [orders, setOrders] = useState<UserOrder[] | null>(null)
  const [enrolled, setEnrolled] = useState<EnrolledCourse[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  /**
   * Keyed on the account's local id, not the profile object.
   *
   * `updateProfile` swaps in a fresh object on every save, so depending on
   * `profile` would refetch orders and enrollments each time somebody corrects
   * their college — nothing about an order changes when a name does. Switching
   * accounts still refetches, because that is a different `userId`.
   */
  const profileUserId = profile?.userId

  /**
   * Orders and enrollments are fetched together, because both sections read them
   * and neither is worth a round trip on its own. `null` means "not loaded yet",
   * which is distinct from `[]` — an empty list is a real answer and renders
   * differently from a spinner.
   */
  useEffect(() => {
    if (!profileUserId) return

    let cancelled = false

    Promise.all([fetchMyOrders(), fetchEnrolledCourses()])
      .then(([nextOrders, nextEnrolled]) => {
        if (cancelled) return
        setOrders(nextOrders)
        setEnrolled(nextEnrolled)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : "Could not load your account data.")
      })

    return () => {
      cancelled = true
    }
  }, [profileUserId])

  const isLoading = orders === null || enrolled === null

  const signOutAndLeave = useCallback(() => {
    void signOut()
  }, [signOut])

  const courseTitles = useMemo(
    () => new Map((enrolled ?? []).map(({ course }) => [course.id, course.title])),
    [enrolled],
  )

  const displayName = profile?.fullName?.trim() || profile?.email || "—"
  const email = profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "—"
  const roleLabel = profile?.role === "admin" ? "Admin" : "Student"

  // Clerk's creation date, not the local row's: the row appears whenever the
  // webhook happened to land, which says nothing about when the person joined.
  const memberSince = user?.createdAt ? formatDate(new Date(user.createdAt).toISOString()) : "—"

  return (
    <div className="account-page min-h-screen px-4 pb-24 sm:px-8 lg:px-[51px]">
      <div className="mx-auto flex max-w-[1280px] gap-6 lg:gap-8">
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-[148px] rounded-3xl border border-black/10 bg-[#f3f3f3] px-4 py-6 dark:border-white/10 dark:bg-white/[0.04]">
            <nav aria-label="Account navigation">
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      aria-current={activeSection === item.id ? "page" : undefined}
                      className={`flex w-full items-center gap-4 rounded-full px-5 py-3.5 text-left text-base transition-colors ${
                        activeSection === item.id
                          ? "bg-[#030213] text-white"
                          : "text-[#686a6b] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
                <li className="mt-2 border-t border-black/[0.07] pt-2 dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={signOutAndLeave}
                    className="flex w-full items-center gap-4 rounded-full px-5 py-3.5 text-left text-base text-[#d4183d] transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <span className="shrink-0">
                      <LogOut size={18} />
                    </span>
                    <span>Log Out</span>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <ProfileHeader
            displayName={displayName}
            email={email}
            roleLabel={roleLabel}
            memberSince={memberSince}
            avatarUrl={user?.imageUrl}
            isPending={isProfilePending}
            error={error}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onCancelEdit={() => setIsEditing(false)}
            onSave={updateProfile}
          />

          {loadError && (
            <p role="alert" className={panel + " text-sm text-[#d4183d]"}>
              {loadError}
            </p>
          )}

          {activeSection === "profile" && (
            <ProfileSection
              displayName={displayName}
              email={email}
              roleLabel={roleLabel}
              memberSince={memberSince}
              collegeName={profile?.collegeName ?? null}
              emailVerified={profile?.emailVerified ?? false}
            />
          )}

          {activeSection === "courses" && (
            <CoursesSection enrolled={enrolled} isLoading={isLoading} />
          )}

          {activeSection === "orders" && (
            <OrdersSection orders={orders} isLoading={isLoading} courseTitles={courseTitles} />
          )}

          {UNAVAILABLE[activeSection] && (
            <EmptySection
              title={navItems.find((n) => n.id === activeSection)?.label ?? ""}
              message={UNAVAILABLE[activeSection]!}
            />
          )}

          {activeSection === "profile" && (
            <SettingsSection openUserProfile={openUserProfile} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function ProfileHeader({
  displayName,
  email,
  roleLabel,
  memberSince,
  avatarUrl,
  isPending,
  error,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
}: {
  displayName: string
  email: string
  roleLabel: string
  memberSince: string
  avatarUrl?: string
  isPending: boolean
  error: string | null
  isEditing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: ReturnType<typeof useAuthProfile>["updateProfile"]
}) {
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="size-20 shrink-0 overflow-hidden rounded-full bg-[#13266b] sm:size-24">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-white">
                <UserRound size={36} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <h1 className="text-xl font-semibold text-[#1e2233] dark:text-white sm:text-2xl">
              {displayName}
            </h1>
            <p className="text-sm text-[#686a6b] dark:text-[#b4b4af]">{email}</p>
            <span className="inline-flex w-fit rounded-full bg-[rgba(22,131,255,0.12)] px-4 py-1 text-sm font-semibold text-[#1683ff]">
              {roleLabel}
            </span>
            <p className="text-sm text-[#686a6b] dark:text-[#b4b4af]">
              {/* Resolves on its own once the profile row exists, so it is
                  announced rather than silently swapping text. */}
              <span aria-live="polite">
                {error
                  ? "Profile unavailable"
                  : isPending
                    ? "Setting up your profile…"
                    : `Member since ${memberSince}`}
              </span>
            </p>
          </div>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-2 rounded-xl border border-black/[0.09] bg-white px-5 py-3 text-sm font-medium text-[#1e2233] transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.07] dark:text-white"
          >
            <Pencil size={16} /> Edit Profile
          </button>
        )}
      </div>

      {isEditing && (
        <EditProfileForm onCancel={onCancelEdit} onSave={onSave} />
      )}
    </section>
  )
}

/**
 * Edits the two fields this app owns.
 *
 * Deliberately not email, phone or password: Clerk owns those, and an edit made
 * only in this app's row would be reverted by the next Clerk event. Those live
 * in Clerk's own profile screen, linked from Account Settings.
 */
function EditProfileForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: ReturnType<typeof useAuthProfile>["updateProfile"]
}) {
  const { profile } = useAuthProfile()
  const [fullName, setFullName] = useState(profile?.fullName ?? "")
  const [collegeName, setCollegeName] = useState(profile?.collegeName ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setSaveError(null)
    try {
      // Closing on success is the confirmation: the header above re-renders with
      // the saved name, and a separate "Saved!" flash would only be seen on the
      // form that just disappeared.
      await onSave({ fullName, collegeName })
      onCancel()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save your profile.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 border-t border-black/[0.07] pt-6 dark:border-white/[0.08]">
      <div className="flex flex-col gap-4 sm:flex-row">
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="text-[#686a6b] dark:text-[#b4b4af]">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={120}
            required
            className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[#1e2233] outline-none focus:border-[#1683f6] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          />
        </label>
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="text-[#686a6b] dark:text-[#b4b4af]">College</span>
          <input
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            maxLength={160}
            placeholder="Where you study"
            className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[#1e2233] outline-none focus:border-[#1683f6] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          />
        </label>
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-[#d4183d]">
          {saveError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving || fullName.trim().length === 0}
          className="flex items-center gap-2 rounded-xl bg-[#1683f6] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          Save changes
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl border border-black/[0.09] px-5 py-2.5 text-sm font-medium text-[#1e2233] transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:text-white"
        >
          <X size={16} /> Cancel
        </button>
      </div>
    </form>
  )
}

function ProfileSection({
  displayName,
  email,
  roleLabel,
  memberSince,
  collegeName,
  emailVerified,
}: {
  displayName: string
  email: string
  roleLabel: string
  memberSince: string
  collegeName: string | null
  emailVerified: boolean
}) {
  return (
    <section className={panel}>
      <h2 className="mb-7 text-xl font-semibold text-[#1e2233] dark:text-white">Personal Information</h2>
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
        <InfoField icon={<UserRound size={20} />} label="Full Name" value={displayName} />
        <InfoField icon={<Mail size={20} />} label="Email Address" value={email} />
        <InfoField
          icon={<Building2 size={20} />}
          label="College"
          value={collegeName ?? "Not set — use Edit Profile"}
          muted={!collegeName}
        />
        <InfoField icon={<Shield size={20} />} label="Role" value={roleLabel} />
        <InfoField
          icon={emailVerified ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          label="Email Status"
          value={emailVerified ? "Verified" : "Not verified"}
          muted={!emailVerified}
        />
        <InfoField icon={<CalendarDays size={20} />} label="Member Since" value={memberSince} />
      </div>
    </section>
  )
}

/**
 * Account settings that genuinely exist.
 *
 * The first three are Clerk's, and the only correct implementation is to hand
 * them to Clerk rather than reimplement password or privacy handling here.
 */
function SettingsSection({ openUserProfile }: { openUserProfile: () => void }) {
  return (
    <section className={panel}>
      <h2 className="mb-6 text-xl font-semibold text-[#1e2233] dark:text-white">Account Settings</h2>
      <div>
        <SettingsRow
          icon={<Lock size={20} />}
          title="Password & Security"
          description="Change your password and manage your sign-in methods"
          onClick={openUserProfile}
        />
        <SettingsRow
          icon={<Shield size={20} />}
          title="Privacy"
          description="Manage what your account exposes"
          onClick={openUserProfile}
        />
        <SettingsRow
          icon={<LinkIcon size={20} />}
          title="Linked Accounts"
          description="Connect or disconnect other sign-in methods"
          onClick={openUserProfile}
          hasBorder={false}
        />
      </div>
      <p className="mt-4 text-sm text-[#686a6b] dark:text-[#b4b4af]">
        These are managed by Clerk, which owns your credentials. Notification
        preferences are not wired up yet.
      </p>
    </section>
  )
}

// ─── Courses & orders ────────────────────────────────────────────────────────

function CoursesSection({
  enrolled,
  isLoading,
}: {
  enrolled: EnrolledCourse[] | null
  isLoading: boolean
}) {
  return (
    <section className={panel}>
      <h2 className="mb-6 text-xl font-semibold text-[#1e2233] dark:text-white">My Courses</h2>
      {isLoading ? (
        <Loading />
      ) : enrolled!.length === 0 ? (
        <EmptyState message="You are not enrolled in any courses yet." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {enrolled!.map(({ course }) => (
            <li key={course.id} className="flex items-center gap-4 rounded-2xl border border-black/[0.07] p-4 dark:border-white/[0.08]">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e7e8e7] text-[#686a6b] dark:bg-white/[0.07] dark:text-[#b4b4af]">
                <BookOpen size={20} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-semibold text-[#1e2233] dark:text-white">{course.title}</span>
                <span className="text-sm text-[#686a6b] dark:text-[#b4b4af]">
                  {course.level} · {course.language}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-[#686a6b] dark:text-[#b4b4af]">
        <Link to="/resources" className="font-semibold text-[#030213] hover:opacity-60 dark:text-white">
          Browse the catalogue
        </Link>{" "}
        to find more courses.
      </p>
    </section>
  )
}

function OrdersSection({
  orders,
  isLoading,
  courseTitles,
}: {
  orders: UserOrder[] | null
  isLoading: boolean
  /** Course id to title, so an order row can name what was bought. */
  courseTitles: Map<string, string>
}) {
  const unlockedCount = new Set(
    (orders ?? []).flatMap((o) => (o.status === "PAID" ? o.courseIds : [])),
  ).size

  return (
    <section className={panel}>
      <h2 className="mb-6 text-xl font-semibold text-[#1e2233] dark:text-white">Orders</h2>
      {isLoading ? (
        <Loading />
      ) : orders!.length === 0 ? (
        <EmptyState message="You have not placed any orders yet." />
      ) : (
        <ul className="flex flex-col">
          {orders!.map((order, i) => (
            <li
              key={order.id}
              className={`flex flex-wrap items-center gap-4 py-5 ${
                i < orders!.length - 1 ? "border-b border-[#edeef3] dark:border-white/[0.08]" : ""
              }`}
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#e7e8e7] text-[#686a6b] dark:bg-white/[0.07] dark:text-[#b4b4af]">
                <ShoppingBag size={20} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold text-[#1e2233] dark:text-white">
                  {describeOrder(order, courseTitles)}
                </span>
                <span className="text-sm text-[#686a6b] dark:text-[#b4b4af]">
                  {formatDate(order.createdAt)} · {formatMoney(order.amount, order.currency)}
                </span>
              </div>
              <OrderStatus status={order.status} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-[#686a6b] dark:text-[#b4b4af]">
        {unlockedCount} course{unlockedCount === 1 ? "" : "s"} unlocked across these orders.
      </p>
    </section>
  )
}

/**
 * Names what an order bought.
 *
 * Prefers the real course titles, because "Order #1" tells a user nothing when
 * every row looks the same. Falls back to a count when the catalogue no longer
 * has the course — an unpublished course should not blank the row, and a
 * fabricated title would be worse than an honest number.
 */
function describeOrder(order: UserOrder, courseTitles: Map<string, string>): string {
  const titles = order.courseIds.flatMap((id) => {
    const title = courseTitles.get(id)
    return title ? [title] : []
  })

  if (titles.length === 0) {
    return order.courseIds.length === 1 ? "1 course" : `${order.courseIds.length} courses`
  }
  if (titles.length === 1) return titles[0]
  return `${titles.slice(0, 2).join(", ")}${titles.length > 2 ? ` +${titles.length - 2} more` : ""}`
}

function OrderStatus({ status }: { status: UserOrder["status"] }) {
  const tone =
    status === "PAID"
      ? "bg-[rgba(22,131,246,0.12)] text-[#1683ff]"
      : status === "PENDING"
        ? "bg-black/[0.06] text-[#686a6b] dark:bg-white/[0.1] dark:text-[#b4b4af]"
        : "bg-red-500/10 text-[#d4183d]"

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {status === "PAID" ? "Paid" : status === "PENDING" ? "Pending" : "Failed"}
    </span>
  )
}

// ─── Empty states ────────────────────────────────────────────────────────────

function EmptySection({ title, message }: { title: string; message: string }) {
  return (
    <section className={panel}>
      <h2 className="mb-4 text-xl font-semibold text-[#1e2233] dark:text-white">{title}</h2>
      <EmptyState message={message} />
    </section>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-black/10 px-5 py-8 text-center text-sm text-[#686a6b] dark:border-white/10 dark:text-[#b4b4af]">
      {message}
    </p>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-[#686a6b] dark:text-[#b4b4af]">
      <Loader2 size={16} className="animate-spin" />
      Loading…
    </div>
  )
}

// ─── Small pieces ────────────────────────────────────────────────────────────

function InfoField({
  icon,
  label,
  value,
  muted = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#e7e8e7] text-[#686a6b] dark:bg-white/[0.07] dark:text-[#b4b4af]">
        {icon}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm text-[#686a6b] dark:text-[#b4b4af]">{label}</span>
        <span
          className={`truncate font-semibold ${muted ? "text-[#686a6b] dark:text-[#b4b4af]" : "text-[#1e2233] dark:text-white"}`}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

function SettingsRow({
  icon,
  title,
  description,
  onClick,
  hasBorder = true,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  hasBorder?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-5 px-2 py-5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
        hasBorder ? "border-b border-[#edeef3] dark:border-white/[0.08]" : ""
      }`}
    >
      <div className="grid size-14 shrink-0 place-items-center rounded-[17px] bg-[#e7e8e7] text-[#686a6b] dark:bg-white/[0.07] dark:text-[#b4b4af]">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold text-[#1e2233] dark:text-white">{title}</span>
        <span className="text-sm text-[#686a6b] dark:text-[#b4b4af]">{description}</span>
      </div>
      <ChevronRight size={20} className="shrink-0 text-[#686a6b]" />
    </button>
  )
}
