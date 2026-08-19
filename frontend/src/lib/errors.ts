import axios from "axios";

// Normalizes DRF-style error payloads ({detail} | {field: [msgs]}) into a
// single human-readable string for inline notices.
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") return data.detail;
      if (typeof data.message === "string") return data.message;
      const first = Object.entries(data).find(([, v]) => Array.isArray(v) && v.length > 0);
      if (first && Array.isArray(first[1]) && typeof first[1][0] === "string") return first[1][0];
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

// Pulls per-field error messages out of a DRF error payload.
export function fieldErrors(err: unknown): Record<string, string> {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    if (data && typeof data === "object") {
      const out: Record<string, string> = {};
      for (const [key, val] of Object.entries(data)) {
        if (Array.isArray(val) && val.length && typeof val[0] === "string") out[key] = val[0];
      }
      return out;
    }
  }
  return {};
}