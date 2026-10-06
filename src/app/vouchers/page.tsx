'use client';

import React, { useState, useEffect } from 'react';
import {
  TicketPercent,
  Plus,
  Search,
  CheckCircle2,
  X,
  Tag,
  Percent,
  DollarSign,
  Copy,
  Trash2,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { Voucher } from '@/types';
import { fetchVouchers, saveVouchers, parseCleanNumber } from '@/lib/api';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [form, setForm] = useState<{
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number | string;
    min_spend: number | string;
    quota: number | string;
  }>({
    code: '',
    discount_type: 'percentage',
    discount_value: 5,
    min_spend: 100000,
    quota: 100,
  });

  useEffect(() => {
    fetchVouchers().then((data) => {
      setVouchers(data);
      setLoading(false);
    });
  }, []);

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return;

    const newV: Voucher = {
      id: `VCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      min_spend: form.min_spend ? Number(form.min_spend) : undefined,
      quota: Number(form.quota),
      used_count: 0,
      is_active: true,
    };

    const updated = [newV, ...vouchers];
    setVouchers(updated);
    saveVouchers(updated);
    setIsModalOpen(false);
    setForm({
      code: '',
      discount_type: 'percentage',
      discount_value: 5,
      min_spend: 100000,
      quota: 100,
    });
    setNotification(`Voucher ${newV.code} berhasil dibuat!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const toggleStatus = (id: string) => {
    const updated = vouchers.map((v) =>
      v.id === id ? { ...v, is_active: !v.is_active } : v
    );
    setVouchers(updated);
    saveVouchers(updated);
  };

  const deleteVoucher = (id: string) => {
    const updated = vouchers.filter((v) => v.id !== id);
    setVouchers(updated);
    saveVouchers(updated);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Promo & Voucher Diskon"
        subtitle="Buat dan kelola kode voucher diskon untuk campaign store"
        actionButton={{
          label: 'Buat Voucher Baru',
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {vouchers.map((v) => (
            <div
              key={v.id}
              className={`p-6 rounded-2xl border transition relative overflow-hidden flex flex-col justify-between ${
                v.is_active
                  ? 'bg-zinc-950 border-zinc-800 hover:border-pink-500/40 shadow-xl'
                  : 'bg-zinc-950/50 border-zinc-900 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-pink-400 bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20">
                    {v.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {v.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-2xl font-black text-white">
                    {v.discount_type === 'percentage'
                      ? `${v.discount_value}% OFF`
                      : `Rp ${v.discount_value.toLocaleString('id-ID')} OFF`}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    {v.min_spend
                      ? `Min. Belanja Rp ${v.min_spend.toLocaleString('id-ID')}`
                      : 'Tanpa minimum belanja'}
                  </p>
                </div>

                <div className="mt-5 space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Penggunaan</span>
                    <span className="font-medium text-zinc-200">
                      {v.used_count} / {v.quota}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (v.used_count / v.quota) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                <button
                  onClick={() => toggleStatus(v.id)}
                  className="text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  {v.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button
                  onClick={() => deleteVoucher(v.id)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE VOUCHER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Buat Voucher Baru</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Kode Voucher (Huruf Besar)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: FLASH10 / NVMNEW"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 font-mono tracking-wider focus:outline-none focus:border-pink-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Tipe Diskon
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discount_type: e.target.value as 'percentage' | 'fixed',
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nilai Diskon
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    required
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: parseCleanNumber(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Minimum Belanja (Rp)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={form.min_spend}
                  onChange={(e) => setForm({ ...form, min_spend: parseCleanNumber(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Kuota Penggunaan
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={form.quota}
                  onChange={(e) => setForm({ ...form, quota: parseCleanNumber(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
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
                  Buat Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
