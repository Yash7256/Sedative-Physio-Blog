import { useState } from "react"
import { useUser, useClerk } from "@clerk/react"
import { useNavigate } from "react-router-dom"
import {
  User,
  BookOpen,
  FileText,
  Box,
  Mic,
  ShoppingBag,
  MapPin,
  Heart,
  Bell,
  HelpCircle,
  LogOut,
  Pencil,
  Calendar,
  Mail,
  Phone,
  UserRound,
  Lock,
  Shield,
  Link as LinkIcon,
  ChevronRight,
  BookMarked,
  Download,
  Play,
  Package,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  icon: React.ReactNode
  label: string
  id: string
  danger?: boolean
}

type ActivityItem = {
  icon: React.ReactNode
  title: string
  subtitle: string
  date: string
}

// ─── Sidebar nav items ────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  { icon: <User size={18} />, label: "Profile", id: "profile" },
  { icon: <BookOpen size={18} />, label: "My Courses", id: "courses" },
  { icon: <FileText size={18} />, label: "My Notes", id: "notes" },
  { icon: <Box size={18} />, label: "3D Models", id: "models" },
  { icon: <Mic size={18} />, label: "Podcasts", id: "podcasts" },
  { icon: <ShoppingBag size={18} />, label: "Orders", id: "orders" },
  { icon: <MapPin size={18} />, label: "Addresses", id: "addresses" },
  { icon: <Heart size={18} />, label: "Wishlist", id: "wishlist" },
  { icon: <Bell size={18} />, label: "Notifications", id: "notifications" },
  { icon: <HelpCircle size={18} />, label: "Help & Support", id: "help" },
  { icon: <LogOut size={18} />, label: "Log Out", id: "logout", danger: true },
]

// ─── Info field component ─────────────────────────────────────────────────────

function InfoField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#e7e8e7] dark:bg-white/[0.07]">
        <span className="text-[#686a6b] dark:text-slate">{icon}</span>
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm text-[#686a6b] dark:text-slate">{label}</span>
        <span className="font-semibold text-[#1e2233] dark:text-ink truncate">{value}</span>
      </div>
    </div>
  )
}

// ─── Settings row component ───────────────────────────────────────────────────

function SettingsRow({
  icon,
  title,
  description,
  hasBorder = true,
}: {
  icon: React.ReactNode
  title: string
  description: string
  hasBorder?: boolean
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-5 px-2 py-5 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${
        hasBorder ? "border-b border-[#edeef3] dark:border-white/[0.08]" : ""
      }`}
    >
      <div className="flex size-[60px] shrink-0 items-center justify-center rounded-[17px] bg-[#e7e8e7] dark:bg-white/[0.07]">
        <span className="text-[#686a6b] dark:text-slate">{icon}</span>
      </div>
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        <span className="font-semibold text-[#1e2233] dark:text-ink">{title}</span>
        <span className="text-sm text-[#686a6b] dark:text-slate">{description}</span>
      </div>
      <ChevronRight size={20} className="shrink-0 text-[#686a6b] dark:text-slate" />
    </button>
  )
}

// ─── Activity row component ───────────────────────────────────────────────────

function ActivityRow({
  item,
  hasBorder = true,
}: {
  item: ActivityItem
  hasBorder?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-5 px-2 py-5 ${
        hasBorder ? "border-b border-[#edeef3] dark:border-white/[0.08]" : ""
      }`}
    >
      <div className="flex size-[60px] shrink-0 items-center justify-center rounded-[17px] bg-[#e7e8e7] dark:bg-white/[0.07]">
        <span className="text-[#686a6b] dark:text-slate">{item.icon}</span>
      </div>
      <div className="flex flex-1 min-w-0 flex-col gap-1">
        <span className="font-semibold text-[#1e2233] dark:text-ink truncate">{item.title}</span>
        <span className="text-sm text-[#686a6b] dark:text-slate">{item.subtitle}</span>
      </div>
      <span className="shrink-0 text-sm text-[#686a6b] dark:text-slate whitespace-nowrap">
        {item.date}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Account() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState("profile")

  const displayName = user?.fullName ?? "—"
  const email = user?.primaryEmailAddress?.emailAddress ?? "—"
  const avatarUrl = user?.imageUrl

  // Format member since date
  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
        new Date(user.createdAt)
      )
    : "—"

  function handleNavClick(id: string) {
    if (id === "logout") {
      signOut().then(() => navigate("/"))
      return
    }
    setActiveSection(id)
  }

  const activityItems: ActivityItem[] = [
    {
      icon: <BookMarked size={18} />,
      title: "Enrolled Course: Musculoskeletal System for PhysioNinjas",
      subtitle: "Payment successful",
      date: "11 Aug 2025",
    },
    {
      icon: <Download size={18} />,
      title: "Downloaded Notes: Clinical Assessment & Evaluation",
      subtitle: "PDF, 4.2 MB",
      date: "09 Aug 2025",
    },
    {
      icon: <Play size={18} />,
      title: "Watched: The Physio Talk Podcast (Season 1)",
      subtitle: "Episode 3 · 32 mins",
      date: "05 Aug 2025",
    },
    {
      icon: <Package size={18} />,
      title: "Order Delivered: 3D Anatomy Models (Foot & Hip)",
      subtitle: "Order #GA-38291",
      date: "28 Jul 2025",
    },
  ]

  return (
    <div className="account-page min-h-screen px-4 pb-24 sm:px-8 lg:px-[51px]">
      <div className="mx-auto flex max-w-[1280px] gap-6 lg:gap-8">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-[148px] rounded-3xl border border-black/10 bg-[#f3f3f3] px-4 py-8 dark:border-white/10 dark:bg-white/[0.04]">
            <nav aria-label="Account navigation">
              <ul className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`flex w-full items-center gap-4 rounded-full px-5 py-4 text-left text-base transition-colors ${
                        activeSection === item.id && !item.danger
                          ? "bg-[#030213] text-white"
                          : item.danger
                          ? "text-[#d4183d] hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "text-[#686a6b] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Profile header */}
          <section
            aria-labelledby="profile-heading"
            className="rounded-[26px] border border-black/10 bg-[#f3f3f3] px-8 py-8 shadow-[0_2px_4px_rgba(20,24,40,0.04)] dark:border-white/10 dark:bg-white/[0.04] sm:px-10 sm:py-10"
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              {/* Avatar + name */}
              <div className="flex items-start gap-6">
                <div className="size-24 shrink-0 overflow-hidden rounded-full bg-[#13266b]">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-white">
                      <UserRound size={40} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <h1
                    id="profile-heading"
                    className="text-2xl font-semibold text-[#1e2233] dark:text-ink"
                  >
                    {displayName}
                  </h1>
                  <p className="text-[#686a6b] dark:text-slate">{email}</p>
                  <span className="inline-flex w-fit rounded-full bg-[rgba(22,131,255,0.12)] px-4 py-1 text-sm font-semibold text-[#1683ff]">
                    Student
                  </span>
                  <p className="mt-1 text-sm text-[#686a6b] dark:text-slate">
                    Member since {memberSince}
                  </p>
                </div>
              </div>

              {/* Edit button */}
              <button
                type="button"
                className="flex items-center gap-2 rounded-xl border border-black/[0.09] bg-white px-5 py-3 text-sm font-medium text-[#1e2233] transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.07] dark:text-ink dark:hover:bg-white/[0.1]"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
            </div>
          </section>

          {/* Personal information */}
          <section
            aria-labelledby="personal-info-heading"
            className="rounded-[26px] border border-black/10 bg-[#f3f3f3] px-8 py-8 shadow-[0_2px_4px_rgba(20,24,40,0.04)] dark:border-white/10 dark:bg-white/[0.04] sm:px-10 sm:py-10"
          >
            <h2
              id="personal-info-heading"
              className="mb-7 text-xl font-semibold text-[#1e2233] dark:text-ink"
            >
              Personal Information
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <InfoField icon={<UserRound size={20} />} label="Full Name" value={displayName} />
              <InfoField
                icon={<Calendar size={20} />}
                label="Date of Birth"
                value="June 9, 2000"
              />
              <InfoField icon={<Mail size={20} />} label="Email Address" value={email} />
              <InfoField icon={<UserRound size={20} />} label="Gender" value="Female" />
              <InfoField
                icon={<Phone size={20} />}
                label="Phone Number"
                value="+91 98765 43210"
              />
              <InfoField
                icon={<MapPin size={20} />}
                label="Location"
                value="Bhopal, Madhya Pradesh"
              />
            </div>
          </section>

          {/* Account settings */}
          <section
            aria-labelledby="account-settings-heading"
            className="rounded-[26px] border border-black/10 bg-[#f3f3f3] px-8 py-8 shadow-[0_2px_4px_rgba(20,24,40,0.04)] dark:border-white/10 dark:bg-white/[0.04] sm:px-10 sm:py-10"
          >
            <h2
              id="account-settings-heading"
              className="mb-6 text-xl font-semibold text-[#1e2233] dark:text-ink"
            >
              Account Settings
            </h2>
            <div>
              <SettingsRow
                icon={<Lock size={20} />}
                title="Change Password"
                description="Update your password for better security"
              />
              <SettingsRow
                icon={<Bell size={20} />}
                title="Notification Preferences"
                description="Choose what updates you want to receive"
              />
              <SettingsRow
                icon={<Shield size={20} />}
                title="Privacy Settings"
                description="Manage your data privacy"
              />
              <SettingsRow
                icon={<LinkIcon size={20} />}
                title="Linked Accounts"
                description="Connect your account"
                hasBorder={false}
              />
            </div>
          </section>

          {/* Recent activity */}
          <section
            aria-labelledby="recent-activity-heading"
            className="rounded-[26px] border border-black/10 bg-[#f3f3f3] px-8 py-8 shadow-[0_2px_4px_rgba(20,24,40,0.04)] dark:border-white/10 dark:bg-white/[0.04] sm:px-10 sm:py-10"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2
                id="recent-activity-heading"
                className="text-xl font-semibold text-[#1e2233] dark:text-ink"
              >
                Recent Activity
              </h2>
              <button
                type="button"
                className="text-sm font-semibold text-[#030213] dark:text-ink hover:opacity-60 transition-opacity"
              >
                View All
              </button>
            </div>
            <div>
              {activityItems.map((item, i) => (
                <ActivityRow
                  key={item.title}
                  item={item}
                  hasBorder={i < activityItems.length - 1}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
