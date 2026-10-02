import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminSidebar } from '@/components/AdminSidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'NEVERMIND — Admin Console & Inventory Operations',
  description: 'Internal management dashboard for NEVERMIND store, products, variants, and China import tracking.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`dark ${inter.variable}`}>
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen flex selection:bg-pink-500/30 selection:text-pink-300">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-900/60 overflow-y-auto min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
