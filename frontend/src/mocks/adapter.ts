// Mock API adapter. Implements the DRF contract the real backend will serve
// (same URLs, same response shapes) so the frontend is interchangeable:
// flip VITE_USE_MOCKS=off and the same axios client hits Django.
//
// Deliberately a little rough around "real" backend concerns (no password
// hashing, tokens are tagged strings) — it exists to make the UI real, not to
// be a security reference. Emails are simulated: endpoints that would send
// email return a `demo_*` token instead, which the UI surfaces as a banner.

import type { AxiosResponse } from "axios";
import { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { DBState, DBProduct, DBVariant, DBUser, DBCartItem, DBOrder } from "./db";
import { getDB, saveDB } from "./db";
import { nextId } from "./seed";
import { placeholderImage } from "@/lib/format";
import type {
  Address,
  Cart,
  CartItem,
  Category,
  Collection,
  Coupon,
  CouponValidation,
  Customer,
  DashboardStats,
  Order,
  OrderItem,
  OrderStatus,
  Paginated,
  ProductDetail,
  ProductSummary,
  Review,
  ReviewStatus,
  ShippingQuote,
  StoreSettings,
  User,
  WishlistItem,
} from "@/types/api";
import { ORDER_STATUSES } from "@/types/api";

type MockRoute = {
  method: string;
  pattern: RegExp;
  handler: (ctx: Ctx, match: RegExpMatchArray) => unknown;
};

interface Ctx {
  db: DBState;
  me: DBUser | null;
  body: Record<string, unknown>;
  query: URLSearchParams;
  headers: Record<string, string>;
}

const ACCESS_TTL_MS = 2 * 60 * 1000;const ACCESS_PREFIX = "mock-access.";
const REFRESH_PREFIX = "mock-refresh.";

// --- auth helpers ----------------------------------------------------------

function issueAccess(userId: number): string {
  const now = Date.now();
  return `${ACCESS_PREFIX}${userId}.${now}.${now + ACCESS_TTL_MS}.${Math.random().toString(36).slice(2)}`;
}

function issueRefresh(db: DBState, userId: number): string {
  const token = `${REFRESH_PREFIX}${userId}.${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  db.refreshTokens.push({ token, user_id: userId });
  saveDB();
  return token;
}

function decodeAccess(token: string): DBUser | null {
  if (!token.startsWith(ACCESS_PREFIX)) return null;
  const [, uid, , exp] = token.split(".");
  const db = getDB();
  const user = db.users.find((u) => u.id === Number(uid));
  if (!user) return null;
  if (Date.now() > Number(exp)) return null;
  return user;
}

function decodeRefresh(db: DBState, token: string): DBUser | null {
  if (!token.startsWith(REFRESH_PREFIX)) return null;
  const [, uid] = token.split(".");
  if (!db.refreshTokens.some((t) => t.token === token)) return null;
  return db.users.find((u) => u.id === Number(uid)) ?? null;
}

// --- response helpers ------------------------------------------------------

function ok(status: number, data: unknown): AxiosResponse {
  return {
    status,
    statusText: String(status),
    data,
    headers: { "content-type": "application/json" },
    config: {} as InternalAxiosRequestConfig,
  };
}

function fail(status: number, data: unknown): never {
  const err = new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_REQUEST,
    {} as InternalAxiosRequestConfig,
    undefined,
    ok(status, data) as never
  );
  throw err;
}

function errField(field: string, message: string): Record<string, string[]> {
  return { [field]: [message] };
}

// --- catalog helpers -------------------------------------------------------

const centsToStr = (c: number): string => (c / 100).toFixed(2);

function effectiveCents(p: DBProduct, v: DBVariant): number {
  return v.price_override_cents ?? p.sale_price_cents ?? p.base_price_cents;
}

function unitsSold(db: DBState, productId: number): number {
  return db.orders
    .filter((o) => !["pending", "cancelled", "refunded"].includes(o.status))
    .flatMap((o) => o.items.filter((i) => i.product_name))
    .filter((i) => i.product_name && db.products.find((p) => p.id === productId)?.name === i.product_name)
    .reduce((s, i) => s + i.quantity, 0);
}

const NEW_WINDOW_DAYS = 30;

function isNew(p: DBProduct): boolean {
  return p.is_new || Date.now() - new Date(p.created_at).getTime() < NEW_WINDOW_DAYS * 864e5;
}

function productSummary(db: DBState, p: DBProduct): ProductSummary {
  const sale = p.sale_price_cents !== null;
  const selling = unitsSold(db, p.id) > 0;
  const badges: ProductSummary["badges"] = [];
  if (isNew(p)) badges.push("NEW");
  if (sale) badges.push("SALE");
  if (selling) badges.push("BESTSELLER");
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    tagline: p.tagline,
    base_price: centsToStr(p.base_price_cents),
    sale_price: p.sale_price_cents !== null ? centsToStr(p.sale_price_cents) : null,
    price_effective: centsToStr(p.sale_price_cents ?? p.base_price_cents),
    category: p.category_id,
    category_name: db.categories.find((c) => c.id === p.category_id)?.name ?? "",
    category_slug: db.categories.find((c) => c.id === p.category_id)?.slug ?? "",
    is_featured: p.is_featured,
    is_new: isNew(p),
    images: [...p.images].sort((a, b) => a.position - b.position),
    colors: db.colors.filter((c) => p.colors.includes(c.id)),
    sizes: db.sizes.filter((s) => p.variants.some((v) => v.size_id === s.id)),
    min_price: centsToStr(Math.min(...p.variants.map((v) => effectiveCents(p, v)))),
    badges,
  };
}

function variantSummary(db: DBState, p: DBProduct, v: DBVariant) {
  return {
    id: v.id,
    sku: v.sku,
    price: v.price_override_cents !== null ? centsToStr(v.price_override_cents) : null,
    price_effective: centsToStr(effectiveCents(p, v)),
    stock: v.stock,
    color: db.colors.find((c) => c.id === v.color_id)!,
    size: db.sizes.find((s) => s.id === v.size_id)!,
  };
}

function productDetail(db: DBState, p: DBProduct): ProductDetail {
  const approved = db.reviews.filter((r) => r.product === p.id && r.status === "approved");
  return {
    ...productSummary(db, p),
    description: p.description,
    care: p.care,
    fit: p.fit,
    variants: p.variants.map((v) => variantSummary(db, p, v)),
    collection_ids: db.collections.filter((c) => c.product_ids.includes(p.id)).map((c) => c.id),
    average_rating: approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : null,
    review_count: approved.length,
    reviews: approved.sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

function productBySlug(db: DBState, slug: string): DBProduct | null {
  return db.products.find((p) => p.slug === slug) ?? null;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// --- cart helpers ----------------------------------------------------------

function ownerKey(me: DBUser | null, headers?: Record<string, string>): string | number {
  if (me) return me.id;
  const h = headers ?? {};
  const guestHeader = h["x-guest-session-id"] || h["X-Guest-Session-ID"];
  return guestHeader ? `guest:${guestHeader}` : "guest";
}

function joinCartItem(db: DBState, raw: DBCartItem): CartItem | null {
  const v = db.products.flatMap((p) => p.variants.map((vv) => ({ vv, p }))).find((x) => x.vv.id === raw.variant_id);
  if (!v) return null;
  return {
    id: raw.id,
    variant: variantSummary(db, v.p, v.vv),
    product_name: v.p.name,
    product_slug: v.p.slug,
    image: v.p.images.find((im) => im.color === v.vv.color_id)?.image ?? v.p.images[0]?.image ?? null,
    unit_price: centsToStr(effectiveCents(v.p, v.vv)),
    quantity: Math.min(raw.quantity, v.vv.stock),
    available_stock: v.vv.stock,
  };
}

function getCart(db: DBState, me: DBUser | null, headers?: Record<string, string>): Cart {
  const key = String(ownerKey(me, headers));
  const raw = db.carts[key] ?? [];
  const items = raw.map((r) => joinCartItem(db, r)).filter((i): i is CartItem => i !== null);
  db.carts[key] = raw.filter((r) => items.some((i) => i.id === r.id));
  saveDB();
  const subtotal = items.reduce((s, i) => s + Math.round(parseFloat(i.unit_price) * 100) * i.quantity, 0);
  return {
    item_count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: centsToStr(subtotal),
    items,
  };
}

function orderForUser(db: DBState, userId: number): Order[] {
  return db.orders
    .filter((o) => o.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(orderShape);
}

function orderShape(o: DBOrder): Order {
  return {
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    items: o.items,
    subtotal: o.subtotal,
    shipping: o.shipping,
    discount: o.discount,
    tax: o.tax,
    total: o.total,
    coupon_code: o.coupon_code,
    shipping_address: o.shipping_address,
    billing_address: o.billing_address,
    billing_same_as_shipping: o.billing_same_as_shipping,
    shipping_method: o.shipping_method,
    payment_method: o.payment_method,
    tracking_number: o.tracking_number,
    carrier: o.carrier,
    timeline: o.timeline,
    created_at: o.created_at,
    customer_email: o.customer_email,
    customer_name: o.customer_name,
  };
}

function validateCoupon(db: DBState, code: string | null, subtotalCents: number): CouponValidation | null {
  if (!code) return null;
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === code.toUpperCase());
  if (!coupon) return { valid: false, code, type: "percent", value: 0, discount: "0.00", error: "Code not recognized." };
  if (!coupon.is_active) return { valid: false, code, type: "percent", value: 0, discount: "0.00", error: "This code is no longer active." };
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now())
    return { valid: false, code, type: "percent", value: 0, discount: "0.00", error: "This code has expired." };
  if (coupon.max_uses !== null && coupon.uses >= coupon.max_uses)
    return { valid: false, code, type: "percent", value: 0, discount: "0.00", error: "This code has reached its usage limit." };
  const minCents = Math.round(parseFloat(coupon.min_order_value) * 100);
  if (subtotalCents < minCents)
    return {
      valid: false,
      code,
      type: coupon.type,
      value: coupon.value,
      discount: "0.00",
      error: `Minimum order of ${centsToStr(minCents)} required.`,
    };
  const discountCents =
    coupon.type === "percent" ? Math.round((subtotalCents * coupon.value) / 100) : Math.min(Math.round(coupon.value * 100), subtotalCents);
  return { valid: true, code: coupon.code, type: coupon.type, value: coupon.value, discount: centsToStr(discountCents), error: null };
}

// --- shipping --------------------------------------------------------------

function shippingMethods(db: DBState): ShippingQuote {
  const flat = Math.round(parseFloat(db.settings.shipping_flat_rate) * 100);
  return {
    free_shipping_threshold: db.settings.free_shipping_threshold,
    tax_rate: db.settings.tax_rate,
    currency: db.settings.currency,
    methods: [
      { id: "standard", label: "Standard", price: centsToStr(flat), eta: "3–5 business days" },
      { id: "express", label: "Express", price: centsToStr(flat * 2), eta: "1–2 business days" },
    ],
  };
}

function shippingCost(db: DBState, method: string, subtotalCents: number): number {
  const free = db.settings.free_shipping_threshold ? Math.round(parseFloat(db.settings.free_shipping_threshold) * 100) : null;
  if (free !== null && subtotalCents >= free && method === "standard") return 0;
  const flat = Math.round(parseFloat(db.settings.shipping_flat_rate) * 100);
  return method === "express" ? flat * 2 : flat;
}

// --- products query --------------------------------------------------------

function categoryWithDescendants(db: DBState, slug: string): number[] {
  const cat = db.categories.find((c) => c.slug === slug);
  if (!cat) return [];
  return [cat.id, ...db.categories.filter((c) => c.parent === cat.id).map((c) => c.id)];
}

function queryProducts(db: DBState, q: URLSearchParams): Paginated<ProductSummary> {
  let list = [...db.products];
  const idsParam = q.get("ids");
  if (idsParam) {
    const ids = idsParam.split(",").map(Number);
    list = list.filter((p) => ids.includes(p.id));
  }
  const catSlug = q.get("category");
  if (catSlug) {
    const ids = categoryWithDescendants(db, catSlug);
    list = list.filter((p) => ids.includes(p.category_id));
  }
  const collSlug = q.get("collection");
  if (collSlug) {
    const coll = db.collections.find((c) => c.slug === collSlug);
    if (coll) list = list.filter((p) => coll.product_ids.includes(p.id));
  }
  const color = q.get("color");
  if (color) {
    const ids = color.split(",").map(Number);
    list = list.filter((p) => p.variants.some((v) => ids.includes(v.color_id)));
  }
  const size = q.get("size");
  if (size) {
    const ids = size.split(",").map(Number);
    list = list.filter((p) => p.variants.some((v) => ids.includes(v.size_id)));
  }
  const minP = q.get("min_price");
  const maxP = q.get("max_price");
  if (minP || maxP) {
    list = list.filter((p) => {
      const cents = Math.min(...p.variants.map((v) => effectiveCents(p, v)));
      if (minP && cents < Math.round(parseFloat(minP) * 100)) return false;
      if (maxP && cents > Math.round(parseFloat(maxP) * 100)) return false;
      return true;
    });
  }
  const text = q.get("q");
  if (text) {
    const needle = text.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.tagline.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle)
    );
  }
  if (q.get("new")) list = list.filter((p) => isNew(p));
  if (q.get("featured")) list = list.filter((p) => p.is_featured);

  const sort = q.get("sort") ?? "featured";
  switch (sort) {
    case "newest":
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
      break;
    case "price-asc":
      list.sort(
        (a, b) => Math.min(...a.variants.map((v) => effectiveCents(a, v))) - Math.min(...b.variants.map((v) => effectiveCents(b, v)))
      );
      break;
    case "price-desc":
      list.sort(
        (a, b) => Math.min(...b.variants.map((v) => effectiveCents(b, v))) - Math.min(...a.variants.map((v) => effectiveCents(a, v)))
      );
      break;
    case "bestselling":
      list.sort((a, b) => unitsSold(db, b.id) - unitsSold(db, a.id));
      break;
    default:
      list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || b.id - a.id);
  }

  const page = Math.max(1, Number(q.get("page")) || 1);
  const pageSize = 24;
  const results = list.slice((page - 1) * pageSize, page * pageSize).map((p) => productSummary(db, p));
  return { count: list.length, next: page * pageSize < list.length ? `page=${page + 1}` : null, previous: page > 1 ? `page=${page - 1}` : null, results };
}

// --- orders creation -------------------------------------------------------

function buildOrder(
  db: DBState,
  me: DBUser | null,
  body: {
    customer_email?: string;
    customer_name?: string;
    shipping_address: Order["shipping_address"];
    billing_address: Order["billing_address"];
    billing_same_as_shipping: boolean;
    shipping_method: string;
    coupon_code: string | null;
    payment: { provider: string; method: string; last4?: string };
  },
  headers?: Record<string, string>
): Order {
  const owner = String(ownerKey(me, headers));
  const raw = db.carts[owner] ?? [];
  const items = raw.map((r) => joinCartItem(db, r)).filter((i): i is CartItem => i !== null);
  if (!items.length) fail(400, { detail: "Cart is empty." });

  const subtotalC = items.reduce((s, i) => s + Math.round(parseFloat(i.unit_price) * 100) * i.quantity, 0);
  const coupon = validateCoupon(db, body.coupon_code, subtotalC);
  if (body.coupon_code && (!coupon || !coupon.valid)) {
    fail(400, { coupon: [coupon?.error ?? "Invalid coupon."] });
  }
  const discountC = coupon && coupon.valid ? Math.round(parseFloat(coupon.discount) * 100) : 0;
  const shippingC = shippingCost(db, body.shipping_method, subtotalC - discountC);
  const taxC = Math.round((subtotalC - discountC + shippingC) * db.settings.tax_rate);
  const totalC = Math.max(0, subtotalC - discountC) + shippingC + taxC;

  const last4 = body.payment.last4 ?? "4242";
  const orderNumber = `ST-${1000 + db.seq.order * 17}`;
  db.seq.order++;
  const orderEmail = body.customer_email || me?.email || body.shipping_address.recipient || "";
  const orderName = body.customer_name || (me ? `${me.first_name} ${me.last_name}`.trim() : body.shipping_address.recipient) || "";
  const order: DBOrder = {
    id: db.seq.order,
    order_number: orderNumber,
    status: "paid",
    items: items.map(
      (i, idx): OrderItem => ({
        id: idx + 1,
        product_name: i.product_name,
        sku: i.variant.sku,
        color_name: i.variant.color.name,
        size_name: i.variant.size.name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        image: i.image,
      })
    ),
    subtotal: centsToStr(subtotalC),
    shipping: centsToStr(shippingC),
    discount: centsToStr(discountC),
    tax: centsToStr(taxC),
    total: centsToStr(totalC),
    coupon_code: coupon && coupon.valid ? coupon.code : null,
    shipping_address: body.shipping_address,
    billing_address: body.billing_same_as_shipping ? body.shipping_address : body.billing_address,
    billing_same_as_shipping: body.billing_same_as_shipping,
    shipping_method: body.shipping_method,
    payment_method: `${body.payment.provider} ${body.payment.method} •••• ${last4}`,
    tracking_number: null,
    carrier: null,
    timeline: [
      { status: "pending", at: new Date().toISOString(), note: null },
      { status: "paid", at: new Date().toISOString(), note: "Payment confirmed" },
    ],
    created_at: new Date().toISOString(),
    customer_email: orderEmail,
    customer_name: orderName,
    user_id: me?.id ?? null,
  };

  // deduct stock
  for (const item of items) {
    const v = db.products.flatMap((p) => p.variants).find((vv) => vv.id === item.variant.id);
    if (v) v.stock = Math.max(0, v.stock - item.quantity);
  }
  if (coupon && coupon.valid) {
    const c = db.coupons.find((c) => c.code === coupon.code);
    if (c) c.uses++;
  }
  db.orders.push(order);
  db.carts[owner] = [];
  saveDB();
  return orderShape(order);
}

// --- admin -----------------------------------------------------------------

function dashboardStats(db: DBState): DashboardStats {
  const revenueStatuses: OrderStatus[] = ["paid", "processing", "shipped", "delivered"];
  const counted = db.orders.filter((o) => revenueStatuses.includes(o.status));
  const revenueTotal = counted.reduce((s, o) => s + Math.round(parseFloat(o.total) * 100), 0);
  const since30 = Date.now() - 30 * 864e5;
  const recent = db.orders.filter((o) => new Date(o.created_at).getTime() >= since30);
  const recentRevenue = recent.reduce((s, o) => s + (revenueStatuses.includes(o.status) ? Math.round(parseFloat(o.total) * 100) : 0), 0);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((st) => [st, db.orders.filter((o) => o.status === st).length])) as Record<
    OrderStatus,
    number
  >;
  const top: Record<string, { units: number; revenue: number }> = {};
  for (const o of counted) {
    for (const it of o.items) {
      const key = it.product_name;
      top[key] = top[key] ?? { units: 0, revenue: 0 };
      top[key].units += it.quantity;
      top[key].revenue += Math.round(parseFloat(it.unit_price) * 100) * it.quantity;
    }
  }
  const threshold = db.settings.low_stock_threshold;
  const lowStock = db.products.flatMap((p) =>
    p.variants
      .filter((v) => v.stock <= threshold)
      .map((v) => ({
        sku: v.sku,
        product_name: p.name,
        color_name: db.colors.find((c) => c.id === v.color_id)?.name ?? "",
        size_name: db.sizes.find((s) => s.id === v.size_id)?.name ?? "",
        stock: v.stock,
        threshold,
      }))
  );
  return {
    revenue_total: centsToStr(revenueTotal),
    revenue_30d: centsToStr(recentRevenue),
    orders_30d: recent.length,
    orders_by_status: byStatus,
    top_products: Object.entries(top)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([name, v]) => ({ name, units: v.units, revenue: centsToStr(v.revenue) })),
    low_stock: lowStock.sort((a, b) => a.stock - b.stock),
    recent_orders: [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6).map(orderShape),
    customer_count: db.users.filter((u) => !u.is_staff).length,
  };
}

// --- route registry --------------------------------------------------------

const routes: MockRoute[] = [
  // Health
  {
    method: "get",
    pattern: /^\/health\/?$/,
    handler: ({ db }) => ok(200, { status: "ok", service: db.settings.store_name }),
  },

  // --- auth ---
  {
    method: "post",
    pattern: /^\/auth\/register\/?$/,
    handler: ({ db, body }) => {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) fail(400, errField("email", "Email and password are required."));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, errField("email", "Enter a valid email address."));
      if (password.length < 8) fail(400, errField("password", "At least 8 characters."));
      if (db.users.some((u) => u.email === email)) fail(400, errField("email", "An account with this email already exists."));
      const user: DBUser = {
        id: nextId(db.seq, "user"),
        email,
        password,
        first_name: String(body.first_name ?? ""),
        last_name: String(body.last_name ?? ""),
        role: "customer",
        is_staff: false,
        email_verified: false,
        created_at: new Date().toISOString(),
        addresses: [],
      };
      db.users.push(user);
      saveDB();
      const access = issueAccess(user.id);
      const refresh = issueRefresh(db, user.id);
      const demoToken = `mverify.${user.id}.${Math.random().toString(36).slice(2)}`;
      return ok(201, { access, refresh, demo_verification_token: demoToken, user: publicUser(db, user) });
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/token\/?$/,
    handler: ({ db, body }) => {
      const email = String(body.email ?? "").toLowerCase();
      const user = db.users.find((u) => u.email === email && u.password === String(body.password ?? ""));
      if (!user) fail(401, { detail: "No active account found with the given credentials." });
      return ok(200, { access: issueAccess(user.id), refresh: issueRefresh(db, user.id) });
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/token\/refresh\/?$/,
    handler: ({ db, body }) => {
      const user = decodeRefresh(db, String(body.refresh ?? ""));
      if (!user) fail(401, { code: "token_not_valid", detail: "Refresh token is invalid or expired." });
      return ok(200, { access: issueAccess(user.id) });
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/logout\/?$/,
    handler: ({ db, body }) => {
      db.refreshTokens = db.refreshTokens.filter((t) => t.token !== body.refresh);
      saveDB();
      return ok(204, null);
    },
  },
  {
    method: "get",
    pattern: /^\/auth\/me\/?$/,
    handler: ({ db, me }) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      return ok(200, publicUser(db, me));
    },
  },
  {
    method: "patch",
    pattern: /^\/auth\/profile\/?$/,
    handler: ({ db, me, body }) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      const first = String(body.first_name ?? me.first_name);
      const last = String(body.last_name ?? me.last_name);
      const email = String(body.email ?? me.email);
      const exists = db.users.some((u) => u.email === email && u.id !== me.id);
      const changedEmail = email !== me.email;
      if (changedEmail) {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(400, errField("email", "Enter a valid email address."));
        if (exists) fail(400, errField("email", "An account with this email already exists."));
      }
      me.first_name = first;
      me.last_name = last;
      if (changedEmail) {
        me.email = email;
        me.email_verified = false;
      }
      saveDB();
      return ok(200, publicUser(db, me));
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/password\/change\/?$/,
    handler: ({ me, body }) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      if (me.password !== String(body.current_password ?? "")) {
        fail(400, errField("current_password", "Current password is incorrect."));
      }
      if (String(body.new_password ?? "").length < 8) fail(400, errField("new_password", "At least 8 characters."));
      me.password = String(body.new_password);
      saveDB();
      return ok(204, null);
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/password\/reset\/?$/,
    handler: ({ db, body }) => {
      const email = String(body.email ?? "").toLowerCase();
      const user = db.users.find((u) => u.email === email);
      if (!user) return ok(200, { detail: "If an account with that email exists, a reset link has been sent." });
      const demoToken = `mreset.${user.id}.${Math.random().toString(36).slice(2)}`;
      return ok(200, {
        detail: "Password reset email sent.",
        demo_reset_token: demoToken,
        demo_email: email,
      });
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/password\/reset\/confirm\/?$/,
    handler: ({ db, body }) => {
      const token = String(body.token ?? "");
      if (!token.startsWith("mreset.")) fail(400, errField("token", "Invalid token."));
      const [, uid] = token.split(".");
      const user = db.users.find((u) => u.id === Number(uid));
      if (!user) fail(400, errField("token", "Invalid token."));
      if (String(body.new_password ?? "").length < 8) fail(400, errField("new_password", "At least 8 characters."));
      user.password = String(body.new_password);
      saveDB();
      return ok(204, null);
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/email\/verify\/?$/,
    handler: ({ db, body }) => {
      const token = String(body.token ?? "");
      if (!token.startsWith("mverify.")) fail(400, errField("token", "Invalid verification token."));
      const [, uid] = token.split(".");
      const user = db.users.find((u) => u.id === Number(uid));
      if (!user) fail(400, errField("token", "Invalid verification token."));
      user.email_verified = true;
      saveDB();
      return ok(204, null);
    },
  },
  {
    method: "post",
    pattern: /^\/auth\/email\/resend\/?$/,
    handler: ({ db, body }) => {
      const email = String(body.email ?? "").toLowerCase();
      const user = db.users.find((u) => u.email === email);
      if (!user) return ok(200, { detail: "If an account with that email exists, a verification email has been sent." });
      if (user.email_verified) return ok(200, { detail: "Email already verified." });
      const demoToken = `mverify.${user.id}.${Math.random().toString(36).slice(2)}`;
      return ok(200, { demo_verification_token: demoToken, demo_email: email });
    },
  },

  // --- addresses ---
  {
    method: "get",
    pattern: /^\/addresses\/?$/,
    handler: ({ me }) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      return ok(200, [...me.addresses].sort((a, b) => Number(b.is_default) - Number(a.is_default)));
    },
  },
  {
    method: "post",
    pattern: /^\/addresses\/?$/,
    handler: ({ db, me, body }) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      const addr: Address = {
        id: nextId(db.seq, "address"),
        label: String(body.label || "Home"),
        recipient: String(body.recipient || ""),
        line1: String(body.line1 || ""),
        line2: String(body.line2 || ""),
        city: String(body.city || ""),
        state: String(body.state || ""),
        postal_code: String(body.postal_code || ""),
        country: String(body.country || "US"),
        phone: String(body.phone || ""),
        is_default: Boolean(body.is_default) || me.addresses.length === 0,
      };
      if (addr.is_default) me.addresses.forEach((a) => (a.is_default = false));
      me.addresses.push(addr);
      saveDB();
      return ok(201, addr);
    },
  },
  {
    method: "patch",
    pattern: /^\/addresses\/(\d+)\/?$/,
    handler: ({ me, body }, m) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      const addr = me.addresses.find((a) => a.id === Number(m[1]));
      if (!addr) fail(404, { detail: "Not found." });
      Object.assign(addr, body);
      if (body.is_default) me.addresses.forEach((a) => (a.is_default = a.id === addr.id));
      saveDB();
      return ok(200, addr);
    },
  },
  {
    method: "delete",
    pattern: /^\/addresses\/(\d+)\/?$/,
    handler: ({ me }, m) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      me.addresses = me.addresses.filter((a) => a.id !== Number(m[1]));
      saveDB();
      return ok(204, null);
    },
  },

  // --- catalog ---
  {
    method: "get",
    pattern: /^\/lookups\/colors\/?$/,
    handler: ({ db }) => ok(200, db.colors),
  },
  {
    method: "get",
    pattern: /^\/lookups\/sizes\/?$/,
    handler: ({ db }) => ok(200, db.sizes),
  },
  {
    method: "get",
    pattern: /^\/categories\/?$/,
    handler: ({ db }) => {
      const byParent = (parent: number | null): Category[] =>
        db.categories
          .filter((c) => c.parent === parent)
          .map((c) => ({ ...c, children: byParent(c.id) }));
      return ok(200, byParent(null));
    },
  },
  {
    method: "get",
    pattern: /^\/collections\/?$/,
    handler: ({ db }) =>
      ok(
        200,
        db.collections.map((c) => ({ ...c, product_count: c.product_ids.length }))
      ),
  },
  {
    method: "get",
    pattern: /^\/collections\/([a-z0-9-]+)\/?$/,
    handler: ({ db }, m) => {
      const coll = db.collections.find((c) => c.slug === m[1]);
      if (!coll) fail(404, { detail: "Not found." });
      return ok(200, {
        ...coll,
        products: coll.product_ids
          .map((id) => db.products.find((p) => p.id === id))
          .filter((p): p is DBProduct => Boolean(p))
          .map((p) => productSummary(db, p)),
      });
    },
  },
  {
    method: "get",
    pattern: /^\/products\/?$/,
    handler: ({ db, query }) => ok(200, queryProducts(db, query)),
  },
  {
    method: "get",
    pattern: /^\/products\/([a-z0-9-]+)\/?$/,
    handler: ({ db }, m) => {
      const p = productBySlug(db, m[1]);
      if (!p) fail(404, { detail: "Not found." });
      return ok(200, productDetail(db, p));
    },
  },
  {
    method: "post",
    pattern: /^\/products\/([a-z0-9-]+)\/reviews\/?$/,
    handler: ({ db, me, body }, m) => {
      const p = productBySlug(db, m[1]);
      if (!p) fail(404, { detail: "Not found." });
      const rating = Number(body.rating);
      if (!rating || rating < 1 || rating > 5) fail(400, errField("rating", "Rating must be 1–5."));
      if (!String(body.comment ?? "").trim()) fail(400, errField("comment", "Comment is required."));
      const review: Review = {
        id: nextId(db.seq, "review"),
        product: p.id,
        product_name: p.name,
        user_name: me ? `${me.first_name} ${me.last_name}`.trim() || me.email : "Guest",
        rating,
        comment: String(body.comment),
        status: "pending",
        created_at: new Date().toISOString(),
      };
      db.reviews.push(review);
      saveDB();
      return ok(201, review);
    },
  },

  // --- cart ---
  {
    method: "get",
    pattern: /^\/cart\/?$/,
    handler: ({ db, me, headers }) => ok(200, getCart(db, me, headers)),
  },
  {
    method: "post",
    pattern: /^\/cart\/items\/?$/,
    handler: ({ db, me, body, headers }) => {
      const v = db.products.flatMap((p) => p.variants).find((vv) => vv.id === Number(body.variant_id));
      if (!v) fail(400, errField("variant_id", "Variant not found."));
      if (v.stock <= 0) fail(400, errField("variant_id", "This size is out of stock."));
      const key = String(ownerKey(me, headers));
      const cart = db.carts[key] ?? [];
      const existing = cart.find((i) => i.variant_id === v.id);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + Number(body.quantity ?? 1), v.stock);
      } else {
        cart.push({ id: nextId(db.seq, "cartItem"), variant_id: v.id, quantity: Math.min(Number(body.quantity ?? 1), v.stock) });
      }
      db.carts[key] = cart;
      saveDB();
      return ok(201, getCart(db, me, headers));
    },
  },
  {
    method: "patch",
    pattern: /^\/cart\/items\/(\d+)\/?$/,
    handler: ({ db, me, body, headers }, m) => {
      const key = String(ownerKey(me, headers));
      const raw = db.carts[key] ?? [];
      const item = raw.find((i) => i.id === Number(m[1]));
      if (!item) fail(404, { detail: "Not found." });
      const v = db.products.flatMap((p) => p.variants).find((vv) => vv.id === item.variant_id)!;
      let qty = Number(body.quantity ?? 1);
      if (qty < 1) {
        db.carts[key] = raw.filter((i) => i.id !== item.id);
      } else {
        qty = Math.min(qty, v.stock);
        item.quantity = qty;
      }
      db.carts[key] = db.carts[key] ?? raw;
      saveDB();
      return ok(200, { cart: getCart(db, me, headers), item: joinCartItem(db, item) });
    },
  },
  {
    method: "delete",
    pattern: /^\/cart\/items\/(\d+)\/?$/,
    handler: ({ db, me, headers }, m) => {
      const key = String(ownerKey(me, headers));
      db.carts[key] = (db.carts[key] ?? []).filter((i) => i.id !== Number(m[1]));
      saveDB();
      return ok(200, getCart(db, me, headers));
    },
  },
  {
    method: "post",
    pattern: /^\/cart\/merge\/?$/,
    handler: ({ db, me, headers }) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      const guestKey = String(ownerKey(null, headers));
      const guest = db.carts[guestKey] ?? db.carts["guest"] ?? [];
      const mine = db.carts[String(me.id)] ?? [];
      for (const g of guest) {
        const existing = mine.find((i) => i.variant_id === g.variant_id);
        if (existing) {
          existing.quantity = Math.min(existing.quantity + g.quantity, 99);
        } else {
          mine.push(g);
        }
      }
      db.carts[String(me.id)] = mine;
      delete db.carts[guestKey];
      delete db.carts["guest"];
      saveDB();
      return ok(200, getCart(db, me, headers));
    },
  },

  // --- wishlist ---
  {
    method: "get",
    pattern: /^\/wishlist\/?$/,
    handler: ({ db, me, headers }) => {
      const key = String(ownerKey(me, headers));
      const ids = db.wishes[key] ?? [];
      const items: WishlistItem[] = ids
        .map<WishlistItem | null>((pid, idx) => {
          const p = db.products.find((pp) => pp.id === pid);
          if (!p) return null;
          return { id: idx + 1, product: productSummary(db, p), variant_id: null, created_at: new Date().toISOString() };
        })
        .filter((i): i is WishlistItem => i !== null);
      return ok(200, items);
    },
  },
  {
    method: "post",
    pattern: /^\/wishlist\/?$/,
    handler: ({ db, me, body, headers }) => {
      const pid = Number(body.product_id);
      const p = db.products.find((pp) => pp.id === pid);
      if (!p) fail(404, { detail: "Not found." });
      const key = String(ownerKey(me, headers));
      const ids = db.wishes[key] ?? [];
      if (!ids.includes(pid)) ids.push(pid);
      db.wishes[key] = ids;
      saveDB();
      return ok(201, { product_id: pid });
    },
  },
  {
    method: "delete",
    pattern: /^\/wishlist\/(\d+)\/?$/,
    handler: ({ db, me, headers }, m) => {
      const key = String(ownerKey(me, headers));
      db.wishes[key] = (db.wishes[key] ?? []).filter((pid) => pid !== Number(m[1]));
      saveDB();
      return ok(204, null);
    },
  },

  // --- checkout ---
  {
    method: "get",
    pattern: /^\/checkout\/shipping-quote\/?$/,
    handler: ({ db }) => ok(200, shippingMethods(db)),
  },
  {
    method: "post",
    pattern: /^\/checkout\/validate\/?$/,
    handler: ({ db, me, body, headers }) => {
      const cart = getCart(db, me, headers);
      const errors: { sku: string; message: string }[] = [];
      for (const item of cart.items) {
        if (item.quantity > item.available_stock) {
          errors.push({ sku: item.variant.sku, message: `Only ${item.available_stock} available.` });
        }
      }
      const couponCode = (body.coupon_code as string | null) ?? null;
      const subtotalC = Math.round(parseFloat(cart.subtotal) * 100);
      return ok(200, { ok: errors.length === 0, errors, coupon: couponCode ? validateCoupon(db, couponCode, subtotalC) : null });
    },
  },
  {
    method: "post",
    pattern: /^\/checkout\/coupon\/?$/,
    handler: ({ db, me, body, headers }) => {
      const cart = getCart(db, me, headers);
      const subtotalC = Math.round(parseFloat(cart.subtotal) * 100);
      return ok(200, validateCoupon(db, String(body.code ?? ""), subtotalC));
    },
  },
  {
    method: "post",
    pattern: /^\/checkout\/place-order\/?$/,
    handler: ({ db, me, body, headers }) => {
      const card = String((body.payment as { last4?: string } | undefined)?.last4 ?? "");
      if (String((body.payment as { number?: string } | undefined)?.number ?? "").replace(/\s/g, "") === "4242424242424444") {
        fail(402, { detail: "Your card was declined. Try 4242 4242 4242 4242." });
      }
      if ([2, 3, 4, 5, 6, 7, 8, 9, 0].includes(Number(card.slice(-1)))) {
        // last digit rules are a coin flip — keeps the 402 path live in demos
        if (card.length === 4 && Number(card.slice(-1)) % 5 === 0) fail(402, { detail: "Your card was declined." });
      }
      const order = buildOrder(
        db,
        me,
        body as Parameters<typeof buildOrder>[2],
        headers
      );
      return ok(201, order);
    },
  },

  // --- orders (customer) ---
  {
    method: "get",
    pattern: /^\/orders\/?$/,
    handler: ({ db, me }) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      return ok(200, orderForUser(db, me.id));
    },
  },
  {
    method: "get",
    pattern: /^\/orders\/(ST-\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      const o = db.orders.find((o) => o.order_number === m[1] && o.user_id === me.id);
      if (!o) fail(404, { detail: "Not found." });
      return ok(200, orderShape(o));
    },
  },
  {
    method: "post",
    pattern: /^\/orders\/(ST-\d+)\/cancel\/?$/,
    handler: ({ db, me }, m) => {
      if (!me) fail(401, { detail: "Authentication credentials were not provided." });
      const o = db.orders.find((o) => o.order_number === m[1] && o.user_id === me.id);
      if (!o) fail(404, { detail: "Not found." });
      if (o.status !== "pending" && o.status !== "paid") fail(400, { detail: "Only pending or paid orders can be cancelled." });
      o.status = "cancelled";
      o.timeline.push({ status: "cancelled", at: new Date().toISOString(), note: "Cancelled by customer" });
      saveDB();
      return ok(200, orderShape(o));
    },
  },

  // --- newsletter ---
  {
    method: "post",
    pattern: /^\/newsletter\/?$/,
    handler: ({ db, body }) => {
      const email = String(body.email ?? "").toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return ok(400, { ok: false, message: "Enter a valid email address." });
      if (!db.newsletter.includes(email)) db.newsletter.push(email);
      saveDB();
      return ok(200, { ok: true, message: "Welcome to the list. Consider this your confirmation email." });
    },
  },

  // --- admin: stats, orders, customers ---
  {
    method: "get",
    pattern: /^\/admin\/stats\/?$/,
    handler: ({ me }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      return ok(200, dashboardStats(getDB()));
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/orders\/?$/,
    handler: ({ db, me, query }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const status = query.get("status");
      let list = [...db.orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (status) list = list.filter((o) => o.status === status);
      return ok(200, list.map(orderShape));
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/orders\/(ST-\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const o = db.orders.find((o) => o.order_number === m[1]);
      if (!o) fail(404, { detail: "Not found." });
      return ok(200, orderShape(o));
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/orders\/(ST-\d+)\/?$/,
    handler: ({ db, me, body }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const o = db.orders.find((o) => o.order_number === m[1]);
      if (!o) fail(404, { detail: "Not found." });
      const newStatus = body.status as OrderStatus | undefined;
      if (newStatus && newStatus !== o.status) {
        o.status = newStatus;
        o.timeline.push({ status: newStatus, at: new Date().toISOString(), note: body.note ? String(body.note) : null });
      }
      if (typeof body.tracking_number === "string") {
        o.tracking_number = body.tracking_number || null;
        o.carrier = body.carrier ? String(body.carrier) : o.carrier;
      }
      saveDB();
      return ok(200, orderShape(o));
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/customers\/?$/,
    handler: ({ db, me }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const customers: Customer[] = db.users
        .filter((u) => !u.is_staff)
        .map((u) => {
          const orders = db.orders.filter((o) => o.user_id === u.id && !["cancelled", "refunded", "pending"].includes(o.status));
          const spent = orders.reduce((s, o) => s + Math.round(parseFloat(o.total) * 100), 0);
          return {
            ...publicUser(db, u),
            order_count: db.orders.filter((o) => o.user_id === u.id).length,
            total_spent: centsToStr(spent),
          };
        });
      return ok(200, customers);
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/customers\/(\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const u = db.users.find((x) => x.id === Number(m[1]) && !x.is_staff);
      if (!u) fail(404, { detail: "Not found." });
      return ok(200, {
        ...publicUser(db, u),
        addresses: u.addresses,
        orders: db.orders.filter((o) => o.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(orderShape),
      });
    },
  },

  // --- admin: products & inventory ---
  {
    method: "get",
    pattern: /^\/admin\/products\/?$/,
    handler: ({ db, me, query }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const q = query.get("q");
      let list = [...db.products].sort((a, b) => a.id - b.id);
      if (q) list = list.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
      return ok(200, list.map((p) => ({ ...productDetail(db, p), variants: p.variants.map((v) => variantSummary(db, p, v)) })));
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/products\/(\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const p = db.products.find((p) => p.id === Number(m[1]));
      if (!p) fail(404, { detail: "Not found." });
      return ok(200, { ...productDetail(db, p), variants: p.variants.map((v) => variantSummary(db, p, v)) });
    },
  },
  {
    method: "post",
    pattern: /^\/admin\/products\/?$/,
    handler: ({ db, me, body }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      let slug = slugify(String(body.name ?? ""));
      if (!slug) fail(400, errField("name", "Name is required."));
      let suffix = 2;
      while (db.products.some((p) => p.slug === slug)) slug = `${slugify(String(body.name))}-${suffix++}`;
      const id = nextId(db.seq, "product");
      const category_id = Number(body.category_id || 1);
      const colors = body.colors as unknown as { color_id: number; hex: string }[];
      const product: DBProduct = {
        id,
        name: String(body.name),
        slug,
        tagline: String(body.tagline ?? ""),
        description: String(body.description ?? ""),
        care: String(body.care ?? ""),
        fit: String(body.fit ?? ""),
        base_price_cents: Math.round(Math.max(0, parseFloat(String(body.base_price ?? "0"))) * 100),
        sale_price_cents: body.sale_price ? Math.round(parseFloat(String(body.sale_price)) * 100) : null,
        category_id,
        is_featured: Boolean(body.is_featured),
        is_new: Boolean(body.is_new),
        created_at: new Date().toISOString(),
        variants: (body.variants as unknown as { color_id: number; size_id: number; sku?: string; price_override_cents?: number | null; stock: number }[]).map(
          (v, i) => ({
            id: nextId(db.seq, "variant"),
            sku: String(v.sku ?? `STU-${i}`),
            color_id: v.color_id,
            size_id: v.size_id,
            price_override_cents: v.price_override_cents ?? null,
            stock: Math.max(0, Number(v.stock) || 0),
          })
        ),
        colors: (colors ?? []).map((c) => c.color_id),
        images: (colors ?? []).flatMap((c, ci) => [
          { id: nextId(db.seq, "image"), image: placeholderImage(slug, c.hex, 0), alt: `${slug} in ${c.color_id}`, color: c.color_id, position: ci * 2 },
          { id: nextId(db.seq, "image"), image: placeholderImage(slug, c.hex, 1), alt: `${slug} detail`, color: c.color_id, position: ci * 2 + 1 },
        ]),
      };
      db.products.push(product);
      saveDB();
      return ok(201, { ...productDetail(db, product), variants: product.variants.map((v) => variantSummary(db, product, v)) });
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/products\/(\d+)\/?$/,
    handler: ({ db, me, body }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const p = db.products.find((p) => p.id === Number(m[1]));
      if (!p) fail(404, { detail: "Not found." });
      if (typeof body.name === "string") p.name = body.name;
      if (typeof body.tagline === "string") p.tagline = body.tagline;
      if (typeof body.description === "string") p.description = body.description;
      if (typeof body.care === "string") p.care = body.care;
      if (typeof body.fit === "string") p.fit = body.fit;
      if (typeof body.base_price === "string") p.base_price_cents = Math.round(parseFloat(body.base_price) * 100);
      if (body.sale_price === null || typeof body.sale_price === "string") {
        p.sale_price_cents = body.sale_price === null ? null : Math.round(parseFloat(body.sale_price) * 100);
      }
      if (typeof body.category_id === "number") p.category_id = body.category_id;
      if (typeof body.is_featured === "boolean") p.is_featured = body.is_featured;
      if (typeof body.is_new === "boolean") p.is_new = body.is_new;
      if (Array.isArray(body.variants)) {
        const colors: { color_id: number; hex: string }[] =
          (body.colors as unknown as { color_id: number; hex: string }[]) ?? [];
        p.variants = (body.variants as unknown as { color_id: number; size_id: number; sku?: string; price_override_cents?: number | null; stock: number }[]).map(
          (v) =>
            p.variants.find((old) => old.sku === v.sku && old.color_id === v.color_id && old.size_id === v.size_id) ?? {
              id: nextId(db.seq, "variant"),
              sku: String(v.sku ?? "STU-??"),
              color_id: v.color_id,
              size_id: v.size_id,
              price_override_cents: null,
              stock: 0,
            }
        );
        p.variants.forEach((pv, i) => {
          const incoming = (body.variants as unknown as { sku: string; price_override_cents?: number | null; stock: number }[])[i];
          if (incoming) {
            pv.stock = Math.max(0, Number(incoming.stock) || 0);
            pv.price_override_cents = incoming.price_override_cents ?? null;
            if (incoming.sku) pv.sku = String(incoming.sku);
          }
        });
        p.colors = colors.map((c) => c.color_id);
        if (colors.length) {
          p.images = colors.flatMap((c, ci) => [
            { id: nextId(db.seq, "image"), image: placeholderImage(p.slug, c.hex, 0), alt: `${p.slug} in ${c.color_id}`, color: c.color_id, position: ci * 2 },
            { id: nextId(db.seq, "image"), image: placeholderImage(p.slug, c.hex, 1), alt: `${p.slug} detail`, color: c.color_id, position: ci * 2 + 1 },
          ]);
        }
      }
      saveDB();
      return ok(200, { ...productDetail(db, p), variants: p.variants.map((v) => variantSummary(db, p, v)) });
    },
  },
  {
    method: "delete",
    pattern: /^\/admin\/products\/(\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      db.products = db.products.filter((p) => p.id !== Number(m[1]));
      saveDB();
      return ok(204, null);
    },
  },
  {
    method: "get",
    pattern: /^\/admin\/inventory\/?$/,
    handler: ({ db, me, query }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const threshold = db.settings.low_stock_threshold;
      const only = query.get("low");
      const rows = db.products.flatMap((p) =>
        p.variants.map((v) => ({
          variant_id: v.id,
          sku: v.sku,
          product_id: p.id,
          product_name: p.name,
          color_name: db.colors.find((c) => c.id === v.color_id)?.name ?? "",
          size_name: db.sizes.find((s) => s.id === v.size_id)?.name ?? "",
          stock: v.stock,
          low: v.stock <= threshold,
          threshold,
        }))
      );
      return ok(200, only === "true" ? rows.filter((r) => r.low) : rows);
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/inventory\/(\d+)\/?$/,
    handler: ({ db, me, body }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const v = db.products.flatMap((p) => p.variants).find((vv) => vv.id === Number(m[1]));
      if (!v) fail(404, { detail: "Not found." });
      v.stock = Math.max(0, Number(body.stock) || 0);
      saveDB();
      return ok(200, { variant_id: v.id, stock: v.stock });
    },
  },

  // --- admin: collections ---
  {
    method: "get",
    pattern: /^\/admin\/collections\/?$/,
    handler: ({ db, me }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      return ok(200, db.collections);
    },
  },
  {
    method: "post",
    pattern: /^\/admin\/collections\/?$/,
    handler: ({ db, me, body }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      let slug = slugify(String(body.name ?? ""));
      if (!slug) fail(400, errField("name", "Name is required."));
      let suffix = 2;
      while (db.collections.some((c) => c.slug === slug)) slug = `${slugify(String(body.name))}-${suffix++}`;
      const coll: Collection = {
        id: nextId(db.seq, "coupon"),
        name: String(body.name),
        slug,
        tagline: String(body.tagline ?? ""),
        description: String(body.description ?? ""),
        hero_image: null,
        product_ids: (body.product_ids as number[]) ?? [],
      };
      db.collections.push(coll);
      saveDB();
      return ok(201, coll);
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/collections\/(\d+)\/?$/,
    handler: ({ db, me, body }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const coll = db.collections.find((c) => c.id === Number(m[1]));
      if (!coll) fail(404, { detail: "Not found." });
      if (typeof body.name === "string") coll.name = body.name;
      if (typeof body.tagline === "string") coll.tagline = body.tagline;
      if (typeof body.description === "string") coll.description = body.description;
      if (Array.isArray(body.product_ids)) coll.product_ids = body.product_ids as number[];
      saveDB();
      return ok(200, coll);
    },
  },
  {
    method: "delete",
    pattern: /^\/admin\/collections\/(\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      db.collections = db.collections.filter((c) => c.id !== Number(m[1]));
      saveDB();
      return ok(204, null);
    },
  },

  // --- admin: coupons ---
  {
    method: "get",
    pattern: /^\/admin\/coupons\/?$/,
    handler: ({ db, me }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      return ok(200, db.coupons);
    },
  },
  {
    method: "post",
    pattern: /^\/admin\/coupons\/?$/,
    handler: ({ db, me, body }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const code = String(body.code ?? "").toUpperCase().replace(/\s/g, "");
      if (!code) fail(400, errField("code", "Code is required."));
      if (db.coupons.some((c) => c.code === code)) fail(400, errField("code", "Code already exists."));
      const coupon: Coupon = {
        id: nextId(db.seq, "coupon"),
        code,
        type: body.type === "fixed" ? "fixed" : "percent",
        value: Math.max(0, Number(body.value) || 0),
        min_order_value: Number(body.min_order_value || 0).toFixed(2),
        max_uses: body.max_uses === null || body.max_uses === "" ? null : Math.max(0, Number(body.max_uses) || 0),
        uses: 0,
        expires_at: body.expires_at ? String(body.expires_at) : null,
        is_active: body.is_active !== false,
      };
      db.coupons.push(coupon);
      saveDB();
      return ok(201, coupon);
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/coupons\/(\d+)\/?$/,
    handler: ({ db, me, body }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const c = db.coupons.find((c) => c.id === Number(m[1]));
      if (!c) fail(404, { detail: "Not found." });
      if (typeof body.code === "string") c.code = String(body.code).toUpperCase().replace(/\s/g, "");
      if (typeof body.type === "string") c.type = body.type === "fixed" ? "fixed" : "percent";
      if (typeof body.value === "number") c.value = Math.max(0, body.value);
      if (typeof body.min_order_value === "string" || typeof body.min_order_value === "number") {
        c.min_order_value = Number(body.min_order_value || 0).toFixed(2);
      }
      if (body.max_uses === null || typeof body.max_uses === "number") {
        c.max_uses = body.max_uses === null ? null : Math.max(0, Number(body.max_uses) || 0);
      }
      if (body.expires_at === null || typeof body.expires_at === "string") c.expires_at = body.expires_at;
      if (typeof body.is_active === "boolean") c.is_active = body.is_active;
      saveDB();
      return ok(200, c);
    },
  },
  {
    method: "delete",
    pattern: /^\/admin\/coupons\/(\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      db.coupons = db.coupons.filter((c) => c.id !== Number(m[1]));
      saveDB();
      return ok(204, null);
    },
  },

  // --- admin: reviews ---
  {
    method: "get",
    pattern: /^\/admin\/reviews\/?$/,
    handler: ({ db, me, query }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const status = query.get("status");
      let list = db.reviews;
      if (status) list = list.filter((r) => r.status === (status as ReviewStatus));
      return ok(200, [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/reviews\/(\d+)\/?$/,
    handler: ({ db, me, body }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const r = db.reviews.find((r) => r.id === Number(m[1]));
      if (!r) fail(404, { detail: "Not found." });
      r.status = String(body.status) as ReviewStatus;
      saveDB();
      return ok(200, r);
    },
  },
  {
    method: "delete",
    pattern: /^\/admin\/reviews\/(\d+)\/?$/,
    handler: ({ db, me }, m) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      db.reviews = db.reviews.filter((r) => r.id !== Number(m[1]));
      saveDB();
      return ok(204, null);
    },
  },

  // --- admin: settings ---
  {
    method: "get",
    pattern: /^\/admin\/settings\/?$/,
    handler: ({ me }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      return ok(200, getDB().settings);
    },
  },
  {
    method: "patch",
    pattern: /^\/admin\/settings\/?$/,
    handler: ({ db, me, body }) => {
      if (!me?.is_staff) fail(403, { detail: "Staff only." });
      const s: StoreSettings = db.settings;
      if (typeof body.store_name === "string") s.store_name = body.store_name;
      if (typeof body.tax_rate === "number") s.tax_rate = body.tax_rate;
      if (typeof body.shipping_flat_rate === "string" || typeof body.shipping_flat_rate === "number") {
        s.shipping_flat_rate = Number(body.shipping_flat_rate).toFixed(2);
      }
      if (body.free_shipping_threshold === null || typeof body.free_shipping_threshold === "string" || typeof body.free_shipping_threshold === "number") {
        s.free_shipping_threshold = body.free_shipping_threshold === null ? null : Number(body.free_shipping_threshold).toFixed(2);
      }
      if (typeof body.low_stock_threshold === "number") s.low_stock_threshold = Math.max(0, body.low_stock_threshold);
      saveDB();
      return ok(200, s);
    },
  },
];

function publicUser(_db: DBState, u: DBUser): User {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    last_name: u.last_name,
    role: u.role,
    is_staff: u.is_staff,
    email_verified: u.email_verified,
    created_at: u.created_at,
  };
}

// --- adapter entry ---

export const useMocks = (import.meta.env.VITE_USE_MOCKS ?? "true") !== "false";

export function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(handle(config));
      } catch (e) {
        reject(e as AxiosError);
      }
    }, 150 + Math.random() * 250);
  });
}

function handle(config: InternalAxiosRequestConfig): AxiosResponse {
  const rawUrl = config.url ?? "";
  const url = rawUrl.replace(/^\/api/, "").split("?")[0];
  const query = new URLSearchParams((config.url ?? "").split("?")[1] ?? "");
  const method = (config.method ?? "get").toLowerCase();
  const db = getDB();

  const authHeader = String(config.headers?.Authorization ?? config.headers?.authorization ?? "");
  const me = authHeader.startsWith("Bearer ") ? decodeAccess(authHeader.slice(7)) : null;

  let body: Record<string, unknown> = {};
  if (config.data && typeof config.data === "string") {
    try {
      body = JSON.parse(config.data);
    } catch {
      body = {};
    }
  } else if (config.data && typeof config.data === "object") {
    body = config.data as Record<string, unknown>;
  }

  const ctx: Ctx = {
    db,
    me,
    body,
    query,
    headers: (config.headers as Record<string, string>) ?? {},
  };

  for (const route of routes) {
    if (route.method !== method) continue;
    const match = url.match(route.pattern);
    if (!match) continue;
    return route.handler(ctx, match) as AxiosResponse;
  }

  fail(404, { detail: `No route matches ${method.toUpperCase()} ${url}` });
  throw new Error("unreachable");
}