import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { alertsApi } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const nav = [
  { to: '/',       icon: HomeIcon,    label: 'หน้าหลัก' },
  { to: '/sows',   icon: PigIcon,     label: 'แม่หมู'   },
  { to: '/alerts', icon: BellIcon,    label: 'แจ้งเตือน' },
]

export default function BottomNav() {
  const { farmId } = useAuth()
  const [badge, setBadge] = useState(0)
  const location = useLocation()

  useEffect(() => {
    if (!farmId) return
    alertsApi.countPending(farmId).then(({ count }) => setBadge(count ?? 0))
  }, [farmId, location.pathname])

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-100 flex safe-bottom z-50 shadow-lg">
      {nav.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-farm-700' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className="relative">
                <Icon active={isActive} />
                {to === '/alerts' && badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function HomeIcon({ active }) {
  return (
    <svg width="24" height="24" fill="none" stroke={active ? '#15803d' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" /><path d="M3 12v9h18V12" />
    </svg>
  )
}

function PigIcon({ active }) {
  const c = active ? '#15803d' : '#9ca3af'
  return (
    <svg width="24" height="24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
      <ellipse cx="12" cy="13" rx="7" ry="5.5" />
      <circle cx="9.5" cy="12.5" r="0.8" fill={c} />
      <circle cx="14.5" cy="12.5" r="0.8" fill={c} />
      <path d="M10 15.5c.6.6 3.4.6 4 0" />
      <path d="M5 10.5C4 9 4 7 5.5 6.5" />
      <path d="M19 10.5C20 9 20 7 18.5 6.5" />
      <path d="M5.5 6.5C6 5 8 4.5 9 5" />
      <path d="M18.5 6.5C18 5 16 4.5 15 5" />
    </svg>
  )
}

function BellIcon({ active }) {
  return (
    <svg width="24" height="24" fill="none" stroke={active ? '#15803d' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}
