import { apiClient } from "./client";
import type { Category, Collection, Color, Paginated, ProductDetail, ProductQuery, ProductSummary, Review, Size } from "@/types/api";

function serializeQuery(q: ProductQuery): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (q.ids?.length) out.ids = q.ids.join(",");
  if (q.featured !== undefined) out.featured = q.featured;
  if (q.category) out.category = q.category;
  if (q.collection) out.collection = q.collection;
  if (q.color !== undefined) out.color = q.color;
  if (q.size !== undefined) out.size = q.size;
  if (q.min_price !== undefined) out.min_price = q.min_price;
  if (q.max_price !== undefined) out.max_price = q.max_price;
  if (q.sort) out.sort = q.sort;
  if (q.q) out.q = q.q;
  if (q.page) out.page = q.page;
  return out;
}

export async function getProducts(q: ProductQuery = {}): Promise<Paginated<ProductSummary>> {
  const { data } = await apiClient.get<Paginated<ProductSummary>>("/products/", { params: serializeQuery(q) });
  return data;
}

export async function getProduct(slug: string): Promise<ProductDetail> {
  const { data } = await apiClient.get<ProductDetail>(`/products/${slug}/`);
  return data;
}

export async function getColors(): Promise<Color[]> {
  const { data } = await apiClient.get<Color[]>("/lookups/colors/");
  return data;
}

export async function getSizes(): Promise<Size[]> {
  const { data } = await apiClient.get<Size[]>("/lookups/sizes/");
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<Category[]>("/categories/");
  return data;
}

export async function getCollections(): Promise<Collection[]> {
  const { data } = await apiClient.get<Collection[]>("/collections/");
  return data;
}

export async function getCollection(slug: string): Promise<Collection & { products: ProductSummary[] }> {
  const { data } = await apiClient.get<Collection & { products: ProductSummary[] }>(`/collections/${slug}/`);
  return data;
}

export async function submitReview(slug: string, payload: { rating: number; comment: string }): Promise<Review> {
  const { data } = await apiClient.post<Review>(`/products/${slug}/reviews/`, payload);
  return data;
}