import { Product, ProductCategoryType, Order, Voucher, OrderStatus } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://service-nvm-production.up.railway.app/api';

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

  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

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
      return res.data;
    }
  } catch (err) {
    console.warn('⚠️ Gagal mengambil produk dari backend, menggunakan data demo fallback:', err);
  }
  return MOCK_ADMIN_PRODUCTS;
}

export async function createProduct(payload: {
  product_name: string;
  product_description: string;
  category_type_id: string;
  variant_name: string;
  variant_price: number;
  variant_qty: number;
  image_url: string;
}): Promise<boolean> {
  const body = {
    product_name: payload.product_name,
    product_description: payload.product_description,
    categories: [{ product_category_type_id: payload.category_type_id }],
    variants: {
      product_variant_name: payload.variant_name,
      product_variant_description: payload.product_description,
      product_variant_price: payload.variant_price.toString(),
      product_variant_qty: payload.variant_qty,
      images: [{ product_variant_image_value: payload.image_url }],
    },
  };

  try {
    const res = await adminApiClient<{ success: boolean }>('/products', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.success;
  } catch {
    return false;
  }
}

export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    const res = await adminApiClient<{ success: boolean }>(`/products/${productId}`, {
      method: 'DELETE',
    });
    return res.success;
  } catch {
    return false;
  }
}

// ─── Categories API ─────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<ProductCategoryType[]> {
  try {
    const res = await adminApiClient<{ success: boolean; data: ProductCategoryType[] }>('/product-category-types');
    if (res.success && Array.isArray(res.data)) {
      return res.data;
    }
  } catch (err) {
    console.warn('⚠️ Gagal mengambil kategori dari backend, menggunakan fallback:', err);
  }
  return [
    { product_category_type_id: 'PCTID-53f59bf2b3a1', product_category_type_name: 'bag' },
    { product_category_type_id: 'PCTID-5128c34d76b9', product_category_type_name: 'shoulder-bag' },
    { product_category_type_id: 'PCTID-cute-finds', product_category_type_name: 'cute-finds' },
    { product_category_type_id: 'PCTID-y2k-core', product_category_type_name: 'y2k-core' },
    { product_category_type_id: 'PCTID-silver-vibes', product_category_type_name: 'silver-vibes' },
  ];
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
