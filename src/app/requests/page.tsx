'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  MessageSquare,
  ExternalLink,
  PackagePlus,
  CheckCircle2,
  Clock,
  SearchCheck,
  AlertCircle,
  X,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { BagRequest, BagRequestStatus } from '@/types';
import { fetchBagRequests, saveBagRequests, createProduct, fetchCategories } from '@/lib/api';

const STATUS_CONFIG: Record<BagRequestStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: {
    label: 'Menunggu Review',
    color: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
    icon: Clock,
  },
  searching: {
    label: 'Cari Supplier China',
    color: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
    icon: SearchCheck,
  },
  quoted: {
    label: 'Harga Diberikan (Quoted)',
    color: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
    icon: MessageSquare,
  },
  converted: {
    label: 'Diterbitkan ke Katalog',
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Dibatalkan',
    color: 'text-zinc-400 bg-zinc-800 border-zinc-700',
    icon: X,
  },
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<BagRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedReq, setSelectedReq] = useState<BagRequest | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Supplier update form state
  const [supplierForm, setSupplierForm] = useState({
    status: 'searching' as BagRequestStatus,
    supplier_link: '',
    supplier_cost_cny: 0,
    quoted_price_idr: 0,
  });

  // Convert to product form state
  const [convertForm, setConvertForm] = useState({
    product_name: '',
    product_description: '',
    category_type_id: '',
    variant_name: 'Original Import',
    variant_price: 250000,
    variant_qty: 10,
    image_url: '',
  });

  const loadData = async () => {
    setLoading(true);
    const data = await fetchBagRequests();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openSupplierModal = (req: BagRequest) => {
    setSelectedReq(req);
    setSupplierForm({
      status: req.status,
      supplier_link: req.supplier_link || '',
      supplier_cost_cny: req.supplier_cost_cny || 0,
      quoted_price_idr: req.quoted_price_idr || 0,
    });
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    const updated = requests.map((r) => {
      if (r.request_id === selectedReq.request_id) {
        return {
          ...r,
          status: supplierForm.status,
          supplier_link: supplierForm.supplier_link,
          supplier_cost_cny: Number(supplierForm.supplier_cost_cny),
          quoted_price_idr: Number(supplierForm.quoted_price_idr),
        };
      }
      return r;
    });

    setRequests(updated);
    saveBagRequests(updated);
    setIsSupplierModalOpen(false);
    setNotification(`Data supplier untuk request "${selectedReq.bag_name}" berhasil disimpan.`);
    setTimeout(() => setNotification(null), 3500);
  };

  const openConvertModal = async (req: BagRequest) => {
    setSelectedReq(req);
    const categories = await fetchCategories();
    setConvertForm({
      product_name: req.bag_name,
      product_description: `[Request Jastip Eksklusif] ${req.notes || 'Tas import kualitas premium sesuai kurasi customer.'}`,
      category_type_id: categories[0]?.product_category_type_id || '',
      variant_name: 'Original Import',
      variant_price: req.quoted_price_idr || 250000,
      variant_qty: 5,
      image_url:
        req.reference_url ||
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
    });
    setIsConvertModalOpen(true);
  };

  const handleConvertProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setIsSubmitting(true);
    const success = await createProduct({
      product_name: convertForm.product_name,
      product_description: convertForm.product_description,
      category_type_id: convertForm.category_type_id,
      variant_name: convertForm.variant_name,
      variant_price: Number(convertForm.variant_price),
      variant_qty: Number(convertForm.variant_qty),
      image_url: convertForm.image_url,
    });

    setIsSubmitting(false);

    if (success) {
      // Mark request as converted
      const updated = requests.map((r) =>
        r.request_id === selectedReq.request_id
          ? { ...r, status: 'converted' as BagRequestStatus }
          : r
      );
      setRequests(updated);
      saveBagRequests(updated);
      setIsConvertModalOpen(false);
      setNotification(`🎉 Tas "${convertForm.product_name}" berhasil dijadikan produk toko di Railway backend!`);
      setTimeout(() => setNotification(null), 4000);
    } else {
      alert('Gagal membuat produk ke backend.');
    }
  };

  const sendWhatsAppQuote = (req: BagRequest) => {
    const cleanPhone = req.customer_whatsapp.replace(/[^0-9]/g, '');
    const phone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const priceText = req.quoted_price_idr
      ? `Rp ${req.quoted_price_idr.toLocaleString('id-ID')}`
      : '(Sedang dikalkulasi)';
    const msg = `Halo Kak ${req.customer_name}! ✨ Terkait request jastip tas *"${req.bag_name}"*, tasnya sudah kami temukan dari supplier China! \n\n💰 Penawaran Harga All-in (termasuk ongkir China-Indo & bea cukai): *${priceText}*\n\nApakah cocok dan mau langsung kami buatkan link checkout-nya di web? Terima kasih! ♡`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredRequests = requests.filter((r) => {
    const matchSearch =
      r.bag_name.toLowerCase().includes(search.toLowerCase()) ||
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.request_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Request Bag & Jastip China"
        subtitle="Kelola pesanan jastip tas dari Taobao & XiaoHongShu, pantau supplier, dan terbitkan ke katalog"
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-zinc-400">Total Request Masuk</p>
            <p className="text-xl font-black text-white mt-1">{requests.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-amber-400">Menunggu / Cari Supplier</p>
            <p className="text-xl font-black text-white mt-1">
              {requests.filter((r) => r.status === 'pending' || r.status === 'searching').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-purple-400">Sudah Diberi Harga (Quoted)</p>
            <p className="text-xl font-black text-white mt-1">
              {requests.filter((r) => r.status === 'quoted').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <p className="text-xs text-emerald-400">Deal & Masuk Katalog</p>
            <p className="text-xl font-black text-white mt-1">
              {requests.filter((r) => r.status === 'converted').length}
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari tas impian, nama pembeli, atau ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['all', 'pending', 'searching', 'quoted', 'converted'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {st === 'all' ? 'Semua Request' : STATUS_CONFIG[st as BagRequestStatus]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Request & Foto Referensi</th>
                  <th className="px-6 py-4">Customer & Budget</th>
                  <th className="px-6 py-4">Status & Supplier China</th>
                  <th className="px-6 py-4">Penawaran (IDR)</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      Memuat daftar request...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      Tidak ada request ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const statusCfg = STATUS_CONFIG[req.status];
                    const StatusIcon = statusCfg.icon;

                    return (
                      <tr key={req.request_id} className="hover:bg-zinc-900/40 transition">
                        {/* Bag Image & Details */}
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3.5">
                            <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                              {req.reference_url ? (
                                <img
                                  src={req.reference_url}
                                  alt={req.bag_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  <Sparkles className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <span className="font-mono text-[10px] text-pink-400 block font-bold">
                                {req.request_id}
                              </span>
                              <p className="font-semibold text-zinc-100 text-sm max-w-xs">
                                {req.bag_name}
                              </p>
                              {req.notes && (
                                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                                  "{req.notes}"
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Customer & Budget */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-zinc-200">{req.customer_name}</p>
                          <p className="text-xs text-zinc-400 font-mono">{req.customer_whatsapp}</p>
                          <div className="mt-1">
                            <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                              {req.budget || 'Budget Bebas'}
                            </span>
                          </div>
                        </td>

                        {/* Status & Supplier */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.color}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>

                          {req.supplier_link ? (
                            <a
                              href={req.supplier_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-pink-400 transition mt-1.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Link Taobao/1688 (¥{req.supplier_cost_cny || 0})</span>
                            </a>
                          ) : (
                            <p className="text-[11px] text-zinc-500 mt-1">Belum ada link supplier</p>
                          )}
                        </td>

                        {/* Quoted Price */}
                        <td className="px-6 py-4">
                          {req.quoted_price_idr ? (
                            <div>
                              <p className="font-bold text-zinc-100 text-sm">
                                Rp {req.quoted_price_idr.toLocaleString('id-ID')}
                              </p>
                              <p className="text-[10px] text-emerald-400">Harga All-In</p>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* WhatsApp Quote */}
                            <button
                              onClick={() => sendWhatsAppQuote(req)}
                              title="Chat WhatsApp Customer"
                              className="p-2 rounded-xl text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            {/* Edit Supplier */}
                            <button
                              onClick={() => openSupplierModal(req)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer"
                            >
                              Supplier & Harga
                            </button>

                            {/* 1-Click Convert to Product */}
                            {req.status !== 'converted' ? (
                              <button
                                onClick={() => openConvertModal(req)}
                                title="Jadikan Produk Live di Storefront"
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition cursor-pointer"
                              >
                                <PackagePlus className="w-3.5 h-3.5" />
                                <span>Jadikan Produk</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                                Sudah di Katalog
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: SUPPLIER & PRICE QUOTE */}
      {isSupplierModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Update Supplier & Harga</h3>
                <p className="text-xs text-zinc-400">Request: {selectedReq.bag_name}</p>
              </div>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Status Request
                </label>
                <select
                  value={supplierForm.status}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, status: e.target.value as BagRequestStatus })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500 cursor-pointer"
                >
                  <option value="pending">Menunggu Review</option>
                  <option value="searching">Sedang Cari Supplier di Taobao/1688</option>
                  <option value="quoted">Harga Sudah Diberikan (Quoted)</option>
                  <option value="converted">Deal & Diterbitkan ke Katalog</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Link Supplier China (Taobao / 1688 / Weidian)
                </label>
                <input
                  type="url"
                  placeholder="https://item.taobao.com/item.htm?id=..."
                  value={supplierForm.supplier_link}
                  onChange={(e) => setSupplierForm({ ...supplierForm, supplier_link: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Modal Supplier (¥ RMB)
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 45"
                    value={supplierForm.supplier_cost_cny}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, supplier_cost_cny: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Harga Penawaran Customer (IDR)
                  </label>
                  <input
                    type="number"
                    step={5000}
                    placeholder="Contoh: 285000"
                    value={supplierForm.quoted_price_idr}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, quoted_price_idr: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-lg shadow-pink-500/20 cursor-pointer"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 1-CLICK CONVERT TO LIVE PRODUCT */}
      {isConvertModalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Jadikan Produk Toko Live</h3>
                  <p className="text-xs text-zinc-400">
                    Otomatis dipublikasikan ke Railway backend agar customer bisa checkout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConvertModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nama Produk di Katalog
                </label>
                <input
                  type="text"
                  required
                  value={convertForm.product_name}
                  onChange={(e) => setConvertForm({ ...convertForm, product_name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={2}
                  value={convertForm.product_description}
                  onChange={(e) =>
                    setConvertForm({ ...convertForm, product_description: e.target.value })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nama Varian
                  </label>
                  <input
                    type="text"
                    value={convertForm.variant_name}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, variant_name: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Stok Tersedia
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={convertForm.variant_qty}
                    onChange={(e) =>
                      setConvertForm({ ...convertForm, variant_qty: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Harga Jual Akhir (IDR)
                </label>
                <input
                  type="number"
                  step={5000}
                  value={convertForm.variant_price}
                  onChange={(e) =>
                    setConvertForm({ ...convertForm, variant_price: Number(e.target.value) })
                  }
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 font-bold focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  URL Foto Produk
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={convertForm.image_url}
                    onChange={(e) => setConvertForm({ ...convertForm, image_url: e.target.value })}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                    <img src={convertForm.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-pink-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Membuat Produk...
                    </>
                  ) : (
                    <>
                      <PackagePlus className="w-4 h-4" />
                      Publikasikan Sekarang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
