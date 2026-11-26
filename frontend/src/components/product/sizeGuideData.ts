export type Unit = "cm" | "in";

export type SizeCategoryKey = "tops" | "bottoms" | "dresses" | "outerwear";

export interface MeasurementRow {
  size: string;
  intl: { us: string; eu: string; uk: string };
  // Centimeter measurements
  cm: Record<string, string>;
  // Inch measurements
  in: Record<string, string>;
}

export interface SizeCategoryGuide {
  key: SizeCategoryKey;
  label: string;
  categoryTitle: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: MeasurementRow[];
  measureTips: { title: string; instruction: string }[];
}

/**
 * Standard Studio Atelier Tailoring Reference Charts.
 * These measurements serve as standard body/garment reference parameters.
 * Specific garment fit (e.g. relaxed, boxy, slim) is annotated in each product's Fit Note.
 */
export const SIZE_CATEGORY_GUIDES: Record<SizeCategoryKey, SizeCategoryGuide> = {
  tops: {
    key: "tops",
    label: "Tops & Shirts",
    categoryTitle: "Tops, T-Shirts, Shirts & Knitwear",
    description: "Standard tailoring proportions for relaxed, classic, and boxy cut tops.",
    columns: [
      { key: "chest", label: "Chest / Bust" },
      { key: "shoulder", label: "Shoulders" },
      { key: "sleeve", label: "Sleeve Length" },
      { key: "length", label: "Body Length" },
    ],
    rows: [
      {
        size: "XS",
        intl: { us: "34", eu: "44", uk: "34" },
        cm: { chest: "86–90", shoulder: "42", sleeve: "62", length: "68" },
        in: { chest: "34–35.5", shoulder: "16.5", sleeve: "24.4", length: "26.8" },
      },
      {
        size: "S",
        intl: { us: "36", eu: "46", uk: "36" },
        cm: { chest: "91–95", shoulder: "44", sleeve: "63", length: "70" },
        in: { chest: "36–37.5", shoulder: "17.3", sleeve: "24.8", length: "27.5" },
      },
      {
        size: "M",
        intl: { us: "38–40", eu: "48–50", uk: "38–40" },
        cm: { chest: "96–102", shoulder: "46", sleeve: "64", length: "72" },
        in: { chest: "38–40", shoulder: "18.1", sleeve: "25.2", length: "28.3" },
      },
      {
        size: "L",
        intl: { us: "42–44", eu: "52–54", uk: "42–44" },
        cm: { chest: "103–109", shoulder: "48", sleeve: "65", length: "74" },
        in: { chest: "40.5–43", shoulder: "18.9", sleeve: "25.6", length: "29.1" },
      },
      {
        size: "XL",
        intl: { us: "46", eu: "56", uk: "46" },
        cm: { chest: "110–116", shoulder: "50", sleeve: "66", length: "76" },
        in: { chest: "43.5–45.5", shoulder: "19.7", sleeve: "26.0", length: "30.0" },
      },
      {
        size: "XXL",
        intl: { us: "48", eu: "58", uk: "48" },
        cm: { chest: "117–123", shoulder: "52", sleeve: "67", length: "78" },
        in: { chest: "46–48.5", shoulder: "20.5", sleeve: "26.4", length: "30.7" },
      },
    ],
    measureTips: [
      {
        title: "Chest / Bust",
        instruction: "Measure horizontally under your arms around the fullest part of your chest or bust, keeping the measuring tape level.",
      },
      {
        title: "Shoulder Width",
        instruction: "Measure straight across the back from the tip of the left shoulder bone to the right shoulder bone.",
      },
      {
        title: "Sleeve Length",
        instruction: "With arm slightly bent, measure from the center back neck, across the shoulder point, down to the wrist bone.",
      },
      {
        title: "Body Length",
        instruction: "Measure from the high shoulder point next to collar down to the bottom hemline.",
      },
    ],
  },

  bottoms: {
    key: "bottoms",
    label: "Bottoms & Denim",
    categoryTitle: "Trousers, Pants & Denim",
    description: "Standard tailoring proportions for straight-leg, tailored, and cropped trousers.",
    columns: [
      { key: "waist", label: "Waist" },
      { key: "hip", label: "Hips" },
      { key: "inseam", label: "Inseam" },
      { key: "rise", label: "Front Rise" },
    ],
    rows: [
      {
        size: "XS",
        intl: { us: "28", eu: "44", uk: "28" },
        cm: { waist: "71–74", hip: "88–92", inseam: "78", rise: "26" },
        in: { waist: "28–29", hip: "34.5–36", inseam: "30.7", rise: "10.2" },
      },
      {
        size: "S",
        intl: { us: "30", eu: "46", uk: "30" },
        cm: { waist: "75–79", hip: "93–96", inseam: "79", rise: "27" },
        in: { waist: "29.5–31", hip: "36.5–38", inseam: "31.1", rise: "10.6" },
      },
      {
        size: "M",
        intl: { us: "32", eu: "48–50", uk: "32" },
        cm: { waist: "80–85", hip: "97–102", inseam: "80", rise: "28" },
        in: { waist: "31.5–33.5", hip: "38.5–40", inseam: "31.5", rise: "11.0" },
      },
      {
        size: "L",
        intl: { us: "34–36", eu: "52", uk: "34–36" },
        cm: { waist: "86–91", hip: "103–108", inseam: "81", rise: "29" },
        in: { waist: "34–36", hip: "40.5–42.5", inseam: "31.9", rise: "11.4" },
      },
      {
        size: "XL",
        intl: { us: "38", eu: "54", uk: "38" },
        cm: { waist: "92–98", hip: "109–114", inseam: "82", rise: "30" },
        in: { waist: "36.5–38.5", hip: "43–45", inseam: "32.3", rise: "11.8" },
      },
      {
        size: "XXL",
        intl: { us: "40", eu: "56", uk: "40" },
        cm: { waist: "99–105", hip: "115–121", inseam: "83", rise: "31" },
        in: { waist: "39–41.5", hip: "45.5–47.5", inseam: "32.7", rise: "12.2" },
      },
    ],
    measureTips: [
      {
        title: "Waistline",
        instruction: "Measure around your natural waistline where trousers comfortably sit, maintaining one finger width of ease.",
      },
      {
        title: "Seat / Hips",
        instruction: "Stand with feet together and measure around the fullest point of your hips and seat.",
      },
      {
        title: "Inseam Length",
        instruction: "Measure along the interior leg seam from the crotch junction down to the bottom hem.",
      },
      {
        title: "Front Rise",
        instruction: "Measure vertically from the crotch intersection seam up to the top edge of the waistband.",
      },
    ],
  },

  dresses: {
    key: "dresses",
    label: "Dresses",
    categoryTitle: "Dresses & One-Piece Silhouettes",
    description: "Standard proportions for bias-cut, tailored, and draped dresses.",
    columns: [
      { key: "bust", label: "Bust" },
      { key: "waist", label: "Waist" },
      { key: "hip", label: "Hips" },
      { key: "length", label: "Total Length" },
    ],
    rows: [
      {
        size: "XS",
        intl: { us: "0–2", eu: "32–34", uk: "4–6" },
        cm: { bust: "82–85", waist: "63–66", hip: "88–91", length: "115" },
        in: { bust: "32–33.5", waist: "25–26", hip: "34.5–36", length: "45.3" },
      },
      {
        size: "S",
        intl: { us: "4–6", eu: "36", uk: "8–10" },
        cm: { bust: "86–89", waist: "67–70", hip: "92–95", length: "117" },
        in: { bust: "34–35", waist: "26.5–27.5", hip: "36.5–37.5", length: "46.0" },
      },
      {
        size: "M",
        intl: { us: "8–10", eu: "38–40", uk: "12–14" },
        cm: { bust: "90–94", waist: "71–75", hip: "96–100", length: "119" },
        in: { bust: "35.5–37", waist: "28–29.5", hip: "38–39.5", length: "46.8" },
      },
      {
        size: "L",
        intl: { us: "12–14", eu: "42", uk: "16" },
        cm: { bust: "95–100", waist: "76–81", hip: "101–106", length: "121" },
        in: { bust: "37.5–39.5", waist: "30–32", hip: "40–41.5", length: "47.6" },
      },
      {
        size: "XL",
        intl: { us: "16", eu: "44", uk: "18" },
        cm: { bust: "101–107", waist: "82–88", hip: "107–113", length: "123" },
        in: { bust: "40–42", waist: "32.5–34.5", hip: "42–44.5", length: "48.4" },
      },
      {
        size: "XXL",
        intl: { us: "18", eu: "46", uk: "20" },
        cm: { bust: "108–114", waist: "89–95", hip: "114–120", length: "125" },
        in: { bust: "42.5–45", waist: "35–37.5", hip: "45–47", length: "49.2" },
      },
    ],
    measureTips: [
      {
        title: "Bust",
        instruction: "Measure across the fullest apex of the bust while wearing an unpadded bra.",
      },
      {
        title: "Natural Waist",
        instruction: "Measure around the narrowest perimeter of the torso above the hip bones.",
      },
      {
        title: "Lower Hips",
        instruction: "Measure around the widest curve of the hips and seat with feet together.",
      },
      {
        title: "Garment Length",
        instruction: "Measured vertically from the high shoulder point seam straight down to the lower hemline.",
      },
    ],
  },

  outerwear: {
    key: "outerwear",
    label: "Outerwear & Coats",
    categoryTitle: "Jackets, Overcoats & Outer Layers",
    description: "Tailored with proportional ease for layering over knitwear and shirting.",
    columns: [
      { key: "chest", label: "Chest Circumference" },
      { key: "shoulder", label: "Shoulders" },
      { key: "sleeve", label: "Sleeve Length" },
      { key: "length", label: "Center Back Length" },
    ],
    rows: [
      {
        size: "XS",
        intl: { us: "34", eu: "44", uk: "34" },
        cm: { chest: "94–98", shoulder: "44", sleeve: "63", length: "88" },
        in: { chest: "37–38.5", shoulder: "17.3", sleeve: "24.8", length: "34.6" },
      },
      {
        size: "S",
        intl: { us: "36", eu: "46", uk: "36" },
        cm: { chest: "99–103", shoulder: "46", sleeve: "64", length: "90" },
        in: { chest: "39–40.5", shoulder: "18.1", sleeve: "25.2", length: "35.4" },
      },
      {
        size: "M",
        intl: { us: "38–40", eu: "48–50", uk: "38–40" },
        cm: { chest: "104–109", shoulder: "48", sleeve: "65", length: "92" },
        in: { chest: "41–43", shoulder: "18.9", sleeve: "25.6", length: "36.2" },
      },
      {
        size: "L",
        intl: { us: "42–44", eu: "52–54", uk: "42–44" },
        cm: { chest: "110–115", shoulder: "50", sleeve: "66", length: "94" },
        in: { chest: "43.5–45.5", shoulder: "19.7", sleeve: "26.0", length: "37.0" },
      },
      {
        size: "XL",
        intl: { us: "46", eu: "56", uk: "46" },
        cm: { chest: "116–122", shoulder: "52", sleeve: "67", length: "96" },
        in: { chest: "45.5–48", shoulder: "20.5", sleeve: "26.4", length: "37.8" },
      },
      {
        size: "XXL",
        intl: { us: "48", eu: "58", uk: "48" },
        cm: { chest: "123–129", shoulder: "54", sleeve: "68", length: "98" },
        in: { chest: "48.5–51", shoulder: "21.3", sleeve: "26.8", length: "38.6" },
      },
    ],
    measureTips: [
      {
        title: "Chest Ease",
        instruction: "Outerwear includes 6–10 cm of design ease over standard chest measurements to allow comfortable layering.",
      },
      {
        title: "Shoulder Point",
        instruction: "Measure across the back shoulder seams, accounting for subtle internal structure.",
      },
      {
        title: "Center Back Length",
        instruction: "Measured vertically down the center back seam from the collar seam to the bottom hemline.",
      },
      {
        title: "Sleeve Length",
        instruction: "Measured from shoulder seam point down to cuff edge.",
      },
    ],
  },
};

/**
 * Resolves the appropriate size guide key from category slug or name.
 */
export function resolveCategoryGuide(categorySlug?: string, categoryName?: string): SizeCategoryKey {
  const s = (categorySlug ?? "").toLowerCase();
  const n = (categoryName ?? "").toLowerCase();

  if (s.includes("dress") || n.includes("dress")) {
    return "dresses";
  }
  if (
    s.includes("trouser") ||
    s.includes("pant") ||
    s.includes("denim") ||
    s.includes("jean") ||
    s.includes("bottom") ||
    n.includes("trouser") ||
    n.includes("denim") ||
    n.includes("bottom")
  ) {
    return "bottoms";
  }
  if (
    s.includes("outerwear") ||
    s.includes("coat") ||
    s.includes("jacket") ||
    n.includes("outerwear") ||
    n.includes("coat") ||
    n.includes("jacket")
  ) {
    return "outerwear";
  }

  // Default to tops (shirts, tees, knitwear)
  return "tops";
}
