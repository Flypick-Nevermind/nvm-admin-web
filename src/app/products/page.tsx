'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { Product, ProductCategoryType } from '@/types';
import { fetchProducts, fetchCategories, createProduct, deleteProduct } from '@/lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for New Product
  const [form, setForm] = useState({
    product_name: '',
    product_description: '',
    category_type_id: '',
    variant_name: '',
    variant_price: 250000,
    variant_qty: 10,
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([fetchProducts(), fetchCategories()]);
      setProducts(prods);
      setCategories(cats);
      if (cats.length > 0 && !form.category_type_id) {
        setForm((prev) => ({ ...prev, category_type_id: cats[0].product_category_type_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name.trim() || !form.variant_name.trim()) {
      setNotification({ type: 'error', message: 'Nama produk dan varian wajib diisi!' });
      return;
    }

    setIsSubmitting(true);
    setNotification(null);

    const success = await createProduct({
      product_name: form.product_name,
      product_description: form.product_description,
      category_type_id: form.category_type_id || (categories[0]?.product_category_type_id ?? ''),
      variant_name: form.variant_name,
      variant_price: Number(form.variant_price),
      variant_qty: Number(form.variant_qty),
      image_url: form.image_url,
    });

    setIsSubmitting(false);

    if (success) {
      setNotification({ type: 'success', message: 'Produk berhasil ditambahkan ke Railway backend!' });
      setIsModalOpen(false);
      // Reset form
      setForm({
        product_name: '',
        product_description: '',
        category_type_id: categories[0]?.product_category_type_id || '',
        variant_name: '',
        variant_price: 250000,
        variant_qty: 10,
        image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
      });
      loadData();
    } else {
      setNotification({ type: 'error', message: 'Gagal menambahkan produk ke backend.' });
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"? Tindakan ini tidak dapat dibatalkan.`)) return;

    const ok = await deleteProduct(productId);
    if (ok) {
      setNotification({ type: 'success', message: `Produk "${name}" berhasil dihapus.` });
      setProducts((prev) => prev.filter((p) => p.product_id !== productId));
    } else {
      setNotification({ type: 'error', message: 'Gagal menghapus produk.' });
    }
  };

  // Filter products
  const filteredProducts = products.filter((prod) => {
    const matchName = prod.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat =
      selectedCategory === 'all' ||
      prod.ms_nevermind_product_categories?.some(
        (c) => c.product_category_type_id === selectedCategory || c.ms_nevermind_product_category_type?.product_category_type_name === selectedCategory
      );
    return matchName && matchCat;
  });

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Katalog & Manajemen Produk"
        subtitle="Kelola produk, variasi stok, dan harga terhubung langsung ke backend Railway"
        actionButton={{
          label: 'Tambah Produk Baru',
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Notification Toast */}
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
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400" />
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

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <Filter className="w-4 h-4 text-zinc-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-900 text-zinc-200">Semua Kategori</option>
                {categories.map((cat) => (
                  <option
                    key={cat.product_category_type_id}
                    value={cat.product_category_type_id}
                    className="bg-zinc-900 text-zinc-200"
                  >
                    {cat.product_category_type_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadData}
              title="Refresh Data"
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Products Table Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-pink-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Daftar Produk ({filteredProducts.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Produk</th>
                  <th className="px-6 py-3.5">Kategori</th>
                  <th className="px-6 py-3.5">Varian & Stok</th>
                  <th className="px-6 py-3.5">Harga</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-500 mb-2" />
                      Memuat katalog produk dari Railway...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      Tidak ada produk ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const variant = prod.ms_nevermind_product_variants;
                    const imageUrl =
                      variant?.ms_nevermind_product_variant_images?.[0]?.product_variant_image_value ||
                      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80';
                    const categoryName =
                      prod.ms_nevermind_product_categories?.[0]?.ms_nevermind_product_category_type
                        ?.product_category_type_name || 'Umum';
                    const price = variant?.product_variant_price
                      ? Number(variant.product_variant_price)
                      : 0;
                    const stock = variant?.product_variant_qty ?? 0;

                    return (
                      <tr key={prod.product_id} className="hover:bg-zinc-900/40 transition">
                        {/* Product Thumbnail & Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                              <img
                                src={imageUrl}
                                alt={prod.product_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-100 hover:text-pink-400 transition cursor-pointer">
                                {prod.product_name}
                              </p>
                              <p className="text-xs text-zinc-500 line-clamp-1">
                                {prod.product_description || 'Tanpa deskripsi'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
                            {categoryName}
                          </span>
                        </td>

                        {/* Variant & Stock */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-200">
                              <Layers className="w-3.5 h-3.5 text-pink-400" />
                              {variant?.product_variant_name || 'Default Variant'}
                            </div>
                            <div className="text-xs">
                              {stock > 5 ? (
                                <span className="text-emerald-400 font-semibold">{stock} pcs tersisa</span>
                              ) : stock > 0 ? (
                                <span className="text-amber-400 font-semibold">{stock} pcs (Stok Menipis)</span>
                              ) : (
                                <span className="text-rose-400 font-semibold">Habis</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-zinc-100">
                            Rp {price.toLocaleString('id-ID')}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Aktif
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`http://localhost:3000/product/${prod.product_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka di Store"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-pink-400 hover:bg-zinc-900 transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteProduct(prod.product_id, prod.product_name)}
                              title="Hapus Produk"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* CREATE PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tambah Produk Baru</h3>
                  <p className="text-xs text-zinc-400">Data akan langsung tersinkronisasi ke katalog store web</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  1. Informasi Produk
                </h4>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nama Produk <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Metallic Silver Puffer Shoulder Bag"
                    value={form.product_name}
                    onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Kategori Produk
                  </label>
                  <select
                    value={form.category_type_id}
                    onChange={(e) => setForm({ ...form, category_type_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  >
                    {categories.map((c) => (
                      <option key={c.product_category_type_id} value={c.product_category_type_id}>
                        {c.product_category_type_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Deskripsi Lengkap
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Jelaskan detail material, dimensi, dan keunikan barang import ini..."
                    value={form.product_description}
                    onChange={(e) => setForm({ ...form, product_description: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Variant, Price & Stock */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  2. Varian & Harga Jual
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Nama Varian Utama <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Chrome Silver / Black Velvet"
                      value={form.variant_name}
                      onChange={(e) => setForm({ ...form, variant_name: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Stok Awal
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.variant_qty}
                      onChange={(e) => setForm({ ...form, variant_qty: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Harga Jual (IDR) <span className="text-pink-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                      Rp
                    </span>
                    <input
                      type="number"
                      step={5000}
                      min={10000}
                      value={form.variant_price}
                      onChange={(e) => setForm({ ...form, variant_price: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-2.5 text-sm text-zinc-200 font-semibold focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* Media URL */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  3. Foto Produk (URL)
                </h4>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    URL Gambar Produk
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <ImageIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={form.image_url}
                        onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                      <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-pink-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan ke Railway...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Simpan & Publikasikan
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
