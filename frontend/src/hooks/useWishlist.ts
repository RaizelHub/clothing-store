import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addToWishlist, getWishlist, removeFromWishlist } from "@/api/wishlist";

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
    staleTime: 30 * 1000,
  });
}

export function useWishlistActions() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["wishlist"] });

  const add = useMutation({
    mutationFn: (product_id: number) => addToWishlist(product_id),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (product_id: number) => removeFromWishlist(product_id),
    onSuccess: refresh,
  });

  return { add, remove };
}