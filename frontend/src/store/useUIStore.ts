import { create } from "zustand";

// Ephemeral UI state only — never data that should survive a refresh or
// come from the server. Cart (server-synced) lives in TanStack Query;
// auth tokens live in useAuthStore. This store is only "is the drawer open".
interface UIState {
  isMobileNavOpen: boolean;
  isCartDrawerOpen: boolean;
  isSearchOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  openSearch: () => void;
  closeSearch: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileNavOpen: false,
  isCartDrawerOpen: false,
  isSearchOpen: false,
  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
  openCartDrawer: () => set({ isCartDrawerOpen: true }),
  closeCartDrawer: () => set({ isCartDrawerOpen: false }),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
}));