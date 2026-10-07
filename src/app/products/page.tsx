'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Upload,
  Loader2,
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
  Sliders,
  Percent,
} from 'lucide-react';
import { AdminHeader } from '@/components/AdminHeader';
import { VariantBuilder, VariantBuilderOutput } from '@/components/VariantBuilder';
import { Product, ProductCategoryType, ProductVariant, ProductVariantImage } from '@/types';
import {
  fetchProducts,
  fetchProductById,
  fetchCategories,
  fetchProductVariants,
  createProduct,
  updateProduct,
  updateMultipleProductVariants,
  deleteProductVariant,
  deleteProduct,
  UpdateProductVariantInput,
  VariantImageItem,
  parseCleanNumber,
  formatImageUrl,
  uploadImageFile,
} from '@/lib/api';


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
    short_description: '',
    category_type_id: '',
    sku: '',
    slug: '',
    stock_type: 'ready-stock' as 'ready-stock' | 'pre-order',
    lead_time_min: 10,
    lead_time_max: 14,
    original_price: '',
    discount_percent: '',
    price_import_duty: '',
    price_shipping: '',
    tags: '',
    specs: [] as Array<{ label: string; value: string }>,
    notes: [] as string[],
  });

  const handleAddSpec = () => {
    setCreateForm((prev) => ({
      ...prev,
      specs: [...prev.specs, { label: '', value: '' }],
    }));
  };

  const handleUpdateSpec = (index: number, field: 'label' | 'value', value: string) => {
    setCreateForm((prev) => {
      const nextSpecs = [...prev.specs];
      nextSpecs[index] = { ...nextSpecs[index], [field]: value };
      return { ...prev, specs: nextSpecs };
    });
  };

  const handleRemoveSpec = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, i) => i !== index),
    }));
  };

  const handleAddNote = () => {
    setCreateForm((prev) => ({
      ...prev,
      notes: [...prev.notes, ''],
    }));
  };

  const handleUpdateNote = (index: number, value: string) => {
    setCreateForm((prev) => {
      const nextNotes = [...prev.notes];
      nextNotes[index] = value;
      return { ...prev, notes: nextNotes };
    });
  };

  const handleRemoveNote = (index: number) => {
    setCreateForm((prev) => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index),
    }));
  };

  // Dynamic multiple variants state for New Product
  const [variantOutput, setVariantOutput] = useState<VariantBuilderOutput | null>(null);

  const handleVariantChange = useCallback((output: VariantBuilderOutput) => {
    setVariantOutput(output);
  }, []);

  // Form State for Editing Product Info
  const [editProductForm, setEditProductForm] = useState({
    product_name: '',
    product_description: '',
    category_type_id: '',
    sku: '',
    slug: '',
    short_description: '',
    stock_type: 'ready-stock' as 'ready-stock' | 'pre-order' | 'sold-out',
    lead_time_min: 14,
    lead_time_max: 21,
    original_price: '',
    discount_percent: '',
    price_import_duty: '',
    price_shipping: '',
    tags: '',
    specs: [] as Array<{ label: string; value: string }>,
    notes: [] as string[],
    is_active: true,
  });

  const handleAddEditSpec = () => {
    setEditProductForm((prev) => ({
      ...prev,
      specs: [...prev.specs, { label: '', value: '' }],
    }));
  };

  const handleUpdateEditSpec = (index: number, field: 'label' | 'value', value: string) => {
    setEditProductForm((prev) => {
      const nextSpecs = [...prev.specs];
      nextSpecs[index] = { ...nextSpecs[index], [field]: value };
      return { ...prev, specs: nextSpecs };
    });
  };

  const handleRemoveEditSpec = (index: number) => {
    setEditProductForm((prev) => ({
      ...prev,
      specs: prev.specs.filter((_, i) => i !== index),
    }));
  };

  const handleAddEditNote = () => {
    setEditProductForm((prev) => ({
      ...prev,
      notes: [...prev.notes, ''],
    }));
  };

  const handleUpdateEditNote = (index: number, value: string) => {
    setEditProductForm((prev) => {
      const nextNotes = [...prev.notes];
      nextNotes[index] = value;
      return { ...prev, notes: nextNotes };
    });
  };

  const handleRemoveEditNote = (index: number) => {
    setEditProductForm((prev) => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index),
    }));
  };

  // Multiple variants state for Editing Product (each variant supports multiple images)
  const [editVariants, setEditVariants] = useState<EditVariantFormItem[]>([]);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  // ─── Create Product Handler ───────────────────────────────────────────────

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.product_name.trim()) {
      setNotification({ type: 'error', message: 'Nama produk wajib diisi!' });
      return;
    }

    if (!variantOutput || variantOutput.variants.length === 0) {
      setNotification({
        type: 'error',
        message: 'Pengaturan varian produk belum lengkap! Tambahkan minimal 1 opsi varian.',
      });
      return;
    }

    for (let i = 0; i < variantOutput.variants.length; i++) {
      const v = variantOutput.variants[i];
      if (!v.variant_name.trim()) {
        setNotification({ type: 'error', message: `Nama untuk varian #${i + 1} tidak boleh kosong!` });
        return;
      }
    }

    setIsSubmitting(true);
    setNotification(null);

    const result = await createProduct({
      product_name: createForm.product_name.trim(),
      product_description: createForm.product_description.trim(),
      short_description: createForm.short_description.trim() || undefined,
      category_type_id: createForm.category_type_id || (categories[0]?.product_category_type_id ?? ''),
      sku: createForm.sku.trim() || undefined,
      slug: createForm.slug.trim() || undefined,
      stock_type: createForm.stock_type,
      lead_time_min: createForm.stock_type === 'pre-order' ? Number(createForm.lead_time_min) || 10 : undefined,
      lead_time_max: createForm.stock_type === 'pre-order' ? Number(createForm.lead_time_max) || 14 : undefined,
      original_price: createForm.original_price ? Number(parseCleanNumber(createForm.original_price)) || undefined : undefined,
      discount_percent: createForm.discount_percent ? Number(createForm.discount_percent) : undefined,
      price_import_duty: createForm.price_import_duty ? Number(parseCleanNumber(createForm.price_import_duty)) || undefined : undefined,
      price_shipping: createForm.price_shipping ? Number(parseCleanNumber(createForm.price_shipping)) || undefined : undefined,
      tags: createForm.tags.trim()
        ? createForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
      specs: createForm.specs.filter((s) => s.label.trim() && s.value.trim()),
      notes: createForm.notes.map((n) => n.trim()).filter(Boolean),
      variant_label: variantOutput.variant_label,
      options: variantOutput.options,
      skus: variantOutput.skus,
      variants: variantOutput.variants,
    });

    setIsSubmitting(false);

    if (result.success) {
      setNotification({
        type: 'success',
        message: `Produk baru berhasil dibuat dengan ${variantOutput.variants.length} variasi di backend Railway!`,
      });
      setIsCreateModalOpen(false);
      // Reset form
      setCreateForm({
        product_name: '',
        product_description: '',
        short_description: '',
        category_type_id: categories[0]?.product_category_type_id || '',
        sku: '',
        slug: '',
        stock_type: 'ready-stock',
        lead_time_min: 10,
        lead_time_max: 14,
        original_price: '',
        discount_percent: '',
        price_import_duty: '',
        price_shipping: '',
        tags: '',
        specs: [],
        notes: [],
      });
      setVariantOutput(null);
      loadData();
    } else {
      setNotification({
        type: 'error',
        message: result.message || 'Gagal membuat produk baru di backend. Periksa log konsol.',
      });
    }
  };

  // ─── Edit Product & Multiple Variants Handlers ────────────────────────────

  const openEditModal = async (prod: Product) => {
    setEditingProduct(prod);

    const initialCatId =
      prod.ms_nevermind_product_categories?.[0]?.product_category_type_id ||
      prod.ms_nevermind_product_categories?.[0]?.ms_nevermind_product_category_type?.product_category_type_id ||
      categories[0]?.product_category_type_id ||
      '';

    const initialTagsString = Array.isArray(prod.tags)
      ? prod.tags.join(', ')
      : typeof prod.tags === 'string'
      ? prod.tags
      : '';

    setEditProductForm({
      product_name: prod.product_name || '',
      product_description: prod.product_description || '',
      category_type_id: initialCatId,
      sku: prod.sku || '',
      slug: prod.slug || '',
      short_description: prod.short_description || '',
      stock_type: (prod.stock_type as 'ready-stock' | 'pre-order' | 'sold-out') || 'ready-stock',
      lead_time_min: prod.lead_time_min ?? 10,
      lead_time_max: prod.lead_time_max ?? 14,
      original_price: prod.original_price ? String(prod.original_price) : '',
      discount_percent: prod.discount_percent !== undefined && prod.discount_percent !== null ? String(prod.discount_percent) : '',
      price_import_duty: prod.price_import_duty ? String(prod.price_import_duty) : '',
      price_shipping: prod.price_shipping ? String(prod.price_shipping) : '',
      tags: initialTagsString,
      specs: Array.isArray(prod.specs) ? [...prod.specs] : [],
      notes: Array.isArray(prod.notes) ? [...prod.notes] : [],
      is_active: prod.is_active ?? true,
    });
    setEditVariants([]);
    setIsLoadingEditVariants(true);

    try {
      const [fullProd, liveVariants] = await Promise.all([
        fetchProductById(prod.product_id),
        fetchProductVariants(prod.product_id),
      ]);

      if (fullProd) {
        const freshCatId =
          fullProd.ms_nevermind_product_categories?.[0]?.product_category_type_id ||
          fullProd.ms_nevermind_product_categories?.[0]?.ms_nevermind_product_category_type?.product_category_type_id ||
          initialCatId;

        const freshTagsString = Array.isArray(fullProd.tags)
          ? fullProd.tags.join(', ')
          : typeof fullProd.tags === 'string'
          ? fullProd.tags
          : initialTagsString;

        setEditProductForm((prev) => ({
          ...prev,
          product_name: fullProd.product_name ?? prev.product_name,
          product_description: fullProd.product_description ?? prev.product_description,
          category_type_id: freshCatId,
          sku: fullProd.sku ?? prev.sku,
          slug: fullProd.slug ?? prev.slug,
          short_description: fullProd.short_description ?? prev.short_description,
          stock_type: (fullProd.stock_type as 'ready-stock' | 'pre-order' | 'sold-out') ?? prev.stock_type,
          lead_time_min: fullProd.lead_time_min ?? prev.lead_time_min,
          lead_time_max: fullProd.lead_time_max ?? prev.lead_time_max,
          original_price: fullProd.original_price ? String(fullProd.original_price) : prev.original_price,
          discount_percent: fullProd.discount_percent !== undefined && fullProd.discount_percent !== null ? String(fullProd.discount_percent) : prev.discount_percent,
          price_import_duty: fullProd.price_import_duty ? String(fullProd.price_import_duty) : prev.price_import_duty,
          price_shipping: fullProd.price_shipping ? String(fullProd.price_shipping) : prev.price_shipping,
          tags: freshTagsString,
          specs: Array.isArray(fullProd.specs) && fullProd.specs.length > 0 ? fullProd.specs : prev.specs,
          notes: Array.isArray(fullProd.notes) && fullProd.notes.length > 0 ? fullProd.notes : prev.notes,
          is_active: fullProd.is_active ?? prev.is_active,
        }));
      }

      if (liveVariants && liveVariants.length > 0) {
        setEditVariants(
          liveVariants.map((v: ProductVariant) => {
            const rawImages: VariantImageItem[] = (v.ms_nevermind_product_variant_images || []).map((img: ProductVariantImage) => ({
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

  const handleUploadEditVariantPhotos = async (
    variantIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingVariantIndex(variantIndex);
    const newImgs: Array<{ product_variant_image_value: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const res = await uploadImageFile(file);
      if (res.success && res.url) {
        newImgs.push({ product_variant_image_value: res.url });
      } else {
        alert(res.message || 'Gagal mengupload foto ke Wasabi');
      }
    }

    if (newImgs.length > 0) {
      setEditVariants((prev) =>
        prev.map((item, idx) => {
          if (idx !== variantIndex) return item;
          // Filter out empty placeholder if any
          const cleanExisting = item.images.filter(
            (img) => img.product_variant_image_value && img.product_variant_image_value.trim().length > 0
          );
          return {
            ...item,
            images: [...cleanExisting, ...newImgs],
          };
        })
      );
    }

    setUploadingVariantIndex(null);
    e.target.value = '';
  };




  const handleRemoveEditVariantImage = (variantIndex: number, imageIndex: number) => {
    setEditVariants((prev) =>
      prev.map((item, i) => {
        if (i !== variantIndex) return item;
        return {
          ...item,
          images: item.images.filter((_, imgI) => imgI !== imageIndex),
        };
      })
    );
  };

  const handleDeleteSingleVariant = async (variantId: string, variantName: string) => {
    if (!confirm(`Hapus varian "${variantName}" dari database backend?`)) return;

    const ok = await deleteProductVariant(variantId);
    if (ok) {
      setEditVariants((prev) => prev.filter((v) => v.product_variant_id !== variantId));
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

    // 1. Update full product information (PATCH /api-admin/products)
    const updateProdOk = await updateProduct({
      product_id: editingProduct.product_id,
      product_name: editProductForm.product_name.trim(),
      product_description: editProductForm.product_description.trim(),
      category_type_id: editProductForm.category_type_id || undefined,
      short_description: editProductForm.short_description.trim() || undefined,
      sku: editProductForm.sku.trim() || undefined,
      slug: editProductForm.slug.trim() || undefined,
      stock_type: editProductForm.stock_type,
      lead_time_min: editProductForm.stock_type === 'pre-order' ? Number(editProductForm.lead_time_min) || 10 : undefined,
      lead_time_max: editProductForm.stock_type === 'pre-order' ? Number(editProductForm.lead_time_max) || 14 : undefined,
      original_price: editProductForm.original_price ? Number(parseCleanNumber(editProductForm.original_price)) || undefined : undefined,
      discount_percent: editProductForm.discount_percent ? Number(editProductForm.discount_percent) : undefined,
      price_import_duty: editProductForm.price_import_duty ? Number(parseCleanNumber(editProductForm.price_import_duty)) || undefined : undefined,
      price_shipping: editProductForm.price_shipping ? Number(parseCleanNumber(editProductForm.price_shipping)) || undefined : undefined,
      tags: editProductForm.tags.trim()
        ? editProductForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
      specs: editProductForm.specs.filter((s) => s.label.trim() && s.value.trim()),
      notes: editProductForm.notes.map((n) => n.trim()).filter(Boolean),
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
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono text-zinc-600">
                                  {prod.product_id}
                                </span>
                                {prod.sku && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                    SKU: {prod.sku}
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  prod.stock_type === 'pre-order'
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                }`}>
                                  {prod.stock_type === 'pre-order' ? '✈️ PO' : '📦 Ready'}
                                </span>
                              </div>
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
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      Kode SKU Produk Induk <span className="text-zinc-500">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: NVM-RDY-001"
                      value={createForm.sku}
                      onChange={(e) => setCreateForm({ ...createForm, sku: e.target.value.toUpperCase() })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 font-mono uppercase focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Slug URL Toko <span className="text-zinc-500">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Otomatis dari nama produk jika kosong..."
                      value={createForm.slug}
                      onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Ringkasan Singkat <span className="text-zinc-500">(Subtitle produk)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Tas puffer silver Y2K aesthetic, faux leather premium..."
                      value={createForm.short_description}
                      onChange={(e) => setCreateForm({ ...createForm, short_description: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Tipe Ketersediaan Produk: Ready Stock vs Pre-Order */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      Tipe Ketersediaan Produk
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      {createForm.stock_type === 'ready-stock' ? 'Barang fisik ada di gudang' : 'Pemesanan PO luar negeri'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, stock_type: 'ready-stock' })}
                      className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                        createForm.stock_type === 'ready-stock'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">📦</span>
                      <div>
                        <p className="text-xs font-bold text-white">Ready Stock</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Barang fisik tersedia, siap langsung diproses & dikirim lokal.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, stock_type: 'pre-order' })}
                      className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                        createForm.stock_type === 'pre-order'
                          ? 'bg-purple-500/10 border-purple-500/50 text-purple-300 shadow-sm'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">✈️</span>
                      <div>
                        <p className="text-xs font-bold text-white">Pre-Order (PO)</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Barang dipesan ke supplier luar negeri dengan estimasi lead time.
                        </p>
                      </div>
                    </button>
                  </div>

                  {createForm.stock_type === 'pre-order' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-300">
                      <span className="text-[11px] text-purple-400 font-semibold">Estimasi Lead Time:</span>
                      <input
                        type="number"
                        min="1"
                        value={createForm.lead_time_min}
                        onChange={(e) => setCreateForm({ ...createForm, lead_time_min: parseInt(e.target.value, 10) || 1 })}
                        className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs text-white font-bold"
                      />
                      <span className="text-zinc-500">sampai</span>
                      <input
                        type="number"
                        min="1"
                        value={createForm.lead_time_max}
                        onChange={(e) => setCreateForm({ ...createForm, lead_time_max: parseInt(e.target.value, 10) || 1 })}
                        className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs text-white font-bold"
                      />
                      <span className="text-zinc-400">hari kerja</span>
                    </div>
                  )}
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

              {/* 2. Harga Coret, Estimasi Biaya & Promosi */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      2. Harga Coret, Estimasi Biaya & Promosi (Opsional)
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Dipergunakan untuk badge diskon toko, kalkulator checkout, dan promo banner.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Harga Normal / Coret (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 250000"
                      value={createForm.original_price}
                      onChange={(e) => setCreateForm({ ...createForm, original_price: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Diskon (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Contoh: 20"
                      value={createForm.discount_percent}
                      onChange={(e) => setCreateForm({ ...createForm, discount_percent: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Est. Bea Masuk / Impor (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 35000"
                      value={createForm.price_import_duty}
                      onChange={(e) => setCreateForm({ ...createForm, price_import_duty: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Est. Ongkos Kirim (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 20000"
                      value={createForm.price_shipping}
                      onChange={(e) => setCreateForm({ ...createForm, price_shipping: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>


              </div>

              {/* 3. Spesifikasi Teknis & Catatan Tambahan (Opsional) */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    3. Spesifikasi Teknis & Catatan Tambahan (Opsional)
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Informasi spesifikasi detail produk, tagar pencarian, dan catatan penting untuk pesanan customer.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-pink-400" />
                    Kata Kunci Pencarian / Tags <span className="text-zinc-500 font-normal">(Opsional, pisahkan dengan koma)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: bow, tote bag, y2k aesthetic, viral korea"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm({ ...createForm, tags: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Spesifikasi Teknis Dinamis */}
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">Spesifikasi Detail Produk</p>
                      <p className="text-[11px] text-zinc-500">Pasangan Label & Nilai spesifikasi (e.g. Bahan: Faux Leather, Dimensi: 20x15 cm)</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSpec}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-pink-300 text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah Baris
                    </button>
                  </div>

                  {createForm.specs.length > 0 && (
                    <div className="space-y-2">
                      {createForm.specs.map((spec, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Label (e.g. Bahan)"
                            value={spec.label}
                            onChange={(e) => handleUpdateSpec(idx, 'label', e.target.value)}
                            className="w-1/3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                          <input
                            type="text"
                            placeholder="Nilai (e.g. Premium PU Leather)"
                            value={spec.value}
                            onChange={(e) => handleUpdateSpec(idx, 'value', e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(idx)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Catatan Khusus Toko */}
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">Catatan Khusus & Petunjuk Perawatan</p>
                      <p className="text-[11px] text-zinc-500">Poin-poin penting untuk customer (e.g. Garansi 7 hari, Hindari air langsung)</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNote}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-pink-300 text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah Poin
                    </button>
                  </div>

                  {createForm.notes.length > 0 && (
                    <div className="space-y-2">
                      {createForm.notes.map((note, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 font-mono w-4 text-center">•</span>
                          <input
                            type="text"
                            placeholder="Tulis catatan penting..."
                            value={note}
                            onChange={(e) => handleUpdateNote(idx, e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNote(idx)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Pengaturan Variasi Produk Dinamis */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400">
                    2. Pengaturan Variasi Produk
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Kelola tingkat variasi dinamis (Warna, Ukuran, Bahan, dll) dan kombinasi harga/stok produk secara otomatis.
                  </p>
                </div>

                <VariantBuilder onChange={handleVariantChange} />
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
                      Simpan & Publikasikan ({variantOutput?.variants.length || 0} Variasi)
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
                  <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <span className="text-xs text-zinc-300 font-medium">Status Publikasi:</span>
                    <input
                      type="checkbox"
                      checked={editProductForm.is_active}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, is_active: e.target.checked })
                      }
                      className="rounded accent-pink-500 w-4 h-4 cursor-pointer"
                    />
                    <span className={`text-xs font-semibold ${editProductForm.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Kategori Produk
                    </label>
                    <select
                      value={editProductForm.category_type_id}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, category_type_id: e.target.value })
                      }
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
                      Kode SKU Produk Induk <span className="text-zinc-500">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: NVM-RDY-001"
                      value={editProductForm.sku}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, sku: e.target.value.toUpperCase() })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 font-mono uppercase focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Slug URL Toko <span className="text-zinc-500">(Opsional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Otomatis dari nama produk jika kosong..."
                      value={editProductForm.slug}
                      onChange={(e) =>
                        setEditProductForm({
                          ...editProductForm,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Ringkasan Singkat <span className="text-zinc-500">(Subtitle produk)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Tas puffer silver Y2K aesthetic, faux leather premium..."
                      value={editProductForm.short_description}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, short_description: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>

                {/* Tipe Ketersediaan Produk: Ready Stock vs Pre-Order */}
                <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                      Tipe Ketersediaan Produk
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      {editProductForm.stock_type === 'ready-stock' ? 'Barang fisik ada di gudang' : 'Pemesanan PO luar negeri'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditProductForm({ ...editProductForm, stock_type: 'ready-stock' })}
                      className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                        editProductForm.stock_type === 'ready-stock'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">📦</span>
                      <div>
                        <p className="text-xs font-bold text-white">Ready Stock</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Barang fisik tersedia, siap langsung diproses & dikirim lokal.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditProductForm({ ...editProductForm, stock_type: 'pre-order' })}
                      className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                        editProductForm.stock_type === 'pre-order'
                          ? 'bg-purple-500/10 border-purple-500/50 text-purple-300 shadow-sm'
                          : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xl">✈️</span>
                      <div>
                        <p className="text-xs font-bold text-white">Pre-Order (PO)</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Barang dipesan ke supplier luar negeri dengan estimasi lead time.
                        </p>
                      </div>
                    </button>
                  </div>

                  {editProductForm.stock_type === 'pre-order' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-300">
                      <span className="text-[11px] text-purple-400 font-semibold">Estimasi Lead Time:</span>
                      <input
                        type="number"
                        min="1"
                        value={editProductForm.lead_time_min}
                        onChange={(e) =>
                          setEditProductForm({ ...editProductForm, lead_time_min: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs text-white font-bold"
                      />
                      <span className="text-zinc-500">sampai</span>
                      <input
                        type="number"
                        min="1"
                        value={editProductForm.lead_time_max}
                        onChange={(e) =>
                          setEditProductForm({ ...editProductForm, lead_time_max: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs text-white font-bold"
                      />
                      <span className="text-zinc-400">hari kerja</span>
                    </div>
                  )}
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

              {/* 2. Harga Coret, Estimasi Biaya & Promosi (Opsional) */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" />
                      2. Harga Coret, Estimasi Biaya & Promosi (Opsional)
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Dipergunakan untuk badge diskon toko, kalkulator checkout, dan promo banner.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Harga Normal / Coret (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 250000"
                      value={editProductForm.original_price}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, original_price: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Diskon (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Contoh: 20"
                      value={editProductForm.discount_percent}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, discount_percent: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Est. Bea Masuk / Impor (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 35000"
                      value={editProductForm.price_import_duty}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, price_import_duty: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Est. Ongkos Kirim (Rp)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 20000"
                      value={editProductForm.price_shipping}
                      onChange={(e) =>
                        setEditProductForm({ ...editProductForm, price_shipping: e.target.value })
                      }
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Spesifikasi Teknis & Catatan Tambahan (Opsional) */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    3. Spesifikasi Teknis & Catatan Tambahan (Opsional)
                  </h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Informasi spesifikasi detail produk, tagar pencarian, dan catatan penting untuk pesanan customer.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-pink-400" />
                    Kata Kunci Pencarian / Tags <span className="text-zinc-500 font-normal">(Opsional, pisahkan dengan koma)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: bow, tote bag, y2k aesthetic, viral korea"
                    value={editProductForm.tags}
                    onChange={(e) =>
                      setEditProductForm({ ...editProductForm, tags: e.target.value })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Spesifikasi Teknis Dinamis */}
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Spesifikasi Detail Produk ({editProductForm.specs.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddEditSpec}
                      className="px-2.5 py-1 text-xs rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/30 flex items-center gap-1 font-medium transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah Baris
                    </button>
                  </div>

                  {editProductForm.specs.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic">
                      Belum ada spesifikasi. Klik tombol di atas untuk menambahkan (misal: Bahan, Dimensi, Berat).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {editProductForm.specs.map((spec, sIdx) => (
                        <div key={sIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Label (contoh: Dimensi)"
                            value={spec.label}
                            onChange={(e) => handleUpdateEditSpec(sIdx, 'label', e.target.value)}
                            className="w-1/3 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                          <input
                            type="text"
                            placeholder="Nilai (contoh: 24 x 15 x 8 cm)"
                            value={spec.value}
                            onChange={(e) => handleUpdateEditSpec(sIdx, 'value', e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditSpec(sIdx)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800/60 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Catatan Penting Pesanan Dinamis */}
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Catatan Penting Pesanan ({editProductForm.notes.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddEditNote}
                      className="px-2.5 py-1 text-xs rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border border-pink-500/30 flex items-center gap-1 font-medium transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Tambah Catatan
                    </button>
                  </div>

                  {editProductForm.notes.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 italic">
                      Belum ada catatan. Tambahkan peringatan pengiriman, ketentuan komplain, atau info garansi.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {editProductForm.notes.map((note, nIdx) => (
                        <div key={nIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: Wajib video unboxing untuk klaim retur cacat pabrik"
                            value={note}
                            onChange={(e) => handleUpdateEditNote(nIdx, e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditNote(nIdx)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800/60 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Multiple Variants Section with Multiple Photos */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      4. Variasi Produk ({editVariants.length} Varian Terdaftar)
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Kelola nama, harga, stok, dan foto untuk setiap varian yang terdaftar di database.
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
                    {editVariants.map((variant, idx) => (
                      <div
                        key={variant.product_variant_id || idx}
                        className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 space-y-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-zinc-200">
                              {variant.product_variant_name || `Varian #${idx + 1}`}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-500">
                              ID: {variant.product_variant_id}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300">
                              <span>Aktif:</span>
                              <input
                                type="checkbox"
                                checked={variant.is_active}
                                onChange={(e) =>
                                  handleUpdateEditVariantField(idx, 'is_active', e.target.checked)
                                }
                                className="accent-pink-500 w-3.5 h-3.5 cursor-pointer"
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSingleVariant(
                                  variant.product_variant_id,
                                  variant.product_variant_name
                                )
                              }
                              title="Hapus varian ini dari backend"
                              className="text-zinc-500 hover:text-rose-400 p-1 rounded transition text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hapus</span>
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
                              value={variant.product_variant_name}
                              onChange={(e) =>
                                handleUpdateEditVariantField(
                                  idx,
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
                              value={variant.product_variant_qty}
                              onChange={(e) =>
                                handleUpdateEditVariantField(
                                  idx,
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
                                value={variant.product_variant_price}
                                onChange={(e) =>
                                  handleUpdateEditVariantField(
                                    idx,
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
                              value={variant.product_variant_description || ''}
                              onChange={(e) =>
                                handleUpdateEditVariantField(
                                  idx,
                                  'product_variant_description',
                                  e.target.value
                                )
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:outline-none focus:border-pink-500"
                            />
                          </div>
                        </div>

                        {/* Multiple Photos Section for this Variant */}
                        <div className="space-y-3 pt-3 border-t border-zinc-800/80">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4 text-pink-400" />
                              Foto-foto Varian ({variant.images.filter((img) => img.product_variant_image_value && img.product_variant_image_value.trim().length > 0).length} Foto Tersimpan)
                            </label>
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-semibold transition cursor-pointer">
                              {uploadingVariantIndex === idx ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Mengunggah...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3.5 h-3.5" />
                                  + Upload Foto ke Wasabi
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={uploadingVariantIndex === idx}
                                onChange={(e) => handleUploadEditVariantPhotos(idx, e)}
                                className="hidden"
                              />
                            </label>
                          </div>

                          {variant.images.filter((img) => img.product_variant_image_value && img.product_variant_image_value.trim().length > 0).length === 0 ? (
                            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-zinc-800 hover:border-pink-500/50 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/50 cursor-pointer transition text-center space-y-1.5">
                              <Upload className="w-5 h-5 text-pink-400" />
                              <span className="text-xs font-semibold text-zinc-300">
                                {uploadingVariantIndex === idx ? 'Mengunggah ke Wasabi...' : 'Klik untuk Upload Foto Varian'}
                              </span>
                              <span className="text-[10px] text-zinc-500">
                                Otomatis dikompres & disimpan permanen di Wasabi S3
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={uploadingVariantIndex === idx}
                                onChange={(e) => handleUploadEditVariantPhotos(idx, e)}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {variant.images
                                .filter((img) => img.product_variant_image_value && img.product_variant_image_value.trim().length > 0)
                                .map((img, imgIdx) => (
                                  <div
                                    key={img.product_variant_image_id || imgIdx}
                                    className="group relative rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-sm"
                                  >
                                    <div className="aspect-square w-full overflow-hidden bg-zinc-900">
                                      <img
                                        key={formatImageUrl(img.product_variant_image_value)}
                                        src={formatImageUrl(img.product_variant_image_value)}
                                        alt={`Varian Foto ${imgIdx + 1}`}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          if (!target.src.includes('photo-1584917865442')) {
                                            target.src =
                                              'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80';
                                          }
                                        }}
                                      />
                                    </div>
                                    <div className="p-2 flex items-center justify-between bg-zinc-900/90 border-t border-zinc-800">
                                      <span className="text-[10px] font-medium text-emerald-400">
                                        ☁️ Wasabi
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveEditVariantImage(idx, imgIdx)}
                                        title="Hapus foto ini"
                                        className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
