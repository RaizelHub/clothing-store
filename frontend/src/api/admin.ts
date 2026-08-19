import { apiClient } from "./client";
import type {
  Address,
  Collection,
  Coupon,
  Customer,
  DashboardStats,
  Order,
  OrderStatus,
  ProductDetail,
  ProductSummary,
  Review,
  ReviewStatus,
  StoreSettings,
} from "@/types/api";

// --- Dashboard & orders ----------------------------------------------------

export async function getStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>("/admin/stats/");
  return data;
}

export async function listAdminOrders(status?: OrderStatus | "all"): Promise<Order[]> {
  const params = status && status !== "all" ? { status } : {};
  const { data } = await apiClient.get<Order[]>("/admin/orders/", { params });
  return data;
}

export async function getAdminOrder(order_number: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/admin/orders/${order_number}/`);
  return data;
}

export interface OrderUpdatePayload {
  status?: OrderStatus;
  tracking_number?: string | null;
  carrier?: string | null;
  note?: string;
}

export async function updateAdminOrder(order_number: string, payload: OrderUpdatePayload): Promise<Order> {
  const { data } = await apiClient.patch<Order>(`/admin/orders/${order_number}/`, payload);
  return data;
}

// --- Customers -------------------------------------------------------------

export async function listCustomers(): Promise<Customer[]> {
  const { data } = await apiClient.get<Customer[]>("/admin/customers/");
  return data;
}

export async function getCustomer(id: number): Promise<Customer & { addresses: Address[]; orders: Order[] }> {
  const { data } = await apiClient.get<Customer & { addresses: Address[]; orders: Order[] }>(`/admin/customers/${id}/`);
  return data;
}

// --- Products (admin) ------------------------------------------------------

export type AdminProduct = ProductDetail & { variants: ProductDetail["variants"] };

export async function listAdminProducts(q?: string): Promise<AdminProduct[]> {
  const { data } = await apiClient.get<AdminProduct[]>("/admin/products/", { params: q ? { q } : {} });
  return data;
}

export async function getAdminProduct(id: number): Promise<AdminProduct> {
  const { data } = await apiClient.get<AdminProduct>(`/admin/products/${id}/`);
  return data;
}

export interface VariantInput {
  sku: string;
  color_id: number;
  size_id: number;
  price_override_cents?: number | null;
  stock: number;
}

export interface ProductInput {
  name: string;
  tagline?: string;
  description?: string;
  care?: string;
  fit?: string;
  base_price: string;
  sale_price?: string | null;
  category_id: number;
  is_featured?: boolean;
  is_new?: boolean;
  variants: VariantInput[];
  colors: { color_id: number; hex: string }[];
}

export async function createAdminProduct(payload: ProductInput): Promise<AdminProduct> {
  const { data } = await apiClient.post<AdminProduct>("/admin/products/", payload);
  return data;
}

export async function updateAdminProduct(id: number, payload: Partial<ProductInput>): Promise<AdminProduct> {
  const { data } = await apiClient.patch<AdminProduct>(`/admin/products/${id}/`, payload);
  return data;
}

export async function deleteAdminProduct(id: number): Promise<void> {
  await apiClient.delete(`/admin/products/${id}/`);
}

// --- Inventory -------------------------------------------------------------

export interface InventoryRow {
  variant_id: number;
  sku: string;
  product_id: number;
  product_name: string;
  color_name: string;
  size_name: string;
  stock: number;
  low: boolean;
  threshold: number;
}

export async function getInventory(lowOnly = false): Promise<InventoryRow[]> {
  const { data } = await apiClient.get<InventoryRow[]>("/admin/inventory/", { params: lowOnly ? { low: "true" } : {} });
  return data;
}

export async function updateInventory(variant_id: number, stock: number): Promise<{ variant_id: number; stock: number }> {
  const { data } = await apiClient.patch<{ variant_id: number; stock: number }>(`/admin/inventory/${variant_id}/`, { stock });
  return data;
}

// --- Collections -----------------------------------------------------------

export async function listAdminCollections(): Promise<Collection[]> {
  const { data } = await apiClient.get<Collection[]>("/admin/collections/");
  return data;
}

export async function createAdminCollection(payload: {
  name: string;
  tagline?: string;
  description?: string;
  product_ids: number[];
}): Promise<Collection> {
  const { data } = await apiClient.post<Collection>("/admin/collections/", payload);
  return data;
}

export async function updateAdminCollection(
  id: number,
  payload: { name?: string; tagline?: string; description?: string; product_ids?: number[] }
): Promise<Collection> {
  const { data } = await apiClient.patch<Collection>(`/admin/collections/${id}/`, payload);
  return data;
}

export async function deleteAdminCollection(id: number): Promise<void> {
  await apiClient.delete(`/admin/collections/${id}/`);
}

// --- Coupons ---------------------------------------------------------------

export async function listAdminCoupons(): Promise<Coupon[]> {
  const { data } = await apiClient.get<Coupon[]>("/admin/coupons/");
  return data;
}

export interface CouponInput {
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order_value: number;
  max_uses: number | null;
  expires_at: string | null;
  is_active: boolean;
}

export async function createAdminCoupon(payload: CouponInput): Promise<Coupon> {
  const { data } = await apiClient.post<Coupon>("/admin/coupons/", payload);
  return data;
}

export async function updateAdminCoupon(id: number, payload: Partial<CouponInput>): Promise<Coupon> {
  const { data } = await apiClient.patch<Coupon>(`/admin/coupons/${id}/`, payload);
  return data;
}

export async function deleteAdminCoupon(id: number): Promise<void> {
  await apiClient.delete(`/admin/coupons/${id}/`);
}

// --- Reviews ---------------------------------------------------------------

export async function listAdminReviews(status?: ReviewStatus | "all"): Promise<Review[]> {
  const params = status && status !== "all" ? { status } : {};
  const { data } = await apiClient.get<Review[]>("/admin/reviews/", { params });
  return data;
}

export async function setReviewStatus(id: number, status: ReviewStatus): Promise<Review> {
  const { data } = await apiClient.patch<Review>(`/admin/reviews/${id}/`, { status });
  return data;
}

export async function deleteReview(id: number): Promise<void> {
  await apiClient.delete(`/admin/reviews/${id}/`);
}

// --- Settings --------------------------------------------------------------

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data } = await apiClient.get<StoreSettings>("/admin/settings/");
  return data;
}

export async function updateStoreSettings(payload: Partial<StoreSettings>): Promise<StoreSettings> {
  const { data } = await apiClient.patch<StoreSettings>("/admin/settings/", payload);
  return data;
}

// --- Catalog (public, for admin pickers) -----------------------------------

export async function listAllProducts(): Promise<ProductSummary[]> {
  const { data } = await apiClient.get<{ results: ProductSummary[] }>("/products/");
  return data.results;
}