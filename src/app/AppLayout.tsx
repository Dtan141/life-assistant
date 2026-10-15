import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Hôm nay', icon: HomeIcon, end: true },
  { to: '/flashcards', label: 'Bộ thẻ', icon: DeckIcon, end: false },
  { to: '/flashcards/review', label: 'Ôn tập', icon: ReviewIcon, end: false },
  { to: '/settings', label: 'Cài đặt', icon: SettingsIcon, end: false },
]

export default function AppLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-lg">
          {TABS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'no-select flex flex-col items-center gap-1 py-2.5 text-xs transition',
                    isActive
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-500',
                  ].join(' ')
                }
              >
                <Icon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

const iconProps = {
  className: 'size-6',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  )
}

function DeckIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="6" width="14" height="12" rx="2" />
      <path d="M7 3h11a3 3 0 0 1 3 3v9" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1m0-14.2-2.1 2.1m-10 10-2.1 2.1" />
    </svg>
  )
}
