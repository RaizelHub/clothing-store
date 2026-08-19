import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/components/layout/RootLayout";
import { Placeholder } from "@/pages/Placeholder";
import { Home } from "@/pages/Home";
import { NewArrivals, Men, Women, CategoryPage } from "@/pages/Categories";
import { Collections, CollectionPage } from "@/pages/Collections";
import { SearchPage } from "@/pages/SearchPage";
import { ProductDetailPage } from "@/pages/ProductDetail";
import { WishlistPage } from "@/pages/Wishlist";
import { CheckoutPage } from "@/pages/Checkout";
import { CheckoutSuccessPage } from "@/pages/CheckoutSuccess";

import { LoginPage } from "@/pages/auth/Login";
import { RegisterPage } from "@/pages/auth/Register";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPassword";
import { ResetPasswordPage } from "@/pages/auth/ResetPassword";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmail";

import { AccountLayout } from "@/pages/account/AccountLayout";
import { ProfilePage } from "@/pages/account/Profile";
import { OrdersPage } from "@/pages/account/Orders";
import { OrderDetailPage } from "@/pages/account/OrderDetail";
import { AddressesPage } from "@/pages/account/Addresses";

import { AdminLayout } from "@/pages/admin/AdminLayout";
import { Dashboard } from "@/pages/admin/Dashboard";
import { AdminOrders } from "@/pages/admin/AdminOrders";
import { AdminOrderDetail } from "@/pages/admin/AdminOrderDetail";
import { AdminCustomers } from "@/pages/admin/AdminCustomers";
import { AdminCustomerDetail } from "@/pages/admin/AdminCustomerDetail";
import { AdminProducts } from "@/pages/admin/AdminProducts";
import { ProductEditor } from "@/pages/admin/ProductEditor";
import { InventoryPage } from "@/pages/admin/Inventory";
import { AdminCollections } from "@/pages/admin/AdminCollections";
import { AdminDiscounts } from "@/pages/admin/AdminDiscounts";
import { AdminReviews } from "@/pages/admin/AdminReviews";
import { AdminSettings } from "@/pages/admin/AdminSettings";

import { RequireAuth, RequireGuest, RequireAdmin } from "@/routes/guards";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/new", element: <NewArrivals /> },
      { path: "/men", element: <Men /> },
      { path: "/women", element: <Women /> },
      { path: "/category/:slug?", element: <CategoryPage /> },
      { path: "/collections", element: <Collections /> },
      { path: "/collections/:slug", element: <CollectionPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/products/:slug", element: <ProductDetailPage /> },
      { path: "/wishlist", element: <WishlistPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/checkout/success/:orderNumber", element: <CheckoutSuccessPage /> },

      {
        path: "/login",
        element: (
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        ),
      },
      {
        path: "/register",
        element: (
          <RequireGuest>
            <RegisterPage />
          </RequireGuest>
        ),
      },
      {
        path: "/forgot-password",
        element: (
          <RequireGuest>
            <ForgotPasswordPage />
          </RequireGuest>
        ),
      },
      {
        path: "/reset-password",
        element: (
          <RequireGuest>
            <ResetPasswordPage />
          </RequireGuest>
        ),
      },
      { path: "/verify-email", element: <VerifyEmailPage /> },

      {
        path: "/account",
        element: (
          <RequireAuth>
            <AccountLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <ProfilePage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "orders/:orderNumber", element: <OrderDetailPage /> },
          { path: "addresses", element: <AddressesPage /> },
        ],
      },

      {
        path: "/admin",
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: "orders", element: <AdminOrders /> },
          { path: "orders/:orderNumber", element: <AdminOrderDetail /> },
          { path: "customers", element: <AdminCustomers /> },
          { path: "customers/:id", element: <AdminCustomerDetail /> },
          { path: "products", element: <AdminProducts /> },
          { path: "products/new", element: <ProductEditor /> },
          { path: "products/:id/edit", element: <ProductEditor /> },
          { path: "inventory", element: <InventoryPage /> },
          { path: "collections", element: <AdminCollections /> },
          { path: "discounts", element: <AdminDiscounts /> },
          { path: "reviews", element: <AdminReviews /> },
          { path: "settings", element: <AdminSettings /> },
        ],
      },

      { path: "*", element: <Placeholder title="Page not found" phase="404" /> },
    ],
  },
]);