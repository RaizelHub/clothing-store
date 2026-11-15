import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/api/products";
import { ProductListing } from "@/components/product/ProductListing";
import type { Category } from "@/types/api";
import { cn } from "@/lib/utils";

const WOMEN_TABS = [
  { label: "All Women", href: "/women" },
  { label: "Dresses & Slips", href: "/category/women-dresses" },
  { label: "Knitwear & Tops", href: "/category/women-tops" },
  { label: "Outerwear & Coats", href: "/category/women-outerwear" },
  { label: "Denim & Trousers", href: "/category/women-denim" },
];

const MEN_TABS = [
  { label: "All Men", href: "/men" },
  { label: "Shirts & Knits", href: "/category/men-tops" },
  { label: "Outerwear & Overcoats", href: "/category/men-outerwear" },
  { label: "Tailored Trousers", href: "/category/men-trousers" },
];

export function NewArrivals() {
  return (
    <ProductListing
      title="New Arrivals"
      subtitle="Fresh pieces for your everyday rotation. Find something that feels like you."
      baseQuery={{ new: "true" }}
      showFilters={true}
    />
  );
}

export function Men() {
  return (
    <div>
      <div className="border-b border-stone-200/80 bg-paper py-3.5">
        <div className="container-editorial flex items-center gap-3 overflow-x-auto">
          {MEN_TABS.map((tab) => {
            const isActive = tab.href === "/men";
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "px-4 py-1.5 text-[11px] uppercase tracking-widest transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-ink text-paper font-medium"
                    : "border border-stone-200/90 bg-stone-50 text-stone-600 hover:border-stone-400 hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <ProductListing
        title="For him"
        subtitle="Easy layers, relaxed tailoring, and the pieces you’ll wear on repeat."
        baseQuery={{ category: "men" }}
      />
    </div>
  );
}

export function Women() {
  return (
    <div>
      <div className="border-b border-stone-200/80 bg-paper py-3.5">
        <div className="container-editorial flex items-center gap-3 overflow-x-auto">
          {WOMEN_TABS.map((tab) => {
            const isActive = tab.href === "/women";
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={cn(
                  "px-4 py-1.5 text-[11px] uppercase tracking-widest transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-ink text-paper font-medium"
                    : "border border-stone-200/90 bg-stone-50 text-stone-600 hover:border-stone-400 hover:text-ink",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <ProductListing
        title="For her"
        subtitle="From everyday favorites to a little occasion. Make room for something you love."
        baseQuery={{ category: "women" }}
      />
    </div>
  );
}

// /category/:slug — supports nested categories
export function CategoryPage() {
  const { slug = "" } = useParams();
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const find = (
    list: Category[] | undefined,
    s: string,
  ): Category | undefined => {
    if (!list) return undefined;
    for (const c of list) {
      if (c.slug === s) return c;
      const child = find(c.children ?? [], s);
      if (child) return child;
    }
    return undefined;
  };
  const category = find(categories ?? [], slug);
  const isWomenSub = slug.startsWith("women-");
  const isMenSub = slug.startsWith("men-");

  return (
    <div>
      {(isWomenSub || isMenSub) && (
        <div className="border-b border-stone-200/80 bg-paper py-3.5">
          <div className="container-editorial flex items-center gap-3 overflow-x-auto">
            {(isWomenSub ? WOMEN_TABS : MEN_TABS).map((tab) => {
              const isActive = tab.href === `/category/${slug}`;
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={cn(
                    "px-4 py-1.5 text-[11px] uppercase tracking-widest transition-all duration-200 whitespace-nowrap",
                    isActive
                      ? "bg-ink text-paper font-medium"
                      : "border border-stone-200/90 bg-stone-50 text-stone-600 hover:border-stone-400 hover:text-ink",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <ProductListing
        key={slug}
        title={category?.name ?? "Collection"}
        subtitle={
          category
            ? `${category.name} — meticulously cut and crafted by the Studio.`
            : undefined
        }
        baseQuery={{ category: slug }}
      />
    </div>
  );
}
