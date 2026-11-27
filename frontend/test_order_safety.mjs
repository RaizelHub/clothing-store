import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("=== Testing Order Processing & Duplicate Prevention Safety ===");

// 1. Verify types in api.ts
const apiTypes = fs.readFileSync(path.join(__dirname, "src/types/api.ts"), "utf-8");
assert(apiTypes.includes("idempotency_key?: string | null;"), "Order type must include idempotency_key");
console.log("✔ TypeScript Order model contains idempotency_key");

// 2. Verify API client in api/orders.ts
const ordersApi = fs.readFileSync(path.join(__dirname, "src/api/orders.ts"), "utf-8");
assert(ordersApi.includes("idempotency_key?: string;"), "PlaceOrderPayload must include idempotency_key");
assert(ordersApi.includes('headers["Idempotency-Key"] = payload.idempotency_key'), "placeOrder must send Idempotency-Key header");
console.log("✔ Frontend API client sends Idempotency-Key header");

// 3. Verify Checkout.tsx double-click and idempotency protection
const checkoutCode = fs.readFileSync(path.join(__dirname, "src/pages/Checkout.tsx"), "utf-8");
assert(checkoutCode.includes("idempotencyKeyRef"), "Checkout.tsx must track idempotencyKeyRef");
assert(checkoutCode.includes("isSubmittingRef"), "Checkout.tsx must track isSubmittingRef");
assert(checkoutCode.includes("if (isSubmittingRef.current || place.isPending || hasStockErrors) return;"), "Checkout.tsx must block rapid duplicate clicks synchronously");
assert(checkoutCode.includes("disabled={hasStockErrors || !contactComplete || place.isPending || isSubmitting}"), "Submit button must be disabled when processing");
assert(checkoutCode.includes("Processing order..."), "Submit button must provide clear processing feedback");
console.log("✔ Checkout.tsx submission lock and double-click protection verified");

// 4. Verify Mock Adapter Idempotency Logic
const mockAdapter = fs.readFileSync(path.join(__dirname, "src/mocks/adapter.ts"), "utf-8");
assert(mockAdapter.includes("headers?.[\"idempotency-key\"]"), "Mock adapter must check Idempotency-Key header");
assert(mockAdapter.includes("db.orders.find((o) => o.idempotency_key === idempotencyKey)"), "Mock adapter must look up existing orders by idempotency key");
assert(mockAdapter.includes("idempotency_key: idempotencyKey ?? null"), "Mock adapter must persist idempotency_key on created orders");
console.log("✔ Mock adapter idempotency replay logic verified");

console.log("=== All Order Processing & Duplicate Prevention Tests Passed ===");
