import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { SearchOverlay } from "./SearchOverlay";
import { CartDrawer } from "@/components/cart/CartDrawer";

function RouteLoadingFallback() {
  return (
    <div className="container-editorial py-16 animate-pulse space-y-8 min-h-[50vh]">
      <div className="h-4 w-32 bg-stone-200/80" />
      <div className="h-10 w-64 bg-stone-200/80" />
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/5] bg-stone-200/60" />
        ))}
      </div>
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
