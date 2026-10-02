'use client';

import React, { useState, useEffect } from 'react';
import { Tags, Plus, Search, FolderTree, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { ProductCategoryType } from '@/types';
import { fetchCategories } from '@/lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchCategories();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const slug = newCatName.toLowerCase().trim().replace(/\s+/g, '-');
    const newCat: ProductCategoryType = {
      product_category_type_id: `PCTID-${Math.random().toString(36).substring(2, 9)}`,
      product_category_type_name: slug,
    };

    setCategories((prev) => [...prev, newCat]);
    setIsModalOpen(false);
    setNewCatName('');
    setNotification(`Kategori "${slug}" berhasil ditambahkan.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredCategories = categories.filter((c) =>
    c.product_category_type_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Kategori Produk"
        subtitle="Kelola taksonomi dan tag kurasi untuk katalog store"
        actionButton={{
          label: 'Tambah Kategori',
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-3 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
            />
          </div>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-400' : ''}`} />
          </button>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-pink-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Daftar Kategori ({filteredCategories.length})
            </h3>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {filteredCategories.map((cat) => (
              <div
                key={cat.product_category_type_id}
                className="px-6 py-4 flex items-center justify-between hover:bg-zinc-900/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-pink-400">
                    <Tags className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-100">{cat.product_category_type_name}</h4>
                    <p className="text-xs font-mono text-zinc-500">{cat.product_category_type_id}</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                  Sinkron Backend
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Tambah Kategori Baru</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nama Kategori / Tag Slug
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: vintage-charms atau y2k-shoes"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
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
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-lg shadow-pink-500/20"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
