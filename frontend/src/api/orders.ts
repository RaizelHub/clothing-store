import { apiClient } from "./client";
import type { Order, OrderAddress } from "@/types/api";

export async function getMyOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<Order[]>("/orders/");
  return data;
}

export async function getMyOrder(order_number: string): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${order_number}/`);
  return data;
}

export async function cancelOrder(order_number: string): Promise<Order> {
  const { data } = await apiClient.post<Order>(`/orders/${order_number}/cancel/`);
  return data;
}

export interface PlaceOrderPayload {
  shipping_address: OrderAddress;
  billing_address: OrderAddress;
  billing_same_as_shipping: boolean;
  shipping_method: string;
  coupon_code: string | null;
  payment: {
    provider: "paymongo";
    method: "card";
    number: string;
  };
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<Order> {
  const { data } = await apiClient.post<Order>("/checkout/place-order/", payload);
  return data;
}