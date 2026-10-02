'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingBag,
  TicketPercent,
  TrendingUp,
  ArrowUpRight,
  PlaneTakeoff,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { fetchProducts, fetchOrders } from '@/lib/api';
import { Product, Order } from '@/types';

export default function AdminDashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [prods, ords] = await Promise.all([fetchProducts(), fetchOrders()]);
        setProducts(prods);
        setOrders(ords);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const activeShipments = orders.filter(
    (o) => o.tracking_status !== 'delivered' && o.payment_status === 'paid'
  );

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Admin Control Center"
        subtitle="Pantau operasional store, katalog produk impor, dan status logistik China ➔ Indonesia"
        actionButton={{
          label: 'Tambah Produk',
          href: '/products',
        }}
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Quick Announcement Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/20 to-zinc-900 border border-pink-500/20 p-6">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-pink-400 font-semibold text-xs tracking-wider uppercase">
                <Sparkles className="w-4 h-4" />
                Live Store Connection Active
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Selamat Datang di NEVERMIND Console
              </h2>
              <p className="text-sm text-zinc-400 max-w-2xl">
                Katalog produk terhubung langsung ke live PostgreSQL Railway backend. Setiap perubahan varian, harga, atau stok akan seketika tercermin di storefront pembeli.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold transition"
              >
                <span>Lihat Storefront</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Products */}
          <Link
            href="/products"
            className="group p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-pink-500/40 transition shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Package className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-pink-400 transition" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-zinc-400 font-medium">Total Produk Aktif</p>
              <h3 className="text-2xl font-black text-white mt-1">
                {loading ? '...' : products.length} <span className="text-xs font-medium text-zinc-500">SKU</span>
              </h3>
            </div>
          </Link>

          {/* Active Shipments (China Tracker) */}
          <Link
            href="/orders"
            className="group p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 transition shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <PlaneTakeoff className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-zinc-400 font-medium">Impor Dalam Perjalanan</p>
              <h3 className="text-2xl font-black text-white mt-1">
                {loading ? '...' : activeShipments.length} <span className="text-xs font-medium text-zinc-500">Pesanan</span>
              </h3>
            </div>
          </Link>

          {/* Revenue */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                Lunas
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-zinc-400 font-medium">Total Omset Pesanan</p>
              <h3 className="text-2xl font-black text-white mt-1">
                Rp {totalRevenue.toLocaleString('id-ID')}
              </h3>
            </div>
          </div>

          {/* Active Vouchers */}
          <Link
            href="/vouchers"
            className="group p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/40 transition shadow-lg relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <TicketPercent className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-zinc-400 font-medium">Promo & Voucher Aktif</p>
              <h3 className="text-2xl font-black text-white mt-1">
                2 <span className="text-xs font-medium text-zinc-500">Campaign</span>
              </h3>
            </div>
          </Link>
        </div>

        {/* Recent Orders Tracker Section */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pesanan Terbaru & Status Impor
                </h3>
                <p className="text-xs text-zinc-500">Live order status dari customer store</p>
              </div>
            </div>
            <Link
              href="/orders"
              className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1"
            >
              Lihat Semua Pesanan
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Item Pesanan</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status Logistik</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {orders.slice(0, 3).map((order) => (
                  <tr key={order.order_id} className="hover:bg-zinc-900/40 transition">
                    <td className="px-4 py-3.5 font-bold text-pink-400">
                      {order.order_id}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-200">{order.customer_name}</div>
                      <div className="text-xs text-zinc-500">{order.city}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-zinc-400">
                      {order.items.map((i) => i.product_name).join(', ')}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-zinc-100">
                      Rp {order.total_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        <Clock className="w-3 h-3 text-indigo-400" />
                        {order.tracking_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href="/orders"
                        className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
                      >
                        Kelola
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
