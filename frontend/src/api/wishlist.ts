import { apiClient } from "./client";
import type { WishlistItem } from "@/types/api";

export async function getWishlist(): Promise<WishlistItem[]> {
  const { data } = await apiClient.get<WishlistItem[]>("/wishlist/");
  return data;
}

export async function addToWishlist(product_id: number): Promise<{ product_id: number }> {
  const { data } = await apiClient.post<{ product_id: number }>("/wishlist/", { product_id });
  return data;
}

export async function removeFromWishlist(product_id: number): Promise<void> {
  await apiClient.delete(`/wishlist/${product_id}/`);
}