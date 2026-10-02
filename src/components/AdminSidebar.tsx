'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tags,
  TicketPercent,
  ExternalLink,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuthStore } from '@/store/adminAuthStore';

const navItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Produk & Varian',
    href: '/products',
    icon: Package,
    badge: 'Live',
  },
  {
    name: 'Pesanan & Tracking',
    href: '/orders',
    icon: ShoppingBag,
    badge: '3',
  },
  {
    name: 'Kategori Produk',
    href: '/categories',
    icon: Tags,
    badge: null,
  },
  {
    name: 'Promo & Voucher',
    href: '/vouchers',
    icon: TicketPercent,
    badge: null,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAdminAuthStore();

  return (
    <aside className="w-64 bg-zinc-950 text-zinc-100 flex flex-col border-r border-zinc-800 shrink-0 select-none min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center shadow-lg shadow-pink-500/20 font-black text-white text-lg tracking-wider">
            N
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-white flex items-center gap-1.5 text-base">
              NEVERMIND
              <span className="text-[10px] font-semibold uppercase bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/30">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 tracking-wide">Import & Store Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          Menu Utama
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-pink-400' : 'text-zinc-400 group-hover:text-zinc-300'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.badge === 'Live'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          Akses Eksternal
        </div>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300" />
            <span>Kunjungi Store Web</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 opacity-60" />
        </a>
      </nav>

      {/* Admin User Footer */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-pink-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-zinc-200 truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email || 'admin@nevermind.id'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Keluar"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
