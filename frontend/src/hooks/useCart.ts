import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addCartItem, getCart, getShippingQuote, mergeGuestCart, removeCartItem, updateCartItem } from "@/api/cart";

export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: getCart,
    staleTime: 30 * 1000,
  });
}

export function useShippingQuote() {
  return useQuery({
    queryKey: ["shipping-quote"],
    queryFn: getShippingQuote,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variant_id, quantity = 1 }: { variant_id: number; quantity?: number }) =>
      addCartItem(variant_id, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) => updateCartItem(id, quantity),
    onSuccess: (result) => {
      queryClient.setQueryData(["cart"], result.cart);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => removeCartItem(id),
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });
}

export function useMergeCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mergeGuestCart,
    onSuccess: (cart) => {
      queryClient.setQueryData(["cart"], cart);
    },
  });
}