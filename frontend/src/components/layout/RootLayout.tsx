import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { SearchOverlay } from "./SearchOverlay";
import { CartDrawer } from "@/components/cart/CartDrawer";

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-ink" />
    </div>
  );
}

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <MobileNav />
      <SearchOverlay />
      <CartDrawer />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
