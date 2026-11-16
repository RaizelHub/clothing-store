import { apiClient } from "./client";
import type { Order, OrderAddress, OrderStatusResponse } from "@/types/api";

export async function getMyOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>("/orders/");
  return data;
}

export async function getMyOrder(order_number: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${order_number}/`);
  return data;
}

export async function getOrderStatus(order_number: string): Promise<OrderStatusResponse> {
  const { data } = await apiClient.get<OrderStatusResponse>(`/orders/${order_number}/status/`);
  return data;
}

export async function cancelOrder(order_number: string): Promise<Order> {
  const { data } = await apiClient.post<Order>(`/orders/${order_number}/cancel/`);
  return data;
}

export interface PlaceOrderPayload {
  customer_email?: string;
  customer_name?: string;
  shipping_address: OrderAddress;
  billing_address: OrderAddress;
  billing_same_as_shipping: boolean;
  shipping_method: string;
  coupon_code: string | null;
  payment: {
    provider: "paymongo" | "mock";
    method?: string;
    number?: string;
  };
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  const { data } = await apiClient.post<Order>("/checkout/place-order/", payload);
  return data;
}
