// Seed catalog for the mock API. Mirrors the data model in the backend brief:
// Product -> ProductVariant (Color x Size x SKU x price override x stock).
// All SKUs follow the fodder format from the brief: STU-BLK-S.
import type {
  Address,
  Category,
  Collection,
  Color,
  Coupon,
  Order,
  ProductImage,
  Review,
  Size,
  StoreSettings,
  User,
} from "@/types/api";
import { placeholderImage, hashString } from "@/lib/format";

export interface DBVariant {
  id: number;
  sku: string;
  color_id: number;
  size_id: number;
  price_override_cents: number | null;
  stock: number;
}

export interface DBProduct {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  care: string;
  fit: string;
  base_price_cents: number;
  sale_price_cents: number | null;
  category_id: number;
  is_featured: boolean;
  is_new: boolean;
  created_at: string;
  variants: DBVariant[];
  colors: number[];
  images: ProductImage[];
}

export interface DBUser extends User {
  password: string;
  addresses: Address[];
}

export interface DBOrder extends Order {
  user_id: number | null;
}

export interface DBCartItem {
  id: number;
  variant_id: number;
  quantity: number;
}

let variantSeq = 1;
let imageSeq = 1;

function colorId(name: string, colors: Color[]): number {
  const c = colors.find((c) => c.name === name);
  if (!c) throw new Error(`unknown color ${name}`);
  return c.id;
}

function sizeId(name: string, sizes: Size[]): number {
  const s = sizes.find((s) => s.name === name);
  if (!s) throw new Error(`unknown size ${name}`);
  return s.id;
}

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 864e5).toISOString();
}

// Curated photography map for all catalog items and colorways
const PRODUCT_IMAGE_MAP: Record<string, Record<string, [string, string]>> = {
  "essential-oversized-tee": {
    Black: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80",
    ],
    White: [
      "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "relaxed-linen-shirt": {
    White: [
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80",
    ],
    Olive: [
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "merino-crewneck": {
    Navy: [
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=80",
    ],
    Black: [
      "https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "selvedge-denim-jacket": {
    Navy: [
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "wool-blend-overcoat": {
    Black: [
      "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1000&q=80",
    ],
    Olive: [
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "straight-leg-trouser": {
    Black: [
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "boxy-oxford-shirt": {
    White: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80",
    ],
    Black: [
      "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "silk-slip-dress": {
    Black: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
    ],
    Bordeaux: [
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "ribbed-knit-midi-dress": {
    Olive: [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
    ],
    Black: [
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "tiered-linen-maxi-dress": {
    White: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
    ],
    Bordeaux: [
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "sculpted-column-dress": {
    Black: [
      "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1568252542512-9fe8fe9c87bb?auto=format&fit=crop&w=1000&q=80",
    ],
    Navy: [
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "high-rise-cropped-jean": {
    Stone: [
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=1000&q=80",
    ],
    Navy: [
      "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "cable-knit-cardigan": {
    Stone: [
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80",
    ],
    Olive: [
      "https://images.unsplash.com/photo-1608234808654-2a8875fa7665?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1000&q=80",
    ],
    Black: [
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "tailored-blazer": {
    Black: [
      "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=1000&q=80",
    ],
  },
  "poplin-blouse": {
    White: [
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1000&q=80",
    ],
    Stone: [
      "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1000&q=80",
    ],
  },
};

// Builds variants for product `slug` given per-color size stock maps.
// colorMap: color name -> { sizes: [sizeName, stock][], price_override_cents? }
function variantsFor(
  slug: string,
  colorsList: Color[],
  sizesList: Size[],
  colorMap: Record<string, { sizes: [string, number][]; override?: number | null }>
): { variants: DBVariant[]; colorIds: number[]; images: ProductImage[] } {
  const variants: DBVariant[] = [];
  const colorIds: number[] = [];
  const images: ProductImage[] = [];
  let colorIndex = 0;
  for (const [colorName, spec] of Object.entries(colorMap)) {
    const cid = colorId(colorName, colorsList);
    colorIds.push(cid);
    const hex = colorsList.find((c) => c.id === cid)!.hex;
    const colorCode = colorName.slice(0, 3).toUpperCase();
    for (const [sizeName, stock] of spec.sizes) {
      variants.push({
        id: variantSeq++,
        sku: `STU-${colorCode}-${sizeName[0]}${sizeName.length > 1 ? sizeName.slice(1) : ""}`,
        color_id: cid,
        size_id: sizeId(sizeName, sizesList),
        price_override_cents: spec.override ?? null,
        stock,
      });
    }
    const customPhotos = PRODUCT_IMAGE_MAP[slug]?.[colorName];
    images.push(
      {
        id: imageSeq++,
        image: customPhotos?.[0] ?? placeholderImage(slug, hex, 0),
        alt: `${slug} in ${colorName}`,
        color: cid,
        position: colorIndex * 2,
      },
      {
        id: imageSeq++,
        image: customPhotos?.[1] ?? placeholderImage(slug, hex, 1),
        alt: `${slug} in ${colorName}, detail`,
        color: cid,
        position: colorIndex * 2 + 1,
      }
    );
    colorIndex++;
  }
  return { variants, colorIds, images };
}

const SIZES: Size[] = [
  { id: 1, name: "XS", sort_order: 1 },
  { id: 2, name: "S", sort_order: 2 },
  { id: 3, name: "M", sort_order: 3 },
  { id: 4, name: "L", sort_order: 4 },
  { id: 5, name: "XL", sort_order: 5 },
  { id: 6, name: "XXL", sort_order: 6 },
];

const COLORS: Color[] = [
  { id: 1, name: "Black", hex: "#181715" },
  { id: 2, name: "White", hex: "#efede7" },
  { id: 3, name: "Stone", hex: "#c7bda9" },
  { id: 4, name: "Olive", hex: "#5f5c49" },
  { id: 5, name: "Navy", hex: "#2b3248" },
  { id: 6, name: "Bordeaux", hex: "#5d2a30" },
];

const CATEGORIES: Category[] = [
  { id: 1, name: "Men", slug: "men", parent: null },
  { id: 2, name: "Women", slug: "women", parent: null },
  { id: 3, name: "Tops", slug: "men-tops", parent: 1 },
  { id: 4, name: "Outerwear", slug: "men-outerwear", parent: 1 },
  { id: 5, name: "Trousers", slug: "men-trousers", parent: 1 },
  { id: 6, name: "Tops", slug: "women-tops", parent: 2 },
  { id: 7, name: "Outerwear", slug: "women-outerwear", parent: 2 },
  { id: 8, name: "Dresses", slug: "women-dresses", parent: 2 },
  { id: 9, name: "Denim", slug: "women-denim", parent: 2 },
];

const stock = (seed: number): [string, number][] => {
  const h = hashString(String(seed));
  const base = [3, 8, 12, 22, 15, 6];
  return SIZES.map((s, i) => [s.name, Math.max(0, base[(i + h) % 6] + ((h >> i) % 5) - 2)] as [string, number]);
};

function product(
  p: Omit<DBProduct, "images" | "variants" | "colors"> & {
    colorMap: Record<string, { sizes: [string, number][]; override?: number | null }>;
    colorsList?: Color[];
    sizesList?: Size[];
  }
): DBProduct {
  const { colorMap, colorsList = COLORS, sizesList = SIZES, ...rest } = p;
  const built = variantsFor(rest.slug, colorsList, sizesList, colorMap);
  return {
    ...rest,
    images: built.images,
    variants: built.variants,
    colors: built.colorIds,
  };
}

function buildProducts(): DBProduct[] {
  const mk = (
    slug: string,
    overrides: Partial<Omit<DBProduct, "variants" | "colors" | "images">> & {
      colorMap?: Record<string, { sizes: [string, number][]; override?: number | null }>;
    } = {}
  ) =>
    ({
      slug,
      tagline: "",
      description: "",
      care: "",
      fit: "",
      is_new: false,
      ...overrides,
    } as Omit<DBProduct, "variants" | "colors" | "images"> & {
      colorMap: Record<string, { sizes: [string, number][]; override?: number | null }>;
    });

  const list: DBProduct[] = [];

  list.push(
    product({
      ...mk("essential-oversized-tee", {
        id: 1,
        name: "Essential Oversized Tee",
        tagline: "Heavyweight cotton, dropped shoulders, a shape that ages well.",
        description:
          "A 260gsm combed-cotton tee cut long and loose. Reinforced collar, side-seamed, garment-washed for softness from the first wear.",
        care: "Machine wash cold. Dry flat. Do not bleach.",
        fit: "Relaxed — designed to be worn true to size for a slouch, or one down for a cleaner line.",
        base_price_cents: 4500,
        category_id: 3,
        is_featured: true,
        created_at: iso(40),
        colorMap: {
          Black: { sizes: stock(101) },
          White: { sizes: stock(102) },
          Stone: { sizes: stock(103) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("relaxed-linen-shirt", {
        id: 2,
        name: "Relaxed Linen Shirt",
        tagline: "Washer-soft European linen with a lived-in drape.",
        description:
          "Mid-weight washed linen with a natural crease it keeps on purpose. Mother-of-pearl buttons, curved hem, single chest pocket.",
        care: "Machine wash gentle. Hang dry.",
        fit: "Relaxed through the body; sizes down for a tailored look.",
        base_price_cents: 9500,
        category_id: 3,
        created_at: iso(24),
        is_new: true,
        colorMap: {
          White: { sizes: stock(111) },
          Stone: { sizes: stock(112) },
          Olive: { sizes: stock(113) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("merino-crewneck", {
        id: 3,
        name: "Merino Crewneck",
        tagline: "Fine-gauge merino that layers under anything.",
        description:
          "17.5-micron merino knitted at a 12-gauge, fully fashioned. Ribbed trim that keeps its shape, and a hand that feels like nothing else against the skin.",
        care: "Hand wash cold, dry flat. Or dry clean.",
        fit: "Regular fit with clean shoulders.",
        base_price_cents: 12000,
        category_id: 3,
        is_featured: true,
        created_at: iso(60),
        colorMap: {
          Navy: { sizes: stock(121) },
          Stone: { sizes: stock(122) },
          Black: { sizes: stock(123) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("selvedge-denim-jacket", {
        id: 4,
        name: "Selvedge Denim Jacket",
        tagline: "Raw selvedge that breaks in like a second skin.",
        description:
          "14oz North-Carolina selvedge denim, boxy cut, chain-stitched hems. Buy it stiff and watch it shape to you over a year of wear.",
        care: "Wash rarely and cold. Air dry.",
        fit: "Boxy, cropped at the waist.",
        base_price_cents: 19500,
        sale_price_cents: 15500,
        category_id: 4,
        created_at: iso(80),
        colorMap: {
          Navy: { sizes: stock(131) },
          Stone: { sizes: stock(132) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("wool-blend-overcoat", {
        id: 5,
        name: "Wool Blend Overcoat",
        tagline: "The coat you will reach for every day of winter.",
        description:
          "A 78% wool, 22% cashmere blend, cut with a soft shoulder and enough room for a knit or blazer beneath. Milled in Prato, finished by hand.",
        care: "Dry clean only.",
        fit: "Relaxed, slightly oversized through the body.",
        base_price_cents: 48000,
        category_id: 4,
        is_featured: true,
        created_at: iso(15),
        is_new: true,
        colorMap: {
          Black: { sizes: stock(141) },
          Olive: { sizes: stock(142) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("straight-leg-trouser", {
        id: 6,
        name: "Straight-Leg Trouser",
        tagline: "A clean trouser with a tailored hold.",
        description:
          "Wool-linen twill with a flat front, hidden hook closure and a straight leg from hip to hem. Sits at the true waist.",
        care: "Dry clean or hand wash.",
        fit: "True waist, straight fit, full length.",
        base_price_cents: 11000,
        category_id: 5,
        created_at: iso(45),
        colorMap: {
          Black: { sizes: stock(151) },
          Stone: { sizes: stock(152) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("boxy-oxford-shirt", {
        id: 7,
        name: "Boxy Oxford Shirt",
        tagline: "The classic oxford, cut with intent.",
        description:
          "Heavy 3-ply oxford in a boxy cut with a button-down collar and corozo buttons. Pre-shrunk so the fit stays put.",
        care: "Machine wash warm. Tumble dry low.",
        fit: "Boxy in the chest, straight through the hem.",
        base_price_cents: 10500,
        category_id: 3,
        created_at: iso(50),
        colorMap: {
          White: { sizes: stock(161) },
          Black: { sizes: stock(162) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("silk-slip-dress", {
        id: 8,
        name: "Silk Slip Dress",
        tagline: "Bias-cut 22-momme silk that moves like liquid.",
        description:
          "A bias-cut slip in 22-momme sandwashed silk. Adjustable straps, a slit that stops just above the knee, and a weight that hangs beautifully.",
        care: "Hand wash cold or dry clean.",
        fit: "Bias cut — skims, never clings.",
        base_price_cents: 18500,
        category_id: 8,
        is_featured: true,
        created_at: iso(20),
        is_new: true,
        colorMap: {
          Black: { sizes: stock(171) },
          Stone: { sizes: stock(172) },
          Bordeaux: { sizes: stock(173) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("high-rise-cropped-jean", {
        id: 9,
        name: "High-Rise Cropped Jean",
        tagline: "A hard-wearing jean with a 90s silhouette.",
        description:
          "14oz rigid denim, high rise, straight through the hip and cropped at the ankle. Sits where jeans should: high, and proud.",
        care: "Wash cold, hang dry.",
        fit: "High rise, cropped at ankle.",
        base_price_cents: 14500,
        sale_price_cents: 11800,
        category_id: 9,
        created_at: iso(70),
        colorMap: {
          Stone: { sizes: stock(181) },
          Navy: { sizes: stock(182) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("cable-knit-cardigan", {
        id: 10,
        name: "Cable Knit Cardigan",
        tagline: "A chunky knit the colour of a winter afternoon.",
        description:
          "Wool-and-mohair blend, chunky cable knit, horn buttons down the front. Shrunken, washed and dried to lock the texture.",
        care: "Hand wash cold, dry flat.",
        fit: "Oversized and slouchy by design.",
        base_price_cents: 13500,
        category_id: 6,
        is_featured: true,
        created_at: iso(10),
        is_new: true,
        colorMap: {
          Stone: { sizes: stock(191) },
          Olive: { sizes: stock(192) },
          Black: { sizes: stock(193) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("tailored-blazer", {
        id: 11,
        name: "Tailored Double-Breasted Blazer",
        tagline: "Structured shoulders, a waist that doesn't disappear.",
        description:
          "Wool-blend twill with a soft-structured shoulder, double-breasted closure and a hint of peplum at the waist.",
        care: "Dry clean only.",
        fit: "Fitted through the waist, hits below the hip.",
        base_price_cents: 32000,
        category_id: 7,
        created_at: iso(12),
        is_new: true,
        colorMap: {
          Black: { sizes: stock(201) },
          Stone: { sizes: stock(202) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("poplin-blouse", {
        id: 12,
        name: "Structured Poplin Blouse",
        tagline: "Crisp cotton poplin with second-skin sleeves.",
        description:
          "High-twist cotton poplin, shaping darts at the waist and a French cuff. Crisp where it should be, soft where it counts.",
        care: "Machine wash cold. Iron on low.",
        fit: "Fitted bodice, slightly cropped.",
        base_price_cents: 8500,
        category_id: 6,
        created_at: iso(18),
        is_new: true,
        colorMap: {
          White: { sizes: stock(211) },
          Stone: { sizes: stock(212) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("ribbed-knit-midi-dress", {
        id: 13,
        name: "Ribbed Knit Midi Dress",
        tagline: "Form-fitting ribbed merino that hugs and moves.",
        description:
          "Spun from ultra-fine Australian merino wool with a body-skimming rib construction. High neckline, slight slit at the left calf, and rich texture from collar to hem.",
        care: "Hand wash cold. Dry flat.",
        fit: "Close fit with plenty of natural stretch.",
        base_price_cents: 16500,
        category_id: 8,
        is_featured: true,
        created_at: iso(8),
        is_new: true,
        colorMap: {
          Olive: { sizes: stock(221) },
          Stone: { sizes: stock(222) },
          Black: { sizes: stock(223) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("tiered-linen-maxi-dress", {
        id: 14,
        name: "Tiered Linen Maxi Dress",
        tagline: "Breezy washed European linen with delicate tiers.",
        description:
          "Airy 100% Normandy linen gathered in three gentle tiers. Features discreet side pockets, a soft scoop neck, and a billowing drape perfect for warmer days or layered with knitwear.",
        care: "Machine wash cold gentle. Line dry.",
        fit: "Flowy, relaxed silhouette.",
        base_price_cents: 19500,
        sale_price_cents: 15500,
        category_id: 8,
        created_at: iso(5),
        is_new: true,
        colorMap: {
          White: { sizes: stock(231) },
          Stone: { sizes: stock(232) },
          Bordeaux: { sizes: stock(233) },
        },
      })
    })
  );

  list.push(
    product({
      ...mk("sculpted-column-dress", {
        id: 15,
        name: "Sculpted Column Dress",
        tagline: "Architectural silhouette in heavyweight matte crepe.",
        description:
          "Cut from Japanese bonded matte crepe that holds an intentional straight line without clinging. Clean square neckline and invisible back closure.",
        care: "Dry clean only.",
        fit: "Straight column fit, true to size.",
        base_price_cents: 22000,
        category_id: 8,
        is_featured: true,
        created_at: iso(3),
        is_new: true,
        colorMap: {
          Black: { sizes: stock(241) },
          Navy: { sizes: stock(242) },
          Stone: { sizes: stock(243) },
        },
      })
    })
  );

  return list;
}

export function seedDB(): {
  colors: Color[];
  sizes: Size[];
  categories: Category[];
  collections: Collection[];
  products: DBProduct[];
  users: DBUser[];
  carts: Record<string, DBCartItem[]>;
  wishes: Record<string, number[]>;
  orders: DBOrder[];
  coupons: Coupon[];
  reviews: Review[];
  newsletter: string[];
  settings: StoreSettings;
  refreshTokens: { token: string; user_id: number }[];
  seq: Record<string, number>;
} {
  const products = buildProducts();

  const customers: DBUser[] = [
    {
      id: 2,
      email: "elena@example.com",
      password: "password123",
      first_name: "Elena",
      last_name: "Marino",
      role: "customer",
      is_staff: false,
      email_verified: true,
      created_at: iso(210),
      addresses: [
        {
          id: 1,
          label: "Home",
          recipient: "Elena Marino",
          line1: "412 Amsterdam Ave",
          line2: "Apt 4B",
          city: "New York",
          state: "NY",
          postal_code: "10024",
          country: "US",
          phone: "+1 212 555 0184",
          is_default: true,
        },
      ],
    },
    {
      id: 3,
      email: "jonas@example.com",
      password: "password123",
      first_name: "Jonas",
      last_name: "Ferreira",
      role: "customer",
      is_staff: false,
      email_verified: true,
      created_at: iso(150),
      addresses: [
        {
          id: 2,
          label: "Home",
          recipient: "Jonas Ferreira",
          line1: "88 Chaussee d'Antin",
          line2: "",
          city: "Paris",
          state: "",
          postal_code: "75009",
          country: "FR",
          phone: "+33 1 42 66 00 89",
          is_default: true,
        },
      ],
    },
    {
      id: 4,
      email: "sasha@example.com",
      password: "password123",
      first_name: "Sasha",
      last_name: "Kim",
      role: "customer",
      is_staff: false,
      email_verified: true,
      created_at: iso(90),
      addresses: [],
    },
  ];
  const admin: DBUser = {
    id: 1,
    email: "admin@studio.test",
    password: "admin12345",
    first_name: "Studio",
    last_name: "Admin",
    role: "admin",
    is_staff: true,
    email_verified: true,
    created_at: iso(400),
    addresses: [],
  };

  const orders: DBOrder[] = [];
  const mkOrder = (
    id: number,
    user_id: number | null,
    customerName: string,
    status: DBOrder["status"],
    daysAgo: number,
    items: { productId: number; colorName: string; sizeName: string; qty: number }[]
  ): DBOrder => {
    const lineItems = items.map((it, i) => {
      const p = products.find((p) => p.id === it.productId)!;
      const v = p.variants.find(
        (v) => v.color_id === COLORS.find((c) => c.name === it.colorName)!.id && v.size_id === SIZES.find((s) => s.name === it.sizeName)!.id
      )!;
      const cents = v.price_override_cents ?? p.sale_price_cents ?? p.base_price_cents;
      const image = p.images.find((im) => im.color === v.color_id)!;
      return {
        id: i + 1,
        product_name: p.name,
        sku: v.sku,
        color_name: it.colorName,
        size_name: it.sizeName,
        unit_price: (cents / 100).toFixed(2),
        quantity: it.qty,
        image: image?.image ?? null,
      };
    });
    const subtotalC = lineItems.reduce((s, l) => s + Math.round(parseFloat(l.unit_price) * 100) * l.quantity, 0);
    const shippingC = subtotalC >= 15000 ? 0 : 1200;
    const taxC = Math.round((subtotalC + shippingC) * 0.08);
    const totalC = subtotalC + shippingC + taxC;
    const baseTimeline: DBOrder["timeline"] = [
      { status: "pending", at: iso(daysAgo + 0.1), note: null },
      { status: "paid", at: iso(daysAgo + 0.05), note: "Payment confirmed" },
    ];
    if (status === "shipped" || status === "delivered") {
      baseTimeline.push({ status: "processing", at: iso(daysAgo - 1), note: null });
    }
    if (status === "shipped" || status === "delivered") {
      baseTimeline.push({
        status: "shipped",
        at: iso(daysAgo - 3),
        note: null,
      });
    }
    if (status === "delivered") {
      baseTimeline.push({ status: "delivered", at: iso(daysAgo - 6), note: "Left at door" });
    }
    return {
      id,
      order_number: `ST-${1000 + id * 17}`,
      status,
      items: lineItems,
      subtotal: (subtotalC / 100).toFixed(2),
      shipping: (shippingC / 100).toFixed(2),
      discount: "0.00",
      tax: (taxC / 100).toFixed(2),
      total: (totalC / 100).toFixed(2),
      coupon_code: null,
      shipping_address: {
        recipient: customerName,
        line1: user_id === 2 ? "412 Amsterdam Ave" : "19 Motomachi",
        line2: "",
        city: user_id === 2 ? "New York" : "Naka-ku",
        state: user_id === 2 ? "NY" : "",
        postal_code: user_id === 2 ? "10024" : "231-0005",
        country: user_id === 2 ? "US" : "JP",
        phone: "+1 212 555 0184",
      },
      billing_address: {
        recipient: customerName,
        line1: user_id === 2 ? "412 Amsterdam Ave" : "19 Motomachi",
        line2: "",
        city: user_id === 2 ? "New York" : "Naka-ku",
        state: user_id === 2 ? "NY" : "",
        postal_code: user_id === 2 ? "10024" : "231-0005",
        country: user_id === 2 ? "US" : "JP",
        phone: "+1 212 555 0184",
      },
      billing_same_as_shipping: true,
      shipping_method: "standard",
      payment_method: "PM Card",
      tracking_number: status === "shipped" || status === "delivered" ? `PM${70000000000 + id * 31}` : null,
      carrier: status === "shipped" || status === "delivered" ? "DHL Express" : null,
      timeline: baseTimeline,
      created_at: iso(daysAgo),
      customer_email: user_id === 2 ? "elena@example.com" : user_id === 3 ? "jonas@example.com" : "guest@example.com",
      customer_name: user_id === 3 ? "Jonas Ferreira" : user_id === null ? "Guest Customer" : customerName,
      user_id,
    };
  };

  orders.push(
    mkOrder(1, 2, "Elena Marino", "delivered", 52, [
      { productId: 1, colorName: "Black", sizeName: "M", qty: 1 },
      { productId: 6, colorName: "Stone", sizeName: "S", qty: 1 },
    ]),
    mkOrder(2, 2, "Elena Marino", "delivered", 30, [
      { productId: 8, colorName: "Bordeaux", sizeName: "S", qty: 1 },
    ]),
    mkOrder(3, 3, "Jonas Ferreira", "shipped", 12, [
      { productId: 5, colorName: "Black", sizeName: "L", qty: 1 },
      { productId: 12, colorName: "White", sizeName: "M", qty: 1 },
    ]),
    mkOrder(4, null, "Guest Customer", "delivered", 35, [
      { productId: 3, colorName: "Navy", sizeName: "M", qty: 2 },
    ]),
    mkOrder(5, 3, "Jonas Ferreira", "paid", 2, [
      { productId: 10, colorName: "Olive", sizeName: "M", qty: 1 },
      { productId: 11, colorName: "Black", sizeName: "S", qty: 1 },
    ]),
    mkOrder(6, 2, "Elena Marino", "pending", 0, [
      { productId: 4, colorName: "Navy", sizeName: "M", qty: 1 },
    ])
  );

  const coupons: Coupon[] = [
    {
      id: 1,
      code: "WELCOME10",
      type: "percent",
      value: 10,
      min_order_value: "0.00",
      max_uses: 1000,
      uses: 214,
      expires_at: null,
      is_active: true,
    },
    {
      id: 2,
      code: "TRUNK15",
      type: "fixed",
      value: 15,
      min_order_value: "150.00",
      max_uses: 200,
      uses: 37,
      expires_at: new Date(Date.now() + 90 * 864e5).toISOString(),
      is_active: true,
    },
    {
      id: 3,
      code: "ARCHIVE20",
      type: "percent",
      value: 20,
      min_order_value: "200.00",
      max_uses: 100,
      uses: 100,
      expires_at: null,
      is_active: true,
    },
  ];

  const reviews: Review[] = [
    {
      id: 1,
      product: 1,
      product_name: "Essential Oversized Tee",
      user_name: "Elena M.",
      rating: 5,
      comment: "Perfect weight. Washed it six times and it hasn't changed shape once.",
      status: "approved",
      created_at: iso(20),
    },
    {
      id: 2,
      product: 5,
      product_name: "Wool Blend Overcoat",
      user_name: "Jonas F.",
      rating: 5,
      comment: "Feels like twice the price. The drape is unreal in person.",
      status: "approved",
      created_at: iso(16),
    },
    {
      id: 3,
      product: 8,
      product_name: "Silk Slip Dress",
      user_name: "Sasha K.",
      rating: 4,
      comment: "Beautiful colour and weight. Runs slightly large at the bust.",
      status: "approved",
      created_at: iso(11),
    },
    {
      id: 4,
      product: 10,
      product_name: "Cable Knit Cardigan",
      user_name: "Maya R.",
      rating: 5,
      comment: "Warm in a way wool should be. The stone colour is impossible to photograph, better in person.",
      status: "approved",
      created_at: iso(5),
    },
    {
      id: 5,
      product: 9,
      product_name: "High-Rise Cropped Jean",
      user_name: "First Time Buyer",
      rating: 3,
      comment: "Stiff as promised - sizing runs small, size up a full size.",
      status: "pending",
      created_at: iso(1),
    },
    {
      id: 6,
      product: 2,
      product_name: "Relaxed Linen Shirt",
      user_name: "Anonymous",
      rating: 2,
      comment: "Collar is floppier than the photos suggest.",
      status: "pending",
      created_at: iso(0.5),
    },
  ];

  const collections: Collection[] = [
    {
      id: 1,
      name: "Autumn Capsule 01",
      slug: "autumn-capsule-01",
      tagline: "Ten pieces, layered, non-seasonal.",
      description:
        "Our first capsule: a considered edit of overcoats, knits and tailored shapes chosen to work on their own and together. Built around the wardrobes that don't change with the weather.",
      hero_image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=80",
      product_ids: [5, 3, 10, 6, 8, 11, 13, 14, 15],
    },
  ];

  return {
    colors: COLORS,
    sizes: SIZES,
    categories: CATEGORIES,
    collections,
    products,
    users: [admin, ...customers],
    carts: {},
    wishes: {},
    orders,
    coupons,
    reviews,
    newsletter: ["early@list.test", "field@notes.test"],
    settings: {
      store_name: "Studio",
      currency: "USD",
      tax_rate: 0.08,
      shipping_flat_rate: "12.00",
      free_shipping_threshold: "150.00",
      low_stock_threshold: 5,
    },
    refreshTokens: [],
    seq: { order: 100, cartItem: 100, address: 100, wish: 100, coupon: 100, review: 100, product: 100, variant: 500, image: 500, user: 100 },
  };
}

export function nextId(seq: Record<string, number>, key: string): number {
  return seq[key]++;
}