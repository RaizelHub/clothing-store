import { apiClient } from "./client";
import type { Cart, CartItem, CouponValidation, ShippingQuote } from "@/types/api";

export async function getCart(): Promise<Cart> {
  const { data } = await apiClient.get<Cart>("/cart/");
  return data;
}

export async function addCartItem(variant_id: number, quantity = 1): Promise<Cart> {
  const { data } = await apiClient.post<Cart>("/cart/items/", { variant_id, quantity });
  return data;
}

export async function updateCartItem(id: number, quantity: number): Promise<{ cart: Cart; item: CartItem | null }> {
  const { data } = await apiClient.patch<{ cart: Cart; item: CartItem | null }>(`/cart/items/${id}/`, { quantity });
  return data;
}

export async function removeCartItem(id: number): Promise<Cart> {
  const { data } = await apiClient.delete<Cart>(`/cart/items/${id}/`);
  return data;
}

export async function mergeGuestCart(): Promise<Cart> {
  const { data } = await apiClient.post<Cart>("/cart/merge/");
  return data;
}

export async function getShippingQuote(): Promise<ShippingQuote> {
  const { data } = await apiClient.get<ShippingQuote>("/checkout/shipping-quote/");
  return data;
}

export async function validateCoupon(code: string): Promise<CouponValidation> {
  const { data } = await apiClient.post<CouponValidation>("/checkout/coupon/", { code });
  return data;
}