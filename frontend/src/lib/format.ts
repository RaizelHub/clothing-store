// Prices arrive as decimal strings (DRF DecimalField). Format for display.
export function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// Stable string hash — used for deterministic placeholder art.
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// --- Placeholder art -------------------------------------------------------
// No photography in the repo yet; every product-image URL is deterministic SVG
// derived from slug + color so the catalog looks intentional, not broken.
// Swap in real Cloudinary URLs later — nothing else changes.

const NEUTRAL_TONES = ["#e8e4dc", "#ddd8cd", "#d3cdbf", "#e4ddd4", "#d9d2c6", "#e6e1d9"];

function lightenHex(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + amt);
  const g = Math.min(255, ((num >> 8) & 0xff) + amt);
  const b = Math.min(255, (num & 0xff) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function monogram(slug: string): string {
  return slug
    .split("-")
    .filter((w) => !["the", "and", "of"].includes(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function placeholderImage(slug: string, hex: string, index = 0): string {
  const seed = hashString(slug + hex);
  const tone = index === 0 ? lightenHex(hex, 88) : NEUTRAL_TONES[seed % NEUTRAL_TONES.length];
  const inkColor = index === 0 ? "rgba(10,10,10,0.22)" : "rgba(10,10,10,0.14)";
  const initials = monogram(slug);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="${tone}"/>
  <rect x="0" y="0" width="800" height="1000" fill="${tone}" opacity="0"/>
  <circle cx="${400 + ((seed % 240) - 120)}" cy="${500 + ((seed >> 3) % 200) - 100}" r="${260 + (seed % 80)}" fill="none" stroke="${inkColor}" stroke-width="1"/>
  <text x="400" y="480" font-family="Georgia, serif" font-size="150" fill="${inkColor}" text-anchor="middle">${initials}</text>
  <text x="400" y="540" font-family="Helvetica, Arial, sans-serif" font-size="20" letter-spacing="10" fill="${inkColor}" text-anchor="middle">STUDIO</text>
  <rect x="630" y="24" width="146" height="146" fill="#1a1a1a"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}