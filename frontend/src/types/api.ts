// Domain model mirroring the DRF serializers (backend contract).
// Prices travel as decimal strings (DRF DecimalField) — parse with lib/format.

// --- Catalog ---------------------------------------------------------------

export interface Color {
  id: number;
  name: string;
  hex: string;
}

export interface Size {
  id: number;
  name: string;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  children?: Category[];
}

export interface Collection {
  id: number;
  name: string;
  slug: string;
  description: string;
  tagline: string;
  hero_image?: string | null;
  product_ids: number[];
  product_count?: number;
}

export interface ProductImageUrls {
  thumbnail: string;
  card: string;
  detail: string;
  large: string;
  mobile: string;
  admin_preview: string;
}

export interface ProductImage {
  id: number;
  image: string;
  alt: string;
  color: number | null;
  position: number;
  is_primary?: boolean;
  public_id?: string;
  storage_provider?: "cloudinary" | "local" | "external";
  width?: number | null;
  height?: number | null;
  format?: string;
  urls?: ProductImageUrls;
}

export interface MediaConfigStatus {
  provider: "cloudinary" | "local" | "mock";
  configured: boolean;
  max_file_size_mb: number;
  allowed_formats: string[];
  error: string | null;
}

export interface VariantSummary {
  id: number;
  sku: string;
  price: string | null; // override; null = falls back to base price
  price_effective: string;
  stock: number;
  color: Color;
  size: Size;
}

export interface ProductSummary {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  base_price: string;
  sale_price: string | null;
  price_effective: string;
  category: number;
  category_name: string;
  category_slug: string;
  is_featured: boolean;
  is_new: boolean;
  images: ProductImage[];
  colors: Color[];
  sizes: Size[];
  min_price: string;
  badges: ("NEW" | "SALE" | "BESTSELLER")[];
}

export interface ProductDetail extends ProductSummary {
  description: string;
  care: string;
  fit: string;
  variants: VariantSummary[];
  collection_ids: number[];
  average_rating: number | null;
  review_count: number;
  reviews: Review[];
}

export interface ProductQuery {
  featured?: boolean;
  ids?: number[];
  category?: string;
  collection?: string;
  color?: string | number;
  size?: string | number;
  min_price?: number;
  max_price?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "featured" | "bestselling";
  q?: string;
  page?: number;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Customers -------------------------------------------------------------

export type UserRole = "customer" | "admin";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_staff: boolean;
  email_verified: boolean;
  created_at: string;
}

export interface Customer extends User {
  order_count: number;
  total_spent: string;
}

export interface Address {
  id: number;
  label: string;
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default: boolean;
}

// --- Cart / Wishlist -------------------------------------------------------

export interface CartItem {
  id: number;
  variant: VariantSummary;
  product_name: string;
  product_slug: string;
  image: string | null;
  unit_price: string;
  quantity: number;
  available_stock: number;
}

export interface Cart {
  item_count: number;
  subtotal: string;
  items: CartItem[];
}

export interface WishlistItem {
  id: number;
  product: ProductSummary;
  variant_id: number | null;
  created_at: string;
}

// --- Orders ----------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed"
  | "expired"
  | "requires_action";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
  "expired",
  "requires_action",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled", "refunded", "failed", "expired"];

export interface OrderItem {
  id: number;
  product_name: string;
  sku: string;
  color_name: string;
  size_name: string;
  unit_price: string;
  quantity: number;
  image: string | null;
}

export interface OrderAddress {
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
}

export interface OrderTimelineEntry {
  status: OrderStatus;
  at: string;
  note: string | null;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: string;
  shipping: string;
  discount: string;
  tax: string;
  total: string;
  coupon_code: string | null;
  shipping_address: OrderAddress;
  billing_address: OrderAddress;
  billing_same_as_shipping: boolean;
  shipping_method: string;
  payment_method: string;
  payment_provider?: string;
  payment_reference?: string;
  payment_transaction_id?: string;
  payment_status?: string;
  checkout_url?: string;
  is_stock_deducted?: boolean;
  tracking_number: string | null;
  carrier: string | null;
  timeline: OrderTimelineEntry[];
  created_at: string;
  customer_email: string | null;
  customer_name: string | null;
}

export interface OrderStatusResponse {
  order_number: string;
  status: OrderStatus;
  payment_status: string;
  payment_provider: string;
  payment_method: string;
  total: string;
  created_at: string;
  items: OrderItem[];
  timeline: OrderTimelineEntry[];
}

export interface ShippingQuote {
  free_shipping_threshold: string | null;
  tax_rate: number;
  currency: string;
  methods: { id: string; label: string; price: string; eta: string }[];
}

// --- Coupons ---------------------------------------------------------------

export interface Coupon {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order_value: string;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  is_active: boolean;
}

export interface CouponValidation {
  valid: boolean;
  code: string;
  type: "percent" | "fixed";
  value: number;
  discount: string;
  error: string | null;
}

// --- Reviews ---------------------------------------------------------------

export type ReviewStatus = "pending" | "approved" | "hidden";

export interface Review {
  id: number;
  product: number;
  product_name: string;
  user_name: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
}

// --- Admin ----------------------------------------------------------------

export interface DashboardStats {
  revenue_total: string;
  revenue_30d: string;
  orders_30d: number;
  orders_by_status: Record<OrderStatus, number>;
  top_products: { name: string; units: number; revenue: string }[];
  low_stock: LowStockVariant[];
  recent_orders: Order[];
  customer_count: number;
}

export interface LowStockVariant {
  sku: string;
  product_name: string;
  color_name: string;
  size_name: string;
  stock: number;
  threshold: number;
}

// --- Settings / misc -------------------------------------------------------

export interface StoreSettings {
  store_name: string;
  currency: string;
  tax_rate: number;
  shipping_flat_rate: string;
  free_shipping_threshold: string | null;
  low_stock_threshold: number;
}

export interface NewsletterResult {
  ok: boolean;
  message: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}