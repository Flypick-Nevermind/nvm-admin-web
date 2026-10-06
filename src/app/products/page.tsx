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
  Edit3,
  Power,
  Tag,
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { Product, ProductCategoryType, ProductVariant } from '@/types';
import {
  fetchProducts,
  fetchCategories,
  fetchProductVariants,
  createProduct,
  updateProduct,
  updateMultipleProductVariants,
  deleteProductVariant,
  deleteProduct,
  ProductVariantItemInput,
  UpdateProductVariantInput,
  VariantImageItem,
  parseCleanNumber,
  formatImageUrl,
} from '@/lib/api';

// Interface for new product variant form state with multiple image URLs
interface CreateVariantFormItem {
  variant_name: string;
  variant_description: string;
  variant_price: number | string;
  variant_qty: number | string;
  image_urls: string[];
}

// Interface for editing product variant form state with multiple images
interface EditVariantFormItem {
  product_variant_id: string;
  product_id: string;
  product_variant_name: string;
  product_variant_description: string;
  product_variant_price: number | string;
  product_variant_qty: number | string;
  is_active: boolean;
  images: Array<{
    product_variant_image_id?: string;
    product_variant_id?: string;
    image_provider_id?: string;
    product_variant_image_value: string;
  }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoadingEditVariants, setIsLoadingEditVariants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State for Creating New Product
  const [createForm, setCreateForm] = useState({
    product_name: '',
    product_description: '',
    category_type_id: '',
  });

  // Multiple variants state for New Product (each variant supports multiple image URLs)
  const [createVariants, setCreateVariants] = useState<CreateVariantFormItem[]>([
    {
      variant_name: 'Regular',
      variant_description: '',
      variant_price: 250000,
      variant_qty: 10,
      image_urls: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80'],
    },
  ]);

  // Form State for Editing Product Info
  const [editProductForm, setEditProductForm] = useState({
    product_name: '',
    product_description: '',
    is_active: true,
  });

  // Multiple variants state for Editing Product (each variant supports multiple images)
  const [editVariants, setEditVariants] = useState<EditVariantFormItem[]>([]);
  const [activeVariantTab, setActiveVariantTab] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([fetchProducts(), fetchCategories()]);

      // Enrich each product with all of its variants from GET /api-admin/product-variants/{id}
      const enrichedProds = await Promise.all(
        prods.map(async (p) => {
          try {
            const variants = await fetchProductVariants(p.product_id);
            return {
              ...p,
              all_variants:
                variants && variants.length > 0
                  ? variants
                  : p.ms_nevermind_product_variants
                  ? [p.ms_nevermind_product_variants].flat()
                  : [],
            };
          } catch {
            return p;
          }
        })
      );

      setProducts(enrichedProds);
      setCategories(cats);

      if (cats.length > 0 && !createForm.category_type_id) {
        setCreateForm((prev) => ({ ...prev, category_type_id: cats[0].product_category_type_id }));
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Gagal memuat produk dari Railway backend.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Create Product Handlers ──────────────────────────────────────────────

  const handleAddCreateVariant = () => {
    const first = createVariants[0];
    setCreateVariants((prev) => [
      ...prev,
      {
        variant_name: `Varian #${prev.length + 1}`,
        variant_description: '',
        variant_price: first?.variant_price || 250000,
        variant_qty: 10,
        image_urls: first?.image_urls?.[0] ? [first.image_urls[0]] : ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80'],
      },
    ]);
  };

  const handleRemoveCreateVariant = (index: number) => {
    if (createVariants.length <= 1) return;
    setCreateVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCreateVariantField = (
    index: number,
    field: keyof Omit<CreateVariantFormItem, 'image_urls'>,
    value: string | number
  ) => {
    setCreateVariants((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddCreateVariantImage = (variantIndex: number) => {
    setCreateVariants((prev) =>
      prev.map((item, i) =>
        i === variantIndex ? { ...item, image_urls: [...item.image_urls, ''] } : item
      )
    );
  };

  const handleRemoveCreateVariantImage = (variantIndex: number, imageIndex: number) => {
    setCreateVariants((prev) =>
      prev.map((item, i) => {
        if (i !== variantIndex) return item;
        if (item.image_urls.length <= 1) return item;
        return {
          ...item,
          image_urls: item.image_urls.filter((_, imgI) => imgI !== imageIndex),
        };
      })
    );
  };

  const handleUpdateCreateVariantImage = (
    variantIndex: number,
    imageIndex: number,
    value: string
  ) => {
    const formatted = formatImageUrl(value);
    setCreateVariants((prev) =>
      prev.map((item, i) => {
        if (i !== variantIndex) return item;
        const newUrls = [...item.image_urls];
        newUrls[imageIndex] = formatted;
        return { ...item, image_urls: newUrls };
      })
    );
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.product_name.trim()) {
      setNotification({ type: 'error', message: 'Nama produk wajib diisi!' });
      return;
    }

    for (let i = 0; i < createVariants.length; i++) {
      if (!createVariants[i].variant_name.trim()) {
        setNotification({ type: 'error', message: `Nama untuk Varian #${i + 1} wajib diisi!` });
        return;
      }
    }

    setIsSubmitting(true);
    setNotification(null);

    const success = await createProduct({
      product_name: createForm.product_name.trim(),
      product_description: createForm.product_description.trim(),
      category_type_id: createForm.category_type_id || (categories[0]?.product_category_type_id ?? ''),
      variants: createVariants.map((v) => ({
        variant_name: v.variant_name,
        variant_description: v.variant_description,
        variant_price: v.variant_price,
        variant_qty: v.variant_qty,
        image_urls: v.image_urls.filter((url) => url.trim().length > 0),
      })),
    });

    setIsSubmitting(false);

    if (success) {
      setNotification({
        type: 'success',
        message: `Produk baru berhasil dibuat dengan ${createVariants.length} varian di backend Railway!`,
      });
      setIsCreateModalOpen(false);
      // Reset form
      setCreateForm({
        product_name: '',
        product_description: '',
        category_type_id: categories[0]?.product_category_type_id || '',
      });
      setCreateVariants([
        {
          variant_name: 'Regular',
          variant_description: '',
          variant_price: 250000,
          variant_qty: 10,
          image_urls: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80'],
        },
      ]);
      loadData();
    } else {
      setNotification({
        type: 'error',
        message: 'Gagal menambahkan produk ke backend. Periksa payload atau koneksi API.',
      });
    }
  };

  // ─── Edit Product & Multiple Variants Handlers ────────────────────────────

  const openEditModal = async (prod: Product) => {
    setEditingProduct(prod);
    setActiveVariantTab(0);
    setEditProductForm({
      product_name: prod.product_name || '',
      product_description: prod.product_description || '',
      is_active: prod.is_active ?? true,
    });
    setEditVariants([]);
    setIsLoadingEditVariants(true);

    try {
      const liveVariants = await fetchProductVariants(prod.product_id);
      if (liveVariants && liveVariants.length > 0) {
        setEditVariants(
          liveVariants.map((v) => {
            const rawImages: VariantImageItem[] = (v.ms_nevermind_product_variant_images || []).map((img) => ({
              product_variant_image_id: img.product_variant_image_id,
              product_variant_id: v.product_variant_id,
              image_provider_id: img.image_provider_id || 'IPID-000002',
              product_variant_image_value: img.product_variant_image_value || '',
            }));

            // If no images exist, provide one placeholder entry
            if (rawImages.length === 0) {
              rawImages.push({
                product_variant_id: v.product_variant_id,
                image_provider_id: 'IPID-000002',
                product_variant_image_value: '',
              });
            }

            return {
              product_variant_id: v.product_variant_id || '',
              product_id: prod.product_id,
              product_variant_name: v.product_variant_name || 'Standard',
              product_variant_description: v.product_variant_description || '',
              product_variant_price: v.product_variant_price !== undefined ? Number(v.product_variant_price) : 0,
              product_variant_qty: v.product_variant_qty !== undefined ? Number(v.product_variant_qty) : 0,
              is_active: v.is_active ?? true,
              images: rawImages,
            };
          })
        );
      } else {
        // Fallback to variant attached to product
        const fallback = Array.isArray(prod.ms_nevermind_product_variants)
          ? prod.ms_nevermind_product_variants[0]
          : prod.ms_nevermind_product_variants;

        if (fallback) {
          const rawImages: VariantImageItem[] = (fallback.ms_nevermind_product_variant_images || []).map((img) => ({
            product_variant_image_id: img.product_variant_image_id,
            product_variant_id: fallback.product_variant_id,
            image_provider_id: img.image_provider_id || 'IPID-000002',
            product_variant_image_value: img.product_variant_image_value || '',
          }));

          if (rawImages.length === 0) {
            rawImages.push({
              product_variant_id: fallback.product_variant_id,
              image_provider_id: 'IPID-000002',
              product_variant_image_value: '',
            });
          }

          setEditVariants([
            {
              product_variant_id: fallback.product_variant_id || '',
              product_id: prod.product_id,
              product_variant_name: fallback.product_variant_name || 'Standard',
              product_variant_description: fallback.product_variant_description || '',
              product_variant_price: fallback.product_variant_price !== undefined ? Number(fallback.product_variant_price) : 0,
              product_variant_qty: fallback.product_variant_qty !== undefined ? Number(fallback.product_variant_qty) : 0,
              is_active: fallback.is_active ?? true,
              images: rawImages,
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Error fetching variants for edit:', err);
    } finally {
      setIsLoadingEditVariants(false);
    }
  };

  const handleUpdateEditVariantField = (
    index: number,
    field: keyof Omit<EditVariantFormItem, 'images'>,
    value: string | number | boolean
  ) => {
    setEditVariants((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddEditVariantImage = (variantIndex: number) => {
    setEditVariants((prev) =>
      prev.map((item, i) => {
        if (i !== variantIndex) return item;
        return {
          ...item,
          images: [
            ...item.images,
            {
              product_variant_id: item.product_variant_id,
              image_provider_id: 'IPID-000002',
              product_variant_image_value: '',
            },
          ],
        };
      })
    );
  };

  const handleRemoveEditVariantImage = (variantIndex: number, imageIndex: number) => {
    setEditVariants((prev) =>
      prev.map((item, i) => {
        if (i !== variantIndex) return item;
        if (item.images.length <= 1) return item;
        return {
          ...item,
          images: item.images.filter((_, imgI) => imgI !== imageIndex),
        };
      })
    );
  };

  const handleUpdateEditVariantImage = (
    variantIndex: number,
    imageIndex: number,
    value: string
  ) => {
    const formatted = formatImageUrl(value);
    setEditVariants((prev) =>
      prev.map((item, i) => {
        if (i !== variantIndex) return item;
        const newImages = [...item.images];
        newImages[imageIndex] = {
          ...newImages[imageIndex],
          product_variant_image_value: formatted,
        };
        return { ...item, images: newImages };
      })
    );
  };

  const handleDeleteSingleVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Hapus varian "${variantName}" dari database backend?`)) return;

    const ok = await deleteProductVariant(variantId);
    if (ok) {
      setEditVariants((prev) => prev.filter((v) => v.product_variant_id !== variantId));
      if (activeVariantTab >= editVariants.length - 1) {
        setActiveVariantTab(Math.max(0, editVariants.length - 2));
      }
      setNotification({
        type: 'success',
        message: `Varian "${variantName}" berhasil dihapus dari backend.`,
      });
      loadData();
    } else {
      setNotification({ type: 'error', message: 'Gagal menghapus varian.' });
    }
  };

  const handleUpdateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsSubmitting(true);
    setNotification(null);

    // 1. Update basic product information (PATCH /api-admin/products)
    const updateProdOk = await updateProduct({
      product_id: editingProduct.product_id,
      product_name: editProductForm.product_name.trim(),
      product_description: editProductForm.product_description.trim(),
      is_active: editProductForm.is_active,
    });

    // 2. Update all multiple variants in parallel (PATCH /api-admin/product-variants)
    let variantsOk = true;
    if (editVariants.length > 0) {
      const variantsToSave: UpdateProductVariantInput[] = editVariants.map((v) => ({
        product_variant_id: v.product_variant_id,
        product_id: v.product_id,
        product_variant_name: v.product_variant_name,
        product_variant_description: v.product_variant_description,
        product_variant_price: v.product_variant_price,
        product_variant_qty: v.product_variant_qty,
        is_active: v.is_active,
        images: v.images.filter((img) => img.product_variant_image_value.trim().length > 0),
      }));

      variantsOk = await updateMultipleProductVariants(variantsToSave);
    }

    setIsSubmitting(false);

    if (updateProdOk && variantsOk) {
      setNotification({
        type: 'success',
        message: `Produk "${editProductForm.product_name}" dan ${editVariants.length} variannya berhasil diperbarui!`,
      });
      setEditingProduct(null);
      loadData();
    } else if (updateProdOk) {
      setNotification({
        type: 'success',
        message: 'Informasi produk berhasil diperbarui, namun beberapa varian gagal disinkronkan.',
      });
      setEditingProduct(null);
      loadData();
    } else {
      setNotification({
        type: 'error',
        message: 'Gagal memperbarui produk di backend Railway.',
      });
    }
  };

  const handleToggleActive = async (prod: Product) => {
    const newStatus = !prod.is_active;
    const ok = await updateProduct({
      product_id: prod.product_id,
      product_name: prod.product_name,
      product_description: prod.product_description || '',
      is_active: newStatus,
    });

    if (ok) {
      setProducts((prev) =>
        prev.map((p) => (p.product_id === prod.product_id ? { ...p, is_active: newStatus } : p))
      );
      setNotification({
        type: 'success',
        message: `Status "${prod.product_name}" diubah menjadi ${newStatus ? 'Aktif' : 'Non-aktif'}.`,
      });
    } else {
      setNotification({ type: 'error', message: 'Gagal memperbarui status produk.' });
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!confirm(`Non-aktifkan produk "${prod.product_name}" dari katalog?`)) return;

    const ok = await deleteProduct(prod.product_id, prod);
    if (ok) {
      setNotification({
        type: 'success',
        message: `Produk "${prod.product_name}" telah dinon-aktifkan.`,
      });
      loadData();
    } else {
      setNotification({ type: 'error', message: 'Gagal menonaktifkan produk.' });
    }
  };

  // ─── Filter & Metrics ─────────────────────────────────────────────────────

  const filteredProducts = products.filter((prod) => {
    const matchName =
      prod.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.product_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCat =
      selectedCategory === 'all' ||
      prod.ms_nevermind_product_categories?.some(
        (c) =>
          c.product_category_type_id === selectedCategory ||
          c.ms_nevermind_product_category_type?.product_category_type_name === selectedCategory
      );

    const matchStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' && prod.is_active) ||
      (selectedStatus === 'inactive' && !prod.is_active);

    return matchName && matchCat && matchStatus;
  });

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const totalStock = products.reduce((acc, p) => {
    const vars = p.all_variants || (p.ms_nevermind_product_variants ? [p.ms_nevermind_product_variants].flat() : []);
    const sum = vars.reduce((s, v) => s + (Number(v.product_variant_qty) || 0), 0);
    return acc + sum;
  }, 0);

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Katalog & Manajemen Produk"
        subtitle="Kelola produk, variasi berganda, multiple foto varian, harga, dan stok terhubung langsung ke Railway"
        actionButton={{
          label: 'Tambah Produk Baru',
          onClick: () => setIsCreateModalOpen(true),
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

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Produk</p>
              <p className="text-2xl font-black text-white mt-1">{totalProducts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Produk Aktif</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{activeProducts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Power className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Stok Tersedia</p>
              <p className="text-2xl font-black text-white mt-1">
                {totalStock} <span className="text-xs font-normal text-zinc-500">pcs</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-md">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau ID produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Filter Kategori */}
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

            {/* Filter Status */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-transparent text-sm text-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-900 text-zinc-200">Semua Status</option>
                <option value="active" className="bg-zinc-900 text-zinc-200">Hanya Aktif</option>
                <option value="inactive" className="bg-zinc-900 text-zinc-200">Hanya Non-Aktif</option>
              </select>
            </div>

            <button
              onClick={loadData}
              title="Refresh Data dari Server"
              className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-pink-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
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
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              API Live Railway
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Produk</th>
                  <th className="px-6 py-3.5">Kategori</th>
                  <th className="px-6 py-3.5">Varian & Stok</th>
                  <th className="px-6 py-3.5">Rentang Harga</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-500">
                      <RefreshCw className="w-7 h-7 animate-spin mx-auto text-pink-500 mb-3" />
                      <p className="text-sm font-medium text-zinc-300">Memuat katalog & varian dari backend Railway...</p>
                      <p className="text-xs text-zinc-600 mt-1">Mengambil dari GET /api-admin/products</p>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-zinc-500">
                      <Package className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                      <p className="text-sm font-semibold text-zinc-300">Tidak ada produk yang cocok.</p>
                      <p className="text-xs text-zinc-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter kategori.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const variants =
                      prod.all_variants && prod.all_variants.length > 0
                        ? prod.all_variants
                        : prod.ms_nevermind_product_variants
                        ? [prod.ms_nevermind_product_variants].flat()
                        : [];

                    const primaryVariant = variants[0];
                    const variantImages = primaryVariant?.ms_nevermind_product_variant_images || [];
                    const imageUrl =
                      variantImages[0]?.product_variant_image_value ||
                      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80';

                    const totalProdStock = variants.reduce(
                      (sum, v) => sum + (Number(v.product_variant_qty) || 0),
                      0
                    );

                    // Count total photos across all variants of this product
                    const totalPhotosCount = variants.reduce(
                      (sum, v) => sum + (v.ms_nevermind_product_variant_images?.length || 0),
                      0
                    );

                    // Price range calculation
                    const prices = variants.map((v) => Number(v.product_variant_price) || 0);
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
                    const priceDisplay =
                      minPrice === maxPrice
                        ? `Rp ${minPrice.toLocaleString('id-ID')}`
                        : `Rp ${minPrice.toLocaleString('id-ID')} - ${maxPrice.toLocaleString('id-ID')}`;

                    const isActive = prod.is_active ?? true;

                    return (
                      <tr key={prod.product_id} className="hover:bg-zinc-900/40 transition">
                        {/* Product Thumbnail & Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 relative flex items-center justify-center">
                              {imageUrl ? (
                                <img
                                  key={formatImageUrl(imageUrl)}
                                  src={formatImageUrl(imageUrl)}
                                  alt={prod.product_name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes('photo-1584917865442')) {
                                      target.src =
                                        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80';
                                    }
                                  }}
                                />
                              ) : (
                                <ImageIcon className="w-5 h-5 text-zinc-600" />
                              )}
                              {totalPhotosCount > 1 && (
                                <span className="absolute bottom-0.5 right-0.5 bg-black/80 backdrop-blur-xs text-[9px] font-bold text-pink-300 px-1 py-0.2 rounded border border-pink-500/30">
                                  {totalPhotosCount}📷
                                </span>
                              )}
                            </div>
                            <div>
                              <p
                                onClick={() => openEditModal(prod)}
                                className="font-semibold text-zinc-100 hover:text-pink-400 transition cursor-pointer flex items-center gap-1.5"
                              >
                                {prod.product_name}
                              </p>
                              <p className="text-xs text-zinc-500 line-clamp-1 max-w-xs">
                                {prod.product_description || 'Tanpa deskripsi'}
                              </p>
                              <span className="text-[10px] font-mono text-zinc-600">
                                {prod.product_id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {prod.ms_nevermind_product_categories && prod.ms_nevermind_product_categories.length > 0 ? (
                              prod.ms_nevermind_product_categories.map((c) => (
                                <span
                                  key={c.product_category_id || c.product_category_type_id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300"
                                >
                                  <Tag className="w-3 h-3 text-pink-400" />
                                  {c.ms_nevermind_product_category_type?.product_category_type_name || c.product_category_type_id}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-zinc-500 bg-zinc-900">
                                Tanpa Kategori
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Variants & Stock */}
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 font-medium text-xs text-zinc-200">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-pink-400 font-semibold text-[11px]">
                                <Layers className="w-3 h-3" />
                                {variants.length} Varian
                              </span>
                              <span className="text-xs text-zinc-400 truncate max-w-[140px]">
                                {primaryVariant?.product_variant_name || 'Standard'}
                                {variants.length > 1 && ` (+${variants.length - 1})`}
                              </span>
                            </div>
                            <div className="text-xs">
                              {totalProdStock > 5 ? (
                                <span className="text-emerald-400 font-semibold">{totalProdStock} pcs total stok</span>
                              ) : totalProdStock > 0 ? (
                                <span className="text-amber-400 font-semibold">{totalProdStock} pcs (Menipis)</span>
                              ) : (
                                <span className="text-rose-400 font-semibold">Habis</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Price Display */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-zinc-100 text-sm">
                            {priceDisplay}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(prod)}
                            title={`Klik untuk ubah menjadi ${isActive ? 'Non-aktif' : 'Aktif'}`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                              }`}
                            ></span>
                            {isActive ? 'Aktif' : 'Non-aktif'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(prod)}
                              title="Edit Produk, Varian & Foto (PATCH)"
                              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 text-pink-400" />
                            </button>
                            <a
                              href={`http://localhost:3000/product/${prod.product_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Lihat di Storefront Pembeli"
                              className="p-2 rounded-xl text-zinc-400 hover:text-pink-400 hover:bg-zinc-800 transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              title="Non-aktifkan Produk"
                              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          CREATE PRODUCT MODAL (POST /api-admin/products dengan Multiple Variants & Photos)
         ───────────────────────────────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Tambah Produk Baru</h3>
                  <p className="text-xs text-zinc-400">Dukungan multiple varian & multiple foto via POST /api-admin/products</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="p-6 space-y-6">
              {/* 1. Basic Product Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                  1. Informasi Produk Utama
                </h4>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nama Produk <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Metallic Silver Puffer Shoulder Bag"
                    value={createForm.product_name}
                    onChange={(e) => setCreateForm({ ...createForm, product_name: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Kategori Produk
                  </label>
                  <select
                    value={createForm.category_type_id}
                    onChange={(e) => setCreateForm({ ...createForm, category_type_id: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  >
                    {categories.map((c) => (
                      <option key={c.product_category_type_id} value={c.product_category_type_id}>
                        {c.product_category_type_name} ({c.product_category_type_id})
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
                    value={createForm.product_description}
                    onChange={(e) => setCreateForm({ ...createForm, product_description: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* 2. Multiple Variants Section with Multiple Photos */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                      2. Variasi Produk ({createVariants.length} Varian)
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Setiap varian dapat memiliki nama, harga, stok, dan beberapa foto produk.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCreateVariant}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Varian
                  </button>
                </div>

                <div className="space-y-5">
                  {createVariants.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-4 relative shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          Varian #{idx + 1}
                        </span>
                        {createVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCreateVariant(idx)}
                            className="text-zinc-500 hover:text-rose-400 p-1 rounded transition text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Hapus Varian
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Nama Varian <span className="text-pink-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Silver Metallic / Large"
                            value={item.variant_name}
                            onChange={(e) => handleUpdateCreateVariantField(idx, 'variant_name', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Stok Awal
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={item.variant_qty}
                            onChange={(e) =>
                              handleUpdateCreateVariantField(idx, 'variant_qty', parseCleanNumber(e.target.value))
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Harga Jual (IDR) <span className="text-pink-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                              Rp
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              value={item.variant_price}
                              onChange={(e) =>
                                handleUpdateCreateVariantField(idx, 'variant_price', parseCleanNumber(e.target.value))
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-pink-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                            Deskripsi Varian (Opsional)
                          </label>
                          <input
                            type="text"
                            placeholder="Detail spesifik varian..."
                            value={item.variant_description}
                            onChange={(e) =>
                              handleUpdateCreateVariantField(idx, 'variant_description', e.target.value)
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                        </div>
                      </div>

                      {/* Multiple Photos for this Variant */}
                      <div className="space-y-2.5 pt-2 border-t border-zinc-800/60">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                            Foto-foto Varian ({item.image_urls.length})
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddCreateVariantImage(idx)}
                            className="inline-flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 font-medium cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Tambah Foto
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {item.image_urls.map((imgUrl, imgIdx) => (
                            <div
                              key={imgIdx}
                              className="flex gap-2.5 items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800"
                            >
                              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                                <img
                                  key={formatImageUrl(imgUrl)}
                                  src={formatImageUrl(imgUrl)}
                                  alt={`Varian ${idx + 1} Foto ${imgIdx + 1}`}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (!target.src.includes('photo-1584917865442')) {
                                      target.src =
                                        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80';
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    Foto #{imgIdx + 1}
                                  </span>
                                  {item.image_urls.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCreateVariantImage(idx, imgIdx)}
                                      className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <input
                                  type="url"
                                  placeholder="Link Google Drive atau URL gambar..."
                                  value={imgUrl}
                                  onChange={(e) =>
                                    handleUpdateCreateVariantImage(idx, imgIdx, e.target.value)
                                  }
                                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
                          <span>💡 Mendukung link Google Drive langsung (pastikan akses file diset <strong>Anyone with the link / Siapa saja yang memiliki link</strong>).</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-pink-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan ke Railway...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Simpan & Publikasikan ({createVariants.length} Varian)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          EDIT PRODUCT & MULTIPLE VARIANTS MODAL (PATCH /products & PATCH /product-variants)
         ───────────────────────────────────────────────────────────────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Produk, Varian & Foto</h3>
                  <p className="text-xs font-mono text-zinc-400">{editingProduct.product_id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProductSubmit} className="p-6 space-y-6">
              {/* 1. Basic Product Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                    1. Informasi Produk Utama
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-zinc-300 font-medium">Status Publikasi:</span>
                    <input
                      type="checkbox"
                      checked={editProductForm.is_active}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, is_active: e.target.checked })
                      }
                      className="rounded accent-pink-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-emerald-400">
                      {editProductForm.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Nama Produk <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editProductForm.product_name}
                    onChange={(e) =>
                      setEditProductForm({ ...editProductForm, product_name: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Deskripsi Lengkap
                  </label>
                  <textarea
                    rows={3}
                    value={editProductForm.product_description}
                    onChange={(e) =>
                      setEditProductForm({ ...editProductForm, product_description: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* 2. Multiple Variants Section with Multiple Photos */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      2. Variasi Produk ({editVariants.length} Varian Terdaftar)
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Pilih tab varian untuk mengedit nama, harga, stok, dan multiple fotonya.
                    </p>
                  </div>
                  {isLoadingEditVariants && (
                    <RefreshCw className="w-4 h-4 text-pink-400 animate-spin" />
                  )}
                </div>

                {isLoadingEditVariants ? (
                  <div className="p-8 text-center text-zinc-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-pink-400" />
                    <p className="text-xs">Mengambil seluruh varian & foto dari Railway...</p>
                  </div>
                ) : editVariants.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center text-zinc-500 text-xs">
                    Tidak ada varian terdaftar untuk produk ini di database.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Variant Tabs Header */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800/80">
                      {editVariants.map((v, i) => (
                        <button
                          key={v.product_variant_id || i}
                          type="button"
                          onClick={() => setActiveVariantTab(i)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
                            activeVariantTab === i
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                              : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-zinc-800 text-[10px] flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <span>{v.product_variant_name || `Varian #${i + 1}`}</span>
                          <span className="text-[10px] text-zinc-500">
                            ({v.images.length}📷 • {v.product_variant_qty} pcs)
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Active Variant Detail Card */}
                    {editVariants[activeVariantTab] && (
                      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                              ID: {editVariants[activeVariantTab].product_variant_id}
                            </span>
                            <span className="text-xs font-semibold text-zinc-300">
                              Varian #{activeVariantTab + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300">
                              <span>Aktif:</span>
                              <input
                                type="checkbox"
                                checked={editVariants[activeVariantTab].is_active}
                                onChange={(e) =>
                                  handleUpdateEditVariantField(activeVariantTab, 'is_active', e.target.checked)
                                }
                                className="accent-pink-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSingleVariant(
                                  editVariants[activeVariantTab].product_variant_id,
                                  editVariants[activeVariantTab].product_variant_name
                                )
                              }
                              title="Hapus varian ini dari backend"
                              className="text-zinc-500 hover:text-rose-400 p-1 rounded transition text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hapus Varian</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                              Nama Varian <span className="text-pink-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={editVariants[activeVariantTab].product_variant_name}
                              onChange={(e) =>
                                handleUpdateEditVariantField(
                                  activeVariantTab,
                                  'product_variant_name',
                                  e.target.value
                                )
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                              Stok Varian (pcs)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="0"
                              value={editVariants[activeVariantTab].product_variant_qty}
                              onChange={(e) =>
                                handleUpdateEditVariantField(
                                  activeVariantTab,
                                  'product_variant_qty',
                                  parseCleanNumber(e.target.value)
                                )
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                              Harga Jual Varian (IDR) <span className="text-pink-400">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="0"
                                value={editVariants[activeVariantTab].product_variant_price}
                                onChange={(e) =>
                                  handleUpdateEditVariantField(
                                    activeVariantTab,
                                    'product_variant_price',
                                    parseCleanNumber(e.target.value)
                                  )
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-pink-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                              Deskripsi Varian (Opsional)
                            </label>
                            <input
                              type="text"
                              placeholder="Keterangan spesifik varian..."
                              value={editVariants[activeVariantTab].product_variant_description || ''}
                              onChange={(e) =>
                                handleUpdateEditVariantField(
                                  activeVariantTab,
                                  'product_variant_description',
                                  e.target.value
                                )
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                            />
                          </div>
                        </div>

                        {/* Multiple Photos Section for Active Variant */}
                        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-pink-400" />
                              Foto-foto Varian ({editVariants[activeVariantTab].images.length} Foto)
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddEditVariantImage(activeVariantTab)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-semibold transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Tambah Foto
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {editVariants[activeVariantTab].images.map((img, imgIdx) => (
                              <div
                                key={img.product_variant_image_id || imgIdx}
                                className="flex gap-2.5 items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800"
                              >
                                <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                                  <img
                                    key={formatImageUrl(img.product_variant_image_value)}
                                    src={formatImageUrl(img.product_variant_image_value)}
                                    alt={`Varian Foto ${imgIdx + 1}`}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      if (!target.src.includes('photo-1584917865442')) {
                                        target.src =
                                          'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80';
                                      }
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      Foto #{imgIdx + 1}
                                    </span>
                                    {editVariants[activeVariantTab].images.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEditVariantImage(activeVariantTab, imgIdx)}
                                        title="Hapus foto ini"
                                        className="text-zinc-500 hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  <input
                                    type="url"
                                    placeholder="Link Google Drive atau URL gambar..."
                                    value={img.product_variant_image_value}
                                    onChange={(e) =>
                                      handleUpdateEditVariantImage(activeVariantTab, imgIdx, e.target.value)
                                    }
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
                            <span>💡 Mendukung link Google Drive langsung (pastikan akses file diset <strong>Anyone with the link / Siapa saja yang memiliki link</strong>).</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-pink-500/25 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Menyimpan Semua Varian & Foto ke Railway...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Simpan Perubahan ({editVariants.length} Varian)
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
