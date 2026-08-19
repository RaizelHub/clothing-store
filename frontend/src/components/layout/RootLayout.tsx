import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { Footer } from "./Footer";
import { SearchOverlay } from "./SearchOverlay";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <MobileNav />
      <SearchOverlay />
      <CartDrawer />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}