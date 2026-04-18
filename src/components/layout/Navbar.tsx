'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import PotionButton from '@/components/ui/PotionButton';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/join', label: 'Join' },
  { href: '/create', label: 'Create' },
  { href: '/feed', label: 'Feed' },
  { href: '/my', label: 'Mine' },
  { href: '/connections', label: 'Links' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { wallet, inboundRequests } = useApp();
  const inboundCount = inboundRequests.length;
  const { time, toggle: toggleTime } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 border-b border-wizard-violet/20 bg-wizard-dark/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="font-pixel text-[13px] text-wizard-cyan text-glow-cyan group-hover:text-white transition-colors hidden sm:block">
            Wizper
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => {
            const showBadge = link.href === '/connections' && inboundCount > 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'font-pixel text-[12px] transition-all duration-200 relative inline-flex items-center',
                  pathname === link.href
                    ? 'text-wizard-cyan text-glow-cyan'
                    : 'text-gray-400 hover:text-wizard-violet',
                )}
              >
                {link.label}
                {showBadge && (
                  <span
                    className="ml-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 font-pixel text-[8px] text-wizard-dark bg-wizard-gold border border-wizard-gold animate-pulse-glow"
                    title={`${inboundCount} inbound link request(s)`}
                  >
                    {inboundCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Wallet + Theme toggle + mobile toggle */}
        <div className="flex items-center gap-3">
          {/* Day/Night toggle */}
          <button
            onClick={toggleTime}
            className="font-pixel text-lg cursor-pointer hover:scale-110 transition-transform"
            title={time === 'night' ? 'Switch to Day' : 'Switch to Night'}
          >
            {time === 'night' ? '🌙' : '☀️'}
          </button>

          {mounted && (wallet.connected ? (
            <div className="relative">
              <button
                onClick={() => setShowWalletMenu(v => !v)}
                className="font-pixel text-[8px] text-wizard-gold border border-wizard-gold/30 px-3 py-1.5 hover:bg-wizard-gold/10 transition-colors cursor-pointer"
              >
                {wallet.address}
              </button>
              {showWalletMenu && (
                <div className="absolute right-0 top-full mt-2 border border-wizard-violet/30 bg-wizard-dark/95 backdrop-blur-md p-2 min-w-[180px] z-50">
                  <button
                    onClick={() => {
                      if (wallet.address) navigator.clipboard?.writeText(wallet.address);
                      setShowWalletMenu(false);
                    }}
                    className="block w-full text-left font-pixel text-[9px] text-gray-300 hover:text-wizard-cyan hover:bg-wizard-cyan/10 px-3 py-2 transition-colors cursor-pointer"
                  >
                    Copy Address
                  </button>
                  <button
                    onClick={() => {
                      wallet.disconnect();
                      setShowWalletMenu(false);
                    }}
                    className="block w-full text-left font-pixel text-[9px] text-wizard-gold hover:bg-wizard-gold/10 px-3 py-2 transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <PotionButton variant="violet" small onClick={() => setShowWalletPicker(!showWalletPicker)}>
                Connect Wallet
              </PotionButton>
              {showWalletPicker && (
                <div className="absolute right-0 top-full mt-2 border border-wizard-violet/30 bg-wizard-dark/95 backdrop-blur-md p-2 min-w-[180px] z-50">
                  {wallet.connectors.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        c.connect();
                        setShowWalletPicker(false);
                      }}
                      className="block w-full text-left font-pixel text-[9px] text-gray-300 hover:text-wizard-cyan hover:bg-wizard-cyan/10 px-3 py-2 transition-colors cursor-pointer"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Mobile hamburger */}
          <button
            className="md:hidden font-pixel text-wizard-cyan text-lg cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-wizard-violet/20 bg-wizard-dark/95 backdrop-blur-md px-4 py-4 space-y-3">
          {NAV_LINKS.map(link => {
            const showBadge = link.href === '/connections' && inboundCount > 0;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'block font-pixel text-[10px] py-1',
                  pathname === link.href
                    ? 'text-wizard-cyan text-glow-cyan'
                    : 'text-gray-400',
                )}
              >
                {link.label}
                {showBadge && (
                  <span className="ml-2 inline-block min-w-[14px] h-[14px] px-1 font-pixel text-[8px] text-wizard-dark bg-wizard-gold text-center">
                    {inboundCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
