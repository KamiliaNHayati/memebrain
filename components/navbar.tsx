'use client';

// components/navbar.tsx
// Top navigation bar with logo, page links, wallet connect, and Four.meme auth status.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useFourMemeAuth } from '@/hooks/use-fourmeme-auth';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: '🧠' },
  { href: '/scan', label: 'Scan', icon: '🔍' },
  { href: '/genesis', label: 'Genesis', icon: '✨' },
  { href: '/monitor', label: 'Monitor', icon: '📊' },
];

export function Navbar() {
  const pathname = usePathname();
  const { status, authenticate, isAuthenticated } = useFourMemeAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[#262626] bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🧠</span>
          <span className="text-lg font-bold text-white group-hover:text-[#22c55e] transition-colors">
            MemeBrain
          </span>
        </Link>

        {/* Nav Links — Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                pathname === link.href
                  ? 'text-[#22c55e] bg-[#22c55e]/10'
                  : 'text-[#71717a] hover:text-white hover:bg-[#1a1a1a]'
              )}
            >
              <span className="mr-1.5">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side: Auth + Wallet */}
        <div className="flex items-center gap-3">
          {/* Four.meme Auth Button — only show when wallet is connected but not authenticated */}
          {status === 'connected' && !isAuthenticated && (
            <button
              onClick={authenticate}
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 px-3 py-1.5 text-sm font-medium text-[#22c55e] hover:bg-[#22c55e]/20 transition-all"
            >
              <span className="text-xs">🔑</span>
              Sign in to Four.meme
            </button>
          )}

          {status === 'signing' && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#71717a]">
              <span className="animate-spin text-xs">⏳</span>
              Signing...
            </div>
          )}

          {isAuthenticated && (
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/30 px-3 py-1.5 text-xs font-medium text-[#22c55e]">
              <span>✅</span>
              Four.meme
            </div>
          )}

          {/* RainbowKit Connect Button */}
          <ConnectButton
            accountStatus="avatar"
            chainStatus="icon"
            showBalance={false}
          />
        </div>
      </div>

      {/* Mobile Nav */}
      <nav className="flex md:hidden justify-around border-t border-[#262626] bg-[#050505]">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-all',
              pathname === link.href
                ? 'text-[#22c55e]'
                : 'text-[#71717a]'
            )}
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
