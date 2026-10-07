import { Product, ProductCategoryType, Order, Voucher, OrderStatus, ProductVariant, ProductOption, ProductSku } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-nvm-production.up.railway.app/api-admin';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nvm_admin_token') || 'demo-admin-jwt';
}

export async function adminApiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBase}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error [${res.status}]: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Request to ${endpoint} failed:`, error);
    throw error;
  }
}

// ─── Products API ───────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await adminApiClient<{ success: boolean; data: Product[] }>('/products');
    if (res.success && Array.isArray(res.data)) {
      // Normalize variant structure if backend returns an array or single object
      return res.data.map((p) => {
        let variant = p.ms_nevermind_product_variants;
        if (Array.isArray(variant)) {
          variant = variant[0];
        }
        return {
          ...p,
          ms_nevermind_product_variants: variant,
        };
      });
    }
  } catch (err) {
    console.warn('⚠️ Gagal mengambil produk dari backend, menggunakan data fallback:', err);
  }
  return MOCK_ADMIN_PRODUCTS;
}

export async function fetchProductById(productId: string): Promise<Product | null> {
  try {
    const res = await adminApiClient<{ success: boolean; data: Product }>(`/products/${productId}`);
    if (res.success && res.data) {
      return res.data;
    }
  } catch (err) {
    console.error(`Gagal mengambil detail produk ${productId}:`, err);
  }
  return null;
}

export function parseCleanNumber(val: string | number): number | '' {
  if (val === '' || val === null || val === undefined) return '';
  const digitsOnly = String(val).replace(/[^\d]/g, '');
  if (digitsOnly === '') return '';
  const noLeadingZero = digitsOnly.replace(/^0+(?=\d)/, '');
  return Number(noLeadingZero);
}

/**
 * Format & normalize image URLs.
 * If the link is a Google Drive share link (e.g. https://drive.google.com/file/d/ID/view?usp=sharing),
 * it converts it to Google's direct CDN image URL: https://lh3.googleusercontent.com/d/ID
 * which renders seamlessly inside <img> elements.
 */
export function formatImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    const match =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }
  return trimmed;
}



/**
 * Upload single image file directly to Wasabi cloud storage via POST /api-admin/files
 * Returns a permanent, cached media streaming proxy URL: ${origin}/api/files/media/${key}
 */
export async function uploadImageFile(
  file: File
): Promise<{ success: boolean; url?: string; key?: string; message?: string }> {
  try {
    const token = getAdminToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append('file', file);

    const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const url = `${cleanBase}/files`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Upload gagal [${res.status}]: ${errText}` };
    }

    const json = await res.json();
    if (!json.success || !json.data) {
      return { success: false, message: json.message || 'Gagal mengupload file ke Wasabi' };
    }

    const fileData = json.data;
    const apiOrigin = cleanBase.replace(/\/api-admin\/?$/, '');
    const mediaProxyUrl = `${apiOrigin}/api/files/media/${fileData.key}`;

    return {
      success: true,
      url: mediaProxyUrl,
      key: fileData.key,
      message: 'Foto berhasil diupload ke Wasabi',
    };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Error uploading file to Wasabi:', err);
    return { success: false, message: err?.message || 'Gagal mengupload file ke Wasabi' };
  }
}

export interface ProductVariantItemInput {
  variant_name: string;
  variant_description?: string;
  variant_price: number | string;
  variant_qty: number | string;
  image_urls?: string[];
  image_url?: string;
}

export async function createProduct(payload: {
  product_name: string;
  sku?: string;
  slug?: string;
  short_description?: string;
  stock_type?: 'ready-stock' | 'pre-order';
  lead_time_min?: number;
  lead_time_max?: number;
  price_base?: number;
  original_price?: number;
  discount_percent?: number;
  price_import_duty?: number;
  price_shipping?: number;
  tags?: string[] | string;
  specs?: Array<{ label: string; value: string }>;
  notes?: string[];
  product_description: string;
  category_type_id: string;
  variant_label?: string;
  options?: ProductOption[];
  skus?: ProductSku[];
  variant_name?: string;
  variant_description?: string;
  variant_price?: number | string;
  variant_qty?: number | string;
  image_url?: string;
  image_urls?: string[];
  variants?: ProductVariantItemInput[];
}): Promise<{ success: boolean; message?: string }> {
  // Support both array of variants or single fallback
  const variantList: ProductVariantItemInput[] =
    payload.variants && payload.variants.length > 0
      ? payload.variants
      : [
          {
            variant_name: payload.variant_name || 'Standard',
            variant_description: payload.variant_description || payload.product_description,
            variant_price: payload.variant_price || 0,
            variant_qty: payload.variant_qty || 1,
            image_urls: payload.image_urls || (payload.image_url ? [payload.image_url] : []),
          },
        ];

  const body = {
    product_name: payload.product_name,
    sku: payload.sku,
    slug: payload.slug,
    short_description: payload.short_description,
    stock_type: payload.stock_type || 'ready-stock',
    lead_time_min: payload.lead_time_min,
    lead_time_max: payload.lead_time_max,
    price_base: payload.price_base,
    original_price: payload.original_price,
    discount_percent: payload.discount_percent,
    price_import_duty: payload.price_import_duty,
    price_shipping: payload.price_shipping,
    tags: payload.tags,
    specs: payload.specs,
    notes: payload.notes,
    product_description: payload.product_description,
    variant_label: payload.variant_label,
    options: payload.options,
    skus: payload.skus,
    ms_nevermind_product_category: payload.category_type_id
      ? [{ product_category_type_id: payload.category_type_id }]
      : [],
    ms_nevermind_product_variant: variantList.map((v) => {
      let urls = (v.image_urls && v.image_urls.length > 0
        ? v.image_urls
        : v.image_url
        ? [v.image_url]
        : []
      )
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter(Boolean);

      // Backend requirement: each variant MUST have at least 1 image
      if (urls.length === 0) {
        const anyAvailableImage = variantList
          .flatMap((item) => item.image_urls || [item.image_url])
          .find((u) => u && typeof u === 'string' && u.trim().length > 0);

        urls = [anyAvailableImage || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80'];
      }

      const images = urls.map((url) => ({
        image_provider_id: 'IPID-000002',
        product_variant_image_value: formatImageUrl(url),
      }));

      return {
        product_variant_name: v.variant_name,
        product_variant_description: v.variant_description || payload.product_description,
        product_variant_price: Number(v.variant_price) || 0,
        product_variant_qty: Number(v.variant_qty) || 0,
        ms_nevermind_product_variant_image: images,
      };
    }),
  };

  try {
    const res = await adminApiClient<{ success: boolean }>('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return { success: res.success, message: 'Produk berhasil dibuat' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Create product failed:', err);
    let errorMessage = err?.message || 'Gagal membuat produk di backend.';
    try {
      const match = err?.message?.match(/API Error \[\d+\]: ([\s\S]*)/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
          errorMessage = parsed.errors
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((e: any) => e.message || JSON.stringify(e))
            .join(' • ');
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      }
    } catch {
      // Keep errorMessage
    }
    return { success: false, message: errorMessage };
  }
}

export async function updateProduct(payload: {
  product_id: string;
  product_name: string;
  product_description?: string;
  short_description?: string;
  slug?: string;
  category_type_id?: string;
  variant_label?: string;
  sku?: string;
  stock_type?: 'ready-stock' | 'pre-order' | 'sold-out';
  lead_time_min?: number;
  lead_time_max?: number;
  price_base?: number;
  original_price?: number;
  discount_percent?: number;
  price_import_duty?: number;
  price_shipping?: number;
  tags?: string[] | string;
  specs?: Array<{ label: string; value: string }>;
  notes?: string[];
  options?: ProductOption[];
  skus?: ProductSku[];
  is_active: boolean;
}): Promise<boolean> {
  try {
    const body: Record<string, unknown> = { ...payload };
    if (payload.category_type_id) {
      body.ms_nevermind_product_category = [
        { product_category_type_id: payload.category_type_id },
      ];
    }
    const res = await adminApiClient<{ success: boolean }>('/products', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res.success;
  } catch (err) {
    console.error('Update product failed:', err);
    return false;
  }
}

export async function deleteProduct(productId: string, currentProduct?: Product): Promise<boolean> {
  try {
    // Backend doesn't provide DELETE /products, so deactivate product
    const res = await updateProduct({
      product_id: productId,
      product_name: currentProduct?.product_name || 'Product',
      product_description: currentProduct?.product_description || '',
      is_active: false,
    });
    return res;
  } catch {
    return false;
  }
}

// ─── Product Variants API ───────────────────────────────────────────────────

export async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const res = await adminApiClient<{ success: boolean; data: ProductVariant[] }>(
      `/product-variants/${productId}`
    );
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.error(`Gagal mengambil variants untuk ${productId}:`, err);
  }
  return [];
}

export interface VariantImageItem {
  product_variant_image_id?: string;
  product_variant_id?: string;
  image_provider_id?: string;
  product_variant_image_value: string;
}

export interface UpdateProductVariantInput {
  product_variant_id: string;
  product_id: string;
  product_variant_name: string;
  product_variant_description?: string;
  product_variant_price: number | string;
  product_variant_qty: number | string;
  is_active: boolean;
  images?: VariantImageItem[];
  image_urls?: string[];
  image_url?: string;
  product_variant_image_id?: string;
  image_provider_id?: string;
}

export async function updateProductVariant(payload: UpdateProductVariantInput): Promise<boolean> {
  try {
    let formattedImages: Array<{
      product_variant_image_id: string;
      product_variant_id: string;
      image_provider_id: string;
      product_variant_image_value: string;
    }> = [];

    if (payload.images && payload.images.length > 0) {
      formattedImages = payload.images
        .filter((img) => img.product_variant_image_value?.trim())
        .map((img, i) => ({
          product_variant_image_id:
            img.product_variant_image_id || `PVIID-${Date.now()}-${i}`,
          product_variant_id: payload.product_variant_id,
          image_provider_id: img.image_provider_id || 'IPID-000002',
          product_variant_image_value: formatImageUrl(img.product_variant_image_value),
        }));
    } else if (payload.image_urls && payload.image_urls.length > 0) {
      formattedImages = payload.image_urls
        .filter((url) => url?.trim())
        .map((url, i) => ({
          product_variant_image_id: `PVIID-${Date.now()}-${i}`,
          product_variant_id: payload.product_variant_id,
          image_provider_id: 'IPID-000002',
          product_variant_image_value: formatImageUrl(url),
        }));
    } else if (payload.image_url?.trim()) {
      formattedImages = [
        {
          product_variant_image_id: payload.product_variant_image_id || 'PVIID-000001',
          product_variant_id: payload.product_variant_id,
          image_provider_id: payload.image_provider_id || 'IPID-000002',
          product_variant_image_value: formatImageUrl(payload.image_url),
        },
      ];
    }

    const body = {
      product_variant_id: payload.product_variant_id,
      product_id: payload.product_id,
      product_variant_name: payload.product_variant_name,
      product_variant_description: payload.product_variant_description || '',
      product_variant_price: Number(payload.product_variant_price) || 0,
      product_variant_qty: Number(payload.product_variant_qty) || 0,
      is_active: payload.is_active,
      ms_nevermind_product_variant_image: formattedImages,
    };

    const res = await adminApiClient<{ success: boolean }>('/product-variants', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return res.success;
  } catch (err) {
    console.error('Update variant failed:', err);
    return false;
  }
}

export async function updateMultipleProductVariants(
  variants: UpdateProductVariantInput[]
): Promise<boolean> {
  if (!variants || variants.length === 0) return true;
  try {
    const results = await Promise.all(variants.map((v) => updateProductVariant(v)));
    return results.every(Boolean);
  } catch (err) {
    console.error('Update multiple variants failed:', err);
    return false;
  }
}

export async function deleteProductVariant(variantId: string): Promise<boolean> {
  try {
    const res = await adminApiClient<{ success: boolean }>(`/product-variants/${variantId}`, {
      method: 'DELETE',
    });
    return res.success;
  } catch (err) {
    console.error('Delete variant failed:', err);
    return false;
  }
}

// ─── Categories API ─────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<ProductCategoryType[]> {
  try {
    const res = await adminApiClient<{ success: boolean; data: ProductCategoryType[] }>(
      '/product-category-types'
    );
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('⚠️ Gagal mengambil kategori dari backend, menggunakan fallback:', err);
  }
  return [
    { product_category_type_id: 'PCTID-53f59bf2b3a1', product_category_type_name: 'bag' },
    { product_category_type_id: 'PCTID-5128c34d76b9', product_category_type_name: 'tool' },
  ];
}

export async function createCategoryType(categoryName: string): Promise<boolean> {
  try {
    const res = await adminApiClient<{ success: boolean }>('/product-category-types', {
      method: 'POST',
      body: JSON.stringify({ product_category_type_name: categoryName.trim() }),
    });
    return res.success;
  } catch (err) {
    console.error('Create category type failed:', err);
    return false;
  }
}

export async function addProductCategory(productId: string, categoryTypeId: string): Promise<boolean> {
  try {
    const res = await adminApiClient<{ success: boolean }>('/product-categories', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        product_category_type_id: categoryTypeId,
      }),
    });
    return res.success;
  } catch (err) {
    console.error('Add product category failed:', err);
    return false;
  }
}

export async function deleteProductCategory(productCategoryId: string): Promise<boolean> {
  try {
    const res = await adminApiClient<{ success: boolean }>(`/product-categories/${productCategoryId}`, {
      method: 'DELETE',
    });
    return res.success;
  } catch (err) {
    console.error('Delete product category failed:', err);
    return false;
  }
}

// ─── Orders & Vouchers Local Persistence / Mock ─────────────────────────────

export async function fetchOrders(): Promise<Order[]> {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nvm_admin_orders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
  }
  return MOCK_ORDERS;
}

export function saveOrders(orders: Order[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nvm_admin_orders', JSON.stringify(orders));
  }
}

export async function fetchVouchers(): Promise<Voucher[]> {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nvm_admin_vouchers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
  }
  return MOCK_VOUCHERS;
}

export function saveVouchers(vouchers: Voucher[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nvm_admin_vouchers', JSON.stringify(vouchers));
  }
}

// ─── Demo Data ───────────────────────────────────────────────────────────────

export const MOCK_ADMIN_PRODUCTS: Product[] = [
  {
    product_id: 'PID-000001',
    product_name: 'Mini Bow Tote — Cream',
    product_description: 'Tas mini tote aksen bow manis, material premium faux leather.',
    is_active: true,
    created_at: '2026-09-20T10:00:00.000Z',
    ms_nevermind_product_categories: [
      {
        product_category_type_id: 'PCTID-cute-finds',
        ms_nevermind_product_category_type: {
          product_category_type_id: 'PCTID-cute-finds',
          product_category_type_name: 'cute-finds',
        },
      },
    ],
    ms_nevermind_product_variants: {
      product_variant_id: 'PVID-001',
      product_variant_name: 'Vintage Cream',
      product_variant_price: '240000',
      product_variant_qty: 15,
      ms_nevermind_product_variant_images: [
        {
          product_variant_image_value:
            'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
        },
      ],
    },
  },
  {
    product_id: 'PID-000002',
    product_name: 'Chrome Quilted Shoulder Bag',
    product_description: 'Shoulder bag dengan tekstur quilted chrome metalik stunning.',
    is_active: true,
    created_at: '2026-09-22T14:30:00.000Z',
    ms_nevermind_product_categories: [
      {
        product_category_type_id: 'PCTID-y2k-core',
        ms_nevermind_product_category_type: {
          product_category_type_id: 'PCTID-y2k-core',
          product_category_type_name: 'y2k-core',
        },
      },
    ],
    ms_nevermind_product_variants: {
      product_variant_id: 'PVID-002',
      product_variant_name: 'Metallic Silver',
      product_variant_price: '310000',
      product_variant_qty: 8,
      ms_nevermind_product_variant_images: [
        {
          product_variant_image_value:
            'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80',
        },
      ],
    },
  },
  {
    product_id: 'PID-000003',
    product_name: 'Aqua Jelly Mini Crossbody',
    product_description: 'Tas jelly PVC transparan dengan warna aqua ocean gemas.',
    is_active: true,
    created_at: '2026-09-25T08:15:00.000Z',
    ms_nevermind_product_categories: [
      {
        product_category_type_id: 'PCTID-y2k-core',
        ms_nevermind_product_category_type: {
          product_category_type_id: 'PCTID-y2k-core',
          product_category_type_name: 'y2k-core',
        },
      },
    ],
    ms_nevermind_product_variants: {
      product_variant_id: 'PVID-003',
      product_variant_name: 'Aqua Blue',
      product_variant_price: '275000',
      product_variant_qty: 3,
      ms_nevermind_product_variant_images: [
        {
          product_variant_image_value:
            'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
        },
      ],
    },
  },
];

export const MOCK_ORDERS: Order[] = [
  {
    order_id: 'NVM-2026-0091',
    customer_name: 'Nadine Aurelia',
    customer_whatsapp: '081298765432',
    shipping_address: 'Jl. Senopati No. 45, Kebayoran Baru',
    city: 'Jakarta Selatan',
    items: [
      {
        id: 'PID-000001',
        product_name: 'Mini Bow Tote — Cream',
        variant_name: 'Vintage Cream',
        image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
        qty: 1,
        price: 240000,
      },
    ],
    subtotal: 240000,
    discount_amount: 12000,
    voucher_code: 'NVM5',
    total_amount: 228000,
    payment_method: 'BCA Transfer',
    payment_status: 'paid',
    tracking_status: 'in_transit',
    tracking_number_china: 'SF-CN-982312019',
    created_at: '2026-10-01T08:30:00.000Z',
  },
  {
    order_id: 'NVM-2026-0092',
    customer_name: 'Fikri Sofyan',
    customer_whatsapp: '081513458798',
    shipping_address: 'Gedung The Plaza Lt. 18, Jl. MH Thamrin',
    city: 'Jakarta Pusat',
    items: [
      {
        id: 'PID-000002',
        product_name: 'Chrome Quilted Shoulder Bag',
        variant_name: 'Metallic Silver',
        image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80',
        qty: 1,
        price: 310000,
      },
    ],
    subtotal: 310000,
    discount_amount: 15500,
    voucher_code: 'NVM5',
    total_amount: 294500,
    payment_method: 'BCA Transfer',
    payment_status: 'paid',
    tracking_status: 'qc_passed',
    tracking_number_china: 'YTO-992182741',
    created_at: '2026-10-01T14:15:00.000Z',
  },
  {
    order_id: 'NVM-2026-0093',
    customer_name: 'Clarissa Michelle',
    customer_whatsapp: '081388776655',
    shipping_address: 'Pakuwon Indah Blok A2-11',
    city: 'Surabaya Barat',
    items: [
      {
        id: 'PID-000003',
        product_name: 'Aqua Jelly Mini Crossbody',
        variant_name: 'Aqua Blue',
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
        qty: 2,
        price: 275000,
      },
    ],
    subtotal: 550000,
    total_amount: 550000,
    payment_method: 'Mandiri Transfer',
    payment_status: 'pending',
    tracking_status: 'payment_confirmed',
    created_at: '2026-10-02T02:00:00.000Z',
  },
];

export const MOCK_VOUCHERS: Voucher[] = [
  {
    id: 'VCH-001',
    code: 'NVM5',
    discount_type: 'percentage',
    discount_value: 5,
    quota: 1000,
    used_count: 84,
    is_active: true,
  },
  {
    id: 'VCH-002',
    code: 'VIPCLUB30',
    discount_type: 'fixed',
    discount_value: 30000,
    min_spend: 300000,
    quota: 200,
    used_count: 42,
    is_active: true,
  },
  {
    id: 'VCH-003',
    code: 'SUPERFLASH',
    discount_type: 'percentage',
    discount_value: 15,
    min_spend: 400000,
    max_discount: 100000,
    quota: 50,
    used_count: 50,
    is_active: false,
  },
];

// ─── Bag Requests (Jastip) ───────────────────────────────────────────────────

import { BagRequest } from '@/types';

export const MOCK_BAG_REQUESTS: BagRequest[] = [
  {
    request_id: 'REQ-2026-001',
    customer_name: 'Sabrina Wibowo',
    customer_whatsapp: '081289123456',
    bag_name: 'Silver Metallic Heart Pillow Bag (XiaoHongShu Viral)',
    reference_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600&q=80',
    budget: 'Rp 200.000 – Rp 350.000',
    notes: 'Mau yang rantainya tebal dan ada charm pita kecil kalau bisa ya min',
    status: 'searching',
    supplier_link: 'https://item.taobao.com/item.htm?id=782910291',
    supplier_cost_cny: 48,
    quoted_price_idr: 285000,
    created_at: '2026-10-01T11:20:00.000Z',
  },
  {
    request_id: 'REQ-2026-002',
    customer_name: 'Alika Chandra',
    customer_whatsapp: '081399887766',
    bag_name: 'Chunky Knit Wool Cloud Tote — Lilac',
    reference_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80',
    budget: 'Di bawah Rp 200.000',
    notes: 'Cari warna soft purple pastel persis kayak di foto ini',
    status: 'pending',
    created_at: '2026-10-02T04:15:00.000Z',
  },
  {
    request_id: 'REQ-2026-003',
    customer_name: 'Jessica Tan',
    customer_whatsapp: '081900112233',
    bag_name: 'Vintage Distressed Leather Slouchy Hobo Bag',
    reference_url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&q=80',
    budget: 'Rp 350.000 – Rp 500.000',
    notes: 'Muat laptop 13 inch yaa',
    status: 'quoted',
    supplier_link: 'https://detail.1688.com/offer/692019281.html',
    supplier_cost_cny: 65,
    quoted_price_idr: 345000,
    created_at: '2026-09-30T16:00:00.000Z',
  },
];

export async function fetchBagRequests(): Promise<BagRequest[]> {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('nvm_admin_bag_requests');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
  }
  return MOCK_BAG_REQUESTS;
}

export function saveBagRequests(requests: BagRequest[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nvm_admin_bag_requests', JSON.stringify(requests));
  }
}
