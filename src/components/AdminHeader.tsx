'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, Database, Sparkles } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export function AdminHeader({ title, subtitle, actionButton }: AdminHeaderProps) {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Live Backend Connection Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-zinc-300 font-medium flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-zinc-400" />
            Railway Live
          </span>
        </div>

        {/* Action Button */}
        {actionButton && (
          actionButton.href ? (
            <Link
              href={actionButton.href}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-pink-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              {actionButton.label}
            </Link>
          ) : (
            <button
              onClick={actionButton.onClick}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shadow-pink-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {actionButton.label}
            </button>
          )
        )}
      </div>
    </header>
  );
}
