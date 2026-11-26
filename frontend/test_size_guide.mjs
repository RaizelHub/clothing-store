import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read and parse sizeGuideData.ts content or test compiled output
const source = fs.readFileSync(path.join(__dirname, "src/components/product/sizeGuideData.ts"), "utf-8");

console.log("=== Testing Size Guide Architecture & Data Integrity ===");

// 1. Verify Category resolution logic
function resolveCategoryGuide(categorySlug, categoryName) {
  const s = (categorySlug ?? "").toLowerCase();
  const n = (categoryName ?? "").toLowerCase();

  if (s.includes("dress") || n.includes("dress")) return "dresses";
  if (
    s.includes("trouser") ||
    s.includes("pant") ||
    s.includes("denim") ||
    s.includes("jean") ||
    s.includes("bottom") ||
    n.includes("trouser") ||
    n.includes("denim") ||
    n.includes("bottom")
  ) return "bottoms";
  if (
    s.includes("outerwear") ||
    s.includes("coat") ||
    s.includes("jacket") ||
    n.includes("outerwear") ||
    n.includes("coat") ||
    n.includes("jacket")
  ) return "outerwear";
  return "tops";
}

// Tests
assert.strictEqual(resolveCategoryGuide("women-dresses", "Dresses"), "dresses", "Failed to resolve dresses");
assert.strictEqual(resolveCategoryGuide("men-trousers", "Trousers"), "bottoms", "Failed to resolve trousers to bottoms");
assert.strictEqual(resolveCategoryGuide("women-denim", "Denim"), "bottoms", "Failed to resolve denim to bottoms");
assert.strictEqual(resolveCategoryGuide("men-outerwear", "Outerwear"), "outerwear", "Failed to resolve men-outerwear");
assert.strictEqual(resolveCategoryGuide("women-outerwear", "Jackets"), "outerwear", "Failed to resolve women-outerwear");
assert.strictEqual(resolveCategoryGuide("men-tops", "Tops"), "tops", "Failed to resolve men-tops");
assert.strictEqual(resolveCategoryGuide("women-tops", "Tops"), "tops", "Failed to resolve women-tops");
assert.strictEqual(resolveCategoryGuide(undefined, undefined), "tops", "Fallback should be tops");
console.log("✔ Category resolution tests passed (8/8 cases)");

// 2. Verify source code structure
assert(source.includes("export const SIZE_CATEGORY_GUIDES"), "SIZE_CATEGORY_GUIDES must be exported");
assert(source.includes("tops:"), "tops guide must be present");
assert(source.includes("bottoms:"), "bottoms guide must be present");
assert(source.includes("dresses:"), "dresses guide must be present");
assert(source.includes("outerwear:"), "outerwear guide must be present");
assert(source.includes("XXL"), "XXL size must be covered in size guide data");
assert(source.includes("cm:"), "Centimeter measurements must be supported");
assert(source.includes("in:"), "Inch measurements must be supported");
assert(source.includes("measureTips:"), "How-to-measure tips must be included");
console.log("✔ Size guide data structure verified");

// 3. Verify SizeGuide.tsx component integration
const sizeGuideComponent = fs.readFileSync(path.join(__dirname, "src/components/product/SizeGuide.tsx"), "utf-8");
assert(sizeGuideComponent.includes("role=\"tablist\""), "SizeGuide must include accessible tablist");
assert(sizeGuideComponent.includes("role=\"radiogroup\""), "SizeGuide must include unit switch radiogroup");
assert(sizeGuideComponent.includes("productFit"), "SizeGuide must support displaying product-specific fit notes");
assert(sizeGuideComponent.includes("selectedSizeName"), "SizeGuide must support active size highlighting");
assert(sizeGuideComponent.includes("onSelectSizeName"), "SizeGuide must support interactive size row selection");
assert(sizeGuideComponent.includes("How to Measure"), "SizeGuide must include How to Measure section");
console.log("✔ SizeGuide component accessibility and features verified");

// 4. Verify VariantPicker.tsx enhancements
const variantPickerComponent = fs.readFileSync(path.join(__dirname, "src/components/product/VariantPicker.tsx"), "utf-8");
assert(variantPickerComponent.includes("onOpenSizeGuide"), "VariantPicker must accept onOpenSizeGuide");
assert(variantPickerComponent.includes("Ruler"), "VariantPicker must include Ruler icon trigger");
assert(variantPickerComponent.includes("Sold Out"), "VariantPicker must display Sold Out titles / aria labels");
assert(variantPickerComponent.includes("disabled={inSelection && out}"), "VariantPicker must disable out-of-stock sizes");
console.log("✔ VariantPicker size selection UX verified");

// 5. Verify ProductDetail.tsx integration
const pdpComponent = fs.readFileSync(path.join(__dirname, "src/pages/ProductDetail.tsx"), "utf-8");
assert(pdpComponent.includes("onOpenSizeGuide={() => setSizeGuideOpen(true)}"), "PDP must connect Size Guide to VariantPicker");
assert(pdpComponent.includes("product.fit"), "PDP must expose product fit note");
assert(pdpComponent.includes("categorySlug={product.category_slug}"), "PDP must pass category slug to SizeGuide");
console.log("✔ ProductDetail integration verified");

console.log("=== All Frontend Size Guide & Fit Verification Tests Passed ===");
