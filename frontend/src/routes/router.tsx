import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { RootLayout } from "@/components/layout/RootLayout";
import { Placeholder } from "@/pages/Placeholder";
import { Home } from "@/pages/Home";
import { NewArrivals, Men, Women, CategoryPage } from "@/pages/Categories";
import { Collections, CollectionPage } from "@/pages/Collections";
import { SearchPage } from "@/pages/SearchPage";
import { ProductDetailPage } from "@/pages/ProductDetail";
import { WishlistPage } from "@/pages/Wishlist";

// Route-level code splitting for heavy & protected sections
const CheckoutPage = lazy(() => import("@/pages/Checkout").then((m) => ({ default: m.CheckoutPage })));
const CheckoutSuccessPage = lazy(() => import("@/pages/CheckoutSuccess").then((m) => ({ default: m.CheckoutSuccessPage })));

const TermsPage = lazy(() => import("@/pages/legal/TermsPage").then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import("@/pages/legal/PrivacyPage").then((m) => ({ default: m.PrivacyPage })));
const ReturnsPage = lazy(() => import("@/pages/legal/ReturnsPage").then((m) => ({ default: m.ReturnsPage })));
const ShippingPage = lazy(() => import("@/pages/legal/ShippingPage").then((m) => ({ default: m.ShippingPage })));
const ContactPage = lazy(() => import("@/pages/legal/ContactPage").then((m) => ({ default: m.ContactPage })));


const LoginPage = lazy(() => import("@/pages/auth/Login").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("@/pages/auth/Register").then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPassword").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPassword").then((m) => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import("@/pages/auth/VerifyEmail").then((m) => ({ default: m.VerifyEmailPage })));

const AccountLayout = lazy(() => import("@/pages/account/AccountLayout").then((m) => ({ default: m.AccountLayout })));
const ProfilePage = lazy(() => import("@/pages/account/Profile").then((m) => ({ default: m.ProfilePage })));
const OrdersPage = lazy(() => import("@/pages/account/Orders").then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import("@/pages/account/OrderDetail").then((m) => ({ default: m.OrderDetailPage })));
const AddressesPage = lazy(() => import("@/pages/account/Addresses").then((m) => ({ default: m.AddressesPage })));

const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import("@/pages/admin/Dashboard").then((m) => ({ default: m.Dashboard })));
const AdminOrders = lazy(() => import("@/pages/admin/AdminOrders").then((m) => ({ default: m.AdminOrders })));
const AdminOrderDetail = lazy(() => import("@/pages/admin/AdminOrderDetail").then((m) => ({ default: m.AdminOrderDetail })));
const AdminCustomers = lazy(() => import("@/pages/admin/AdminCustomers").then((m) => ({ default: m.AdminCustomers })));
const AdminCustomerDetail = lazy(() => import("@/pages/admin/AdminCustomerDetail").then((m) => ({ default: m.AdminCustomerDetail })));
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts").then((m) => ({ default: m.AdminProducts })));
const ProductEditor = lazy(() => import("@/pages/admin/ProductEditor").then((m) => ({ default: m.ProductEditor })));
const InventoryPage = lazy(() => import("@/pages/admin/Inventory").then((m) => ({ default: m.InventoryPage })));
const AdminCollections = lazy(() => import("@/pages/admin/AdminCollections").then((m) => ({ default: m.AdminCollections })));
const AdminDiscounts = lazy(() => import("@/pages/admin/AdminDiscounts").then((m) => ({ default: m.AdminDiscounts })));
const AdminReviews = lazy(() => import("@/pages/admin/AdminReviews").then((m) => ({ default: m.AdminReviews })));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })));

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
      { path: "/terms", element: <TermsPage /> },
      { path: "/privacy", element: <PrivacyPage /> },
      { path: "/returns", element: <ReturnsPage /> },
      { path: "/shipping-policy", element: <ShippingPage /> },
      { path: "/contact", element: <ContactPage /> },


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