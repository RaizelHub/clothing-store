import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCollections, getProducts } from "@/api/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { placeholderImage } from "@/lib/format";

const EDITS = [
  {
    label: "Everyday",
    title: "The everyday edit",
    note: "Easy layers. Good company. No occasion needed.",
    href: "/new",
    image: "photo-1483985988355-763728e1935b",
    alt: "Woman in a burgundy coat carrying shopping bags",
    shape: "48% 48% 3% 3%",
    color: "#e9e3d8",
  },
  {
    label: "Dressed up",
    title: "A little occasion",
    note: "For dinner plans that turn into late nights.",
    href: "/category/women-dresses",
    image: "photo-1515886657613-9f3515b0c78f",
    alt: "Street style in a flowing golden outfit",
    shape: "3% 38% 3% 38%",
    color: "#e6dfb9",
  },
  {
    label: "Off duty",
    title: "Take it easy",
    note: "Relaxed shapes for whatever the day brings.",
    href: "/men",
    image: "photo-1617137984095-74e4e5e3613f",
    alt: "Relaxed menswear styled for a day in the city",
    shape: "35% 3% 35% 3%",
    color: "#dbe0d4",
  },
];

export function Home() {
  const [activeEdit, setActiveEdit] = useState(0);
  const edit = EDITS[activeEdit];
  const arrivals = useQuery({
    queryKey: ["products", { sort: "newest", page: 1 }],
    queryFn: () => getProducts({ sort: "newest", page: 1 }),
  });
  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
  });
  const { data: recentlyViewed } = useRecentlyViewed();

  return (
    <div className="studio-home">
      <section
        className="studio-hero container-editorial"
        aria-labelledby="hero-heading"
      >
        <div className="hero-copy">
          <p className="studio-eyebrow">
            <span className="status-dot" /> A fresh point of view
          </p>
          <h1 id="hero-heading">
            Good clothes.
            <br />
            Great <em>days.</em>
          </h1>
          <p className="hero-description">
            The pieces you reach for. The outfits that feel like you. Meet your
            next everyday favorites.
          </p>
          <Link to="/new" className="studio-cta">
            Find your next favorite <ArrowUpRight size={19} />
          </Link>
          <div className="hero-footnote">
            <span className="little-star" aria-hidden="true">
              ✳
            </span>
            <span>
              A wardrobe for living in.
              <br />
              <span className="text-stone-500">Make it your own.</span>
            </span>
          </div>
        </div>
        <div
          className="hero-editorial"
          style={{ "--edit-color": edit.color } as CSSProperties}
        >
          <div className="hero-image-stage">
            <span className="hero-margin-note">
              STUDIO / THE EVERYDAY SERIES
            </span>
            <div
              className="hero-morph-frame"
              style={{ borderRadius: edit.shape }}
            >
              {EDITS.map((item, index) => (
                <img
                  key={item.label}
                  src={`https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=1200&q=85`}
                  alt={index === activeEdit ? item.alt : ""}
                  aria-hidden={index !== activeEdit}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className={index === activeEdit ? "is-active" : ""}
                />
              ))}
            </div>
            <div className="hero-sticker" aria-hidden="true">
              <span>Wear it.</span>
              <em>Love it.</em>
              <span>Repeat.</span>
            </div>
            <span className="hero-image-index" aria-hidden="true">
              0{activeEdit + 1} / 03
            </span>
          </div>
          <div
            className="edit-selector"
            role="group"
            aria-label="Choose your edit"
          >
            <span
              className="edit-selector-track"
              aria-hidden="true"
              style={{ transform: `translateX(${activeEdit * 100}%)` }}
            />
            {EDITS.map((item, index) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={index === activeEdit}
                aria-controls="active-edit"
                onClick={() => setActiveEdit(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            id="active-edit"
            className="hero-edit-caption"
            aria-live="polite"
          >
            <div key={edit.label} className="edit-caption-copy">
              <span>{edit.title}</span>
              <p>{edit.note}</p>
            </div>
            <Link
              to={edit.href}
              aria-label={`Shop ${edit.title.toLowerCase()}`}
              className="round-link"
            >
              <ArrowUpRight size={21} />
            </Link>
          </div>
        </div>
      </section>
      <div className="studio-ticker">
        <div className="container-editorial">
          <span>Less overthinking. More wearing.</span>
          <span className="hidden sm:inline" aria-hidden="true">
            ✳
          </span>
          <span className="hidden sm:inline">
            Find something that feels like you.
          </span>
          <a href="#new-favorites" aria-label="Browse new favorites">
            <ArrowDown size={18} />
          </a>
        </div>
      </div>
      <section
        id="new-favorites"
        className="container-editorial studio-section"
      >
        <div className="studio-section-heading">
          <div>
            <p className="studio-eyebrow">Just landed</p>
            <h2>New favorites.</h2>
          </div>
          <Link to="/new" className="studio-text-link">
            Shop new arrivals <ArrowUpRight size={17} />
          </Link>
        </div>
        {arrivals.isError ? (
          <div className="home-load-error">
            <p>We couldn’t load the latest pieces.</p>
            <button
              onClick={() => void arrivals.refetch()}
              className="studio-text-link"
            >
              Try again <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <ProductGrid
            products={arrivals.data?.results.slice(0, 4) ?? []}
            loading={arrivals.isLoading}
          />
        )}
      </section>
      <section
        className="container-editorial studio-section category-editorial"
        aria-labelledby="category-heading"
      >
        <div className="category-intro">
          <p className="studio-eyebrow">Your wardrobe, your rules</p>
          <h2 id="category-heading">
            A little more
            <br />
            <em>you.</em>
          </h2>
          <p>
            Start with what you love.
            <br />
            See where it takes you.
          </p>
          <Link to="/collections" className="studio-text-link">
            Explore the collections <ArrowUpRight size={17} />
          </Link>
        </div>
        <Link to="/women" className="category-feature">
          <div className="category-photo">
            <img
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=850&q=85"
              alt="Street style in a flowing golden outfit"
              loading="lazy"
            />
          </div>
          <span>
            <span>For her</span>
            <span className="round-link">
              <ArrowUpRight size={22} />
            </span>
          </span>
        </Link>
        <Link to="/men" className="category-feature category-feature-offset">
          <div className="category-photo">
            <img
              src="https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?auto=format&fit=crop&w=850&q=85"
              alt="Menswear with relaxed tailoring"
              loading="lazy"
            />
          </div>
          <span>
            <span>For him</span>
            <span className="round-link">
              <ArrowUpRight size={22} />
            </span>
          </span>
        </Link>
      </section>
      <section className="studio-note">
        <div className="container-editorial">
          <span className="little-star" aria-hidden="true">
            ✳
          </span>
          <p>
            Less “saving it for best.”
            <br />
            More <em>wearing it today.</em>
          </p>
          <Link to="/collections" className="studio-cta studio-cta-light">
            Find your everyday rotation <ArrowUpRight size={18} />
          </Link>
          <span className="studio-eyebrow">A note from Studio</span>
        </div>
      </section>
      {collections && collections.length > 0 && (
        <section className="container-editorial studio-section">
          <div className="studio-section-heading">
            <div>
              <p className="studio-eyebrow">A few ways to wear it</p>
              <h2>In good company.</h2>
            </div>
            <Link to="/collections" className="studio-text-link">
              All collections <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="collection-stories">
            {collections.slice(0, 3).map((collection, index) => (
              <Link
                key={collection.id}
                to={`/collections/${collection.slug}`}
                className="collection-story"
              >
                <div className="collection-story-image">
                  <img
                    src={
                      collection.hero_image ??
                      placeholderImage(collection.slug, "#c7bda9", 0)
                    }
                    alt={collection.name}
                    onError={(event) => {
                      const fallback = placeholderImage(
                        collection.slug,
                        "#c7bda9",
                        0,
                      );
                      if (event.currentTarget.src !== fallback)
                        event.currentTarget.src = fallback;
                    }}
                    loading="lazy"
                  />
                  <span>0{index + 1}</span>
                </div>
                <div>
                  <h3>{collection.name}</h3>
                  <Plus size={19} />
                </div>
                <p>{collection.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      {!!recentlyViewed?.length && (
        <section className="container-editorial studio-section">
          <div className="studio-section-heading">
            <div>
              <p className="studio-eyebrow">Worth another look</p>
              <h2>On your mind.</h2>
            </div>
          </div>
          <ProductGrid products={recentlyViewed.slice(0, 4)} />
        </section>
      )}
    </div>
  );
}
