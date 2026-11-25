import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function RootErrorBoundary() {
  const error = useRouteError();

  let title = "An unexpected error occurred";
  let message = "We encountered a temporary interruption while loading this page. Our atelier has been notified.";
  let status = 500;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "Page Not Found";
      message = "The garment, collection, or archive link you requested could not be located.";
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    if (error.message.includes("dynamically imported module") || error.message.includes("Failed to fetch")) {
      title = "Connection Interrupted";
      message = "A network change or application update occurred. Refreshing will load the latest version.";
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main id="main-content" className="flex flex-1 items-center justify-center py-20 px-6">
        <div className="max-w-md w-full border border-stone-200/90 bg-paper p-8 sm:p-12 text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-stone-100 text-stone-500 mx-auto">
            <AlertCircle size={24} strokeWidth={1.5} />
          </div>

          <span className="font-mono text-xs uppercase tracking-widest text-stone-400">
            {status === 404 ? "Status 404" : "Studio Storefront Notice"}
          </span>

          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-ink font-normal">
            {title}
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
            {message}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-ink bg-ink px-5 py-2.5 text-xs uppercase tracking-widest font-medium text-paper hover:bg-stone-800 transition-colors"
            >
              <RefreshCw size={12} />
              Reload Page
            </button>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 border border-stone-300 px-5 py-2.5 text-xs uppercase tracking-widest font-medium text-stone-600 hover:border-ink hover:text-ink transition-colors"
            >
              <ArrowLeft size={12} />
              Return Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
