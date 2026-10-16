import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus'

const REVIEW_PATH = '/flashcards/review'

/**
 * `end` alone cannot express these: "Thư viện" owns every /flashcards path
 * except the review session, which has its own tab.
 */
const TABS = [
  { to: '/', label: 'Hôm nay', icon: HomeIcon, match: (p: string) => p === '/' },
  {
    to: '/flashcards',
    label: 'Thư viện',
    icon: DeckIcon,
    match: (p: string) => p.startsWith('/flashcards') && !p.startsWith(REVIEW_PATH),
  },
  {
    to: REVIEW_PATH,
    label: 'Ôn tập',
    icon: ReviewIcon,
    match: (p: string) => p.startsWith(REVIEW_PATH),
  },
  {
    to: '/settings',
    label: 'Cài đặt',
    icon: SettingsIcon,
    match: (p: string) => p.startsWith('/settings'),
  },
]

export default function AppLayout() {
  const { pathname } = useLocation()
  const online = useOnlineStatus()

  return (
    <div className="flex min-h-full flex-col">
      {!online && (
        <p
          role="status"
          className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-300"
        >
          Đang offline — vẫn ôn được, dữ liệu tự đồng bộ khi có mạng lại.
        </p>
      )}

      {/* Keyed on the path so each navigation replays the entrance, giving a
          sense of direction that an instant swap does not. */}
      <main key={pathname} className="page-enter flex-1 pb-20">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex max-w-lg">
          {TABS.map(({ to, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'no-select flex flex-col items-center gap-1 py-2.5 text-xs transition',
                    active
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-500',
                  ].join(' ')}
                >
                  <Icon />
                  {label}
                </NavLink>
              </li>
            )
          })}
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
      {/* A shelf of books: the tab is a library, not a single deck. */}
      <path d="M4 5h3v15H4z" />
      <path d="M9 5h3v15H9z" />
      <path d="m14.5 6 2.8-.7 3 14.6-2.8.6z" />
    </svg>
  )
}

function ReviewIcon() {
  return (
    <svg {...iconProps}>
      {/* A card with a tick: what the tab does is answer cards, not refresh
          something — which is what the circular arrow read as. */}
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="m8 10.5 2.5 2.5L16 7.5" />
      <path d="M7 21h10" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg {...iconProps}>
      {/* A cog. The spokes-around-a-circle it replaced read as a sun. */}
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 14.6a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.4A1.7 1.7 0 0 0 10.43 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.56 1.03z" />
    </svg>
  )
}
