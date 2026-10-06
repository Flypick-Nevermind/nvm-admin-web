'use client';

import React, { useState, useEffect } from 'react';
import {
  Tags,
  Plus,
  Search,
  FolderTree,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Calendar,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { ProductCategoryType } from '@/types';
import { fetchCategories, createCategoryType } from '@/lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Gagal memuat kategori dari server.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCatName.toLowerCase().trim().replace(/\s+/g, '-');
    if (!cleanName) {
      setNotification({ type: 'error', message: 'Nama kategori wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const success = await createCategoryType(cleanName);
    setIsSubmitting(false);

    if (success) {
      setNotification({
        type: 'success',
        message: `Kategori "${cleanName}" berhasil disimpan ke backend Railway!`,
      });
      setIsModalOpen(false);
      setNewCatName('');
      loadData();
    } else {
      setNotification({
        type: 'error',
        message: `Gagal menambahkan kategori "${cleanName}". Periksa koneksi API.`,
      });
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCategories = categories.filter((c) =>
    c.product_category_type_name.toLowerCase().includes(search.toLowerCase()) ||
    c.product_category_type_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Kategori Produk"
        subtitle="Kelola master taksonomi & kategori produk yang terhubung langsung ke database backend Railway"
        actionButton={{
          label: 'Tambah Kategori',
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3 text-sm font-medium">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar & Search */}
        <div className="flex items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kategori atau ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
            />
          </div>
          <button
            onClick={loadData}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition flex items-center gap-2 text-xs font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Categories Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Daftar Master Kategori ({filteredCategories.length})
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              API Live
            </span>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500" />
                <p className="text-sm">Menghubungkan ke API /api-admin/product-category-types...</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 space-y-2">
                <Tags className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-sm font-medium text-zinc-400">Tidak ada kategori ditemukan.</p>
                <p className="text-xs text-zinc-600">Klik &quot;Tambah Kategori&quot; untuk menambahkan kategori baru ke backend.</p>
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.product_category_type_id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-pink-400 group-hover:border-pink-500/30 transition shrink-0">
                      <Tags className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-zinc-100 text-base">
                          {cat.product_category_type_name}
                        </h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-1">
                          {cat.product_category_type_id}
                          <button
                            onClick={() => handleCopyId(cat.product_category_type_id)}
                            title="Copy Category Type ID"
                            className="text-zinc-500 hover:text-zinc-200 ml-1 transition"
                          >
                            {copiedId === cat.product_category_type_id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </span>
                      </div>
                      {cat.created_at && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          <span>Dibuat: {new Date(cat.created_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium">
                      Tersedia di Store
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH KATEGORI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Tambah Kategori Baru</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Disimpan langsung ke endpoint POST /api-admin/product-category-types</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Nama Kategori / Slug
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Contoh: cute-finds, shoulder-bag, silver-vibes"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Spasi otomatis dikonversi menjadi dash (&apos;-&apos;).
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-pink-500/20 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
