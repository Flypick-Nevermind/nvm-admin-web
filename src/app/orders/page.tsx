'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Truck,
  PlaneTakeoff,
  PackageCheck,
  CheckCircle2,
  Clock,
  X,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { Order, OrderStatus } from '@/types';
import { fetchOrders, saveOrders } from '@/lib/api';

const STATUS_LABELS: Record<OrderStatus, { label: string; color: string }> = {
  payment_confirmed: { label: '1. Pembayaran Terkonfirmasi', color: 'text-zinc-400 bg-zinc-800' },
  ordered_to_supplier: { label: '2. Dipesan ke Supplier China', color: 'text-amber-400 bg-amber-950/40 border border-amber-800/40' },
  qc_passed: { label: '3. QC Gudang China Passed', color: 'text-blue-400 bg-blue-950/40 border border-blue-800/40' },
  in_transit: { label: '4. Penerbangan Int. Menuju Indo', color: 'text-purple-400 bg-purple-950/40 border border-purple-800/40' },
  customs_cleared: { label: '5. Lolos Bea Cukai Bandara', color: 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40' },
  at_local_hub: { label: '6. Tiba di Hub Jakarta Sortir', color: 'text-indigo-400 bg-indigo-950/40 border border-indigo-800/40' },
  out_for_delivery: { label: '7. Kurir Menuju Alamat', color: 'text-orange-400 bg-orange-950/40 border border-orange-800/40' },
  delivered: { label: '8. Paket Diterima', color: 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus>('payment_confirmed');
  const [chinaResi, setChinaResi] = useState('');
  const [localResi, setLocalResi] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders().then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  const openUpdateModal = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.tracking_status);
    setChinaResi(order.tracking_number_china || '');
    setLocalResi(order.tracking_number_local || '');
    setIsModalOpen(true);
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const updated = orders.map((o) => {
      if (o.order_id === selectedOrder.order_id) {
        return {
          ...o,
          tracking_status: newStatus,
          tracking_number_china: chinaResi,
          tracking_number_local: localResi,
        };
      }
      return o;
    });

    setOrders(updated);
    saveOrders(updated);
    setIsModalOpen(false);
    setNotification(`Status pesanan ${selectedOrder.order_id} berhasil diupdate ke "${STATUS_LABELS[newStatus].label}"`);
    setTimeout(() => setNotification(null), 4000);
  };

  const sendWhatsAppUpdate = (order: Order) => {
    const cleanPhone = order.customer_whatsapp.replace(/[^0-9]/g, '');
    const phone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const msg = `Halo Kak ${order.customer_name}! Update pesanan NEVERMIND (${order.order_id}): Paket saat ini berstatus [${STATUS_LABELS[order.tracking_status].label}]. Resi Pelacakan: ${order.tracking_number_china || order.tracking_number_local || 'Sedang proses penerbitan'}. Terima kasih! ✨`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.order_id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Pesanan & Tracking Impor China"
        subtitle="Kelola pesanan customer dan perbarui 8-tahap status pengiriman lintas batas"
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Order ID, Nama Pembeli, atau Kota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
            />
          </div>
          <div className="text-xs text-zinc-400">
            Total <span className="font-bold text-white">{filteredOrders.length}</span> Pesanan
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Order ID & Waktu</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Item Impor</th>
                  <th className="px-6 py-4">Total & Bayar</th>
                  <th className="px-6 py-4">Tahapan Pengiriman</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      Memuat pesanan...
                    </td>
                  </tr>
                ) : filteredOrders.map((order) => {
                  const statusInfo = STATUS_LABELS[order.tracking_status] || {
                    label: order.tracking_status,
                    color: 'text-zinc-400 bg-zinc-800',
                  };

                  return (
                    <tr key={order.order_id} className="hover:bg-zinc-900/40 transition">
                      {/* ID & Date */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-pink-400 block">
                          {order.order_id}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {new Date(order.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-zinc-100">{order.customer_name}</p>
                        <p className="text-xs text-zinc-400">{order.customer_whatsapp}</p>
                        <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                          {order.city}
                        </p>
                      </td>

                      {/* Items */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <img
                                src={it.image}
                                alt={it.product_name}
                                className="w-7 h-7 rounded-lg object-cover bg-zinc-800"
                              />
                              <div className="text-xs">
                                <span className="text-zinc-200 font-medium">{it.product_name}</span>
                                <span className="text-zinc-500 block">x{it.qty} ({it.variant_name})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-6 py-4">
                        <span className="font-bold text-zinc-100 block">
                          Rp {order.total_amount.toLocaleString('id-ID')}
                        </span>
                        <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded uppercase mt-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {order.payment_method}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                          <PlaneTakeoff className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                        {order.tracking_number_china && (
                          <div className="text-[11px] text-zinc-400 font-mono mt-1">
                            Resi CN: {order.tracking_number_china}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => sendWhatsAppUpdate(order)}
                            title="Kirim Update ke WhatsApp Customer"
                            className="p-2 rounded-xl text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openUpdateModal(order)}
                            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer"
                          >
                            Update Status
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* UPDATE STATUS MODAL */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Update Status Logistik</h3>
                <p className="text-xs text-zinc-400 font-mono">Pesanan #{selectedOrder.order_id}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Tahapan Saat Ini
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  {Object.entries(STATUS_LABELS).map(([key, val]) => (
                    <option key={key} value={key} className="bg-zinc-950 text-zinc-200">
                      {val.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nomor Resi China (Air Freight / SF Express)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SF-CN-982312019"
                  value={chinaResi}
                  onChange={(e) => setChinaResi(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nomor Resi Domestik Indonesia (JNE / SiCepat / Lion)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: JNE-012398471"
                  value={localResi}
                  onChange={(e) => setLocalResi(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-lg shadow-pink-500/20 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
