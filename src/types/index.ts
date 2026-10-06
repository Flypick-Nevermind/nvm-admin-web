export type OrderStatus =
  | 'payment_confirmed'
  | 'ordered_to_supplier'
  | 'qc_passed'
  | 'in_transit'
  | 'customs_cleared'
  | 'at_local_hub'
  | 'out_for_delivery'
  | 'delivered';

export interface ProductCategoryType {
  product_category_type_id: string;
  product_category_type_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariantImage {
  product_variant_image_id?: string;
  product_variant_id?: string;
  image_provider_id?: string;
  product_variant_image_value: string;
  ms_nevermind_image_provider?: {
    image_provider_id?: string;
    image_provider_name?: string;
  };
}

export interface ProductVariant {
  product_variant_id?: string;
  product_id?: string;
  product_variant_name: string;
  product_variant_description?: string;
  product_variant_price: string | number;
  product_variant_qty: number;
  is_active?: boolean;
  ms_nevermind_product_variant_images?: ProductVariantImage[];
}

export interface ProductCategoryRelation {
  product_category_id?: string;
  product_id?: string;
  product_category_type_id: string;
  ms_nevermind_product_category_type?: ProductCategoryType;
}

export interface Product {
  product_id: string;
  product_name: string;
  product_description: string;
  is_active: boolean;
  is_delete?: boolean | null;
  created_at?: string;
  updated_at?: string;
  ms_nevermind_product_categories?: ProductCategoryRelation[];
  ms_nevermind_product_variants?: ProductVariant | ProductVariant[];
  all_variants?: ProductVariant[];
}

export interface OrderItem {
  id: string;
  product_name: string;
  variant_name?: string;
  image: string;
  qty: number;
  price: number;
}

export interface Order {
  order_id: string;
  customer_name: string;
  customer_whatsapp: string;
  shipping_address: string;
  city: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount?: number;
  voucher_code?: string;
  total_amount: number;
  payment_method: string;
  payment_status: 'paid' | 'pending' | 'failed';
  tracking_status: OrderStatus;
  tracking_number_china?: string;
  tracking_number_local?: string;
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number; // e.g. 5 for 5% or 50000 for 50k
  min_spend?: number;
  max_discount?: number;
  quota: number;
  used_count: number;
  is_active: boolean;
  expires_at?: string;
}

export type BagRequestStatus = 'pending' | 'searching' | 'quoted' | 'converted' | 'cancelled';

export interface BagRequest {
  request_id: string;
  customer_name: string;
  customer_whatsapp: string;
  bag_name: string;
  reference_url?: string;
  budget?: string;
  notes?: string;
  status: BagRequestStatus;
  supplier_link?: string;
  supplier_cost_cny?: number;
  quoted_price_idr?: number;
  created_at: string;
}
