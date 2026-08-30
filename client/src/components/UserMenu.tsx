interface UserMenuProps {
  displayName: string
  onSignOut: () => void
}

export function UserMenu({ displayName, onSignOut }: UserMenuProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate hidden sm:block">{displayName}</span>
      <button
        onClick={onSignOut}
        className="inline-flex h-[35px] items-center gap-2 rounded-[5px] bg-ink px-4 text-sm text-canvas transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Log Out
      </button>
    </div>
  )
}
