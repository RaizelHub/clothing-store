import { apiClient } from "./client";
import type {
  OutfitSummary,
  OutfitDetail,
  AddOutfitToCartResult,
  AddOutfitToCartItem,
  AdminOutfitInput,
} from "@/types/api";

// --- Public Looks API ---

export async function getLooks(featured?: boolean): Promise<OutfitSummary[]> {
  const params: Record<string, string> = {};
  if (featured) params.featured = "true";
  const { data } = await apiClient.get<OutfitSummary[]>("/looks/", { params });
  return data;
}

export async function getLook(slug: string): Promise<OutfitDetail> {
  const { data } = await apiClient.get<OutfitDetail>(`/looks/${slug}/`);
  return data;
}

export async function addLookToCart(
  slug: string,
  items: AddOutfitToCartItem[]
): Promise<AddOutfitToCartResult> {
  const { data } = await apiClient.post<AddOutfitToCartResult>(
    `/looks/${slug}/add-to-cart/`,
    { items }
  );
  return data;
}

// --- Admin Looks API ---

export async function getAdminLooks(status?: string): Promise<OutfitSummary[]> {
  const params: Record<string, string> = {};
  if (status && status !== "all") params.status = status;
  const { data } = await apiClient.get<OutfitSummary[]>("/admin/looks/", { params });
  return data;
}

export async function getAdminLook(id: number): Promise<OutfitDetail> {
  const { data } = await apiClient.get<OutfitDetail>(`/admin/looks/${id}/`);
  return data;
}

export async function createAdminLook(payload: AdminOutfitInput): Promise<OutfitDetail> {
  const { data } = await apiClient.post<OutfitDetail>("/admin/looks/", payload);
  return data;
}

export async function updateAdminLook(
  id: number,
  payload: Partial<AdminOutfitInput>
): Promise<OutfitDetail> {
  const { data } = await apiClient.patch<OutfitDetail>(`/admin/looks/${id}/`, payload);
  return data;
}

export async function deleteAdminLook(id: number): Promise<void> {
  await apiClient.delete(`/admin/looks/${id}/`);
}
