'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { TierBadge } from '@/components/ui/Badge'

interface NavbarProps {
  profile?: Profile | null
}

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navLinks = profile ? [
    { href: '/dashboard', label: 'Matches' },
    { href: '/history', label: 'History' },
    { href: '/account', label: 'Account' },
  ] : []

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur-md bg-[var(--bg-primary)]/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={profile ? '/dashboard' : '/'} className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex-shrink-0">
            {!logoError ? (
              <Image
                src="/logo.png"
                alt="BetGenius AI"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">BG</span>
              </div>
            )}
          </div>
          <span className="font-display text-lg text-[var(--text-primary)] tracking-wider hidden sm:block">
            BetGenius <span className="text-[var(--accent-primary)]">AI</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname.startsWith(link.href)
                  ? 'text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {/* Notification bell (authenticated) */}
          {profile && (
            <button className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          )}

          {/* User menu or auth buttons */}
          {profile ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-[var(--accent-primary)]">
                    {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                  </span>
                </div>
                <TierBadge tier={profile.tier} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 card py-1 z-50">
                  <div className="px-3 py-2 border-b border-[var(--border)]">
                    <p className="text-xs text-[var(--text-muted)] truncate">{profile.email}</p>
                  </div>
                  <Link href="/account" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                    Account
                  </Link>
                  <Link href="/pricing" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
                    Upgrade
                  </Link>
                  {profile.email === 'lebohangsebata20@gmail.com' && (
                    <Link href="/admin" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)]">
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={() => { setMenuOpen(false); handleSignOut() }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--bg-tertiary)]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5">
                Log in
              </Link>
              <Link href="/signup" className="text-sm bg-[var(--accent-primary)] text-white px-4 py-1.5 rounded-xl hover:bg-blue-600 transition-colors">
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          {profile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-[var(--text-secondary)]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && profile && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg-secondary)]">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => { setMenuOpen(false); handleSignOut() }}
            className="w-full flex items-center px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--bg-tertiary)]"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}

export function BottomNav({ pathname }: { pathname: string }) {
  const links = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/dashboard/matches',
      label: 'Matches',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: '/history',
      label: 'History',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/account',
      label: 'Account',
      icon: (active: boolean) => (
        <svg className={`w-5 h-5 ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-[var(--border)] bg-[var(--bg-primary)]/95 backdrop-blur-md">
      <div className="grid grid-cols-4 h-14">
        {links.map(link => {
          const active = pathname.startsWith(link.href)
          return (
            <Link key={link.href} href={link.href} className="flex flex-col items-center justify-center gap-0.5">
              {link.icon(active)}
              <span className={`text-[10px] ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                {link.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
