import { seedDB } from "./seed";

export type DBState = ReturnType<typeof seedDB>;
export type { DBProduct, DBVariant, DBUser, DBCartItem, DBOrder, DBOutfit, DBOutfitItem } from "./seed";


const KEY = "studio_mock_db_v2";

let db: DBState | null = null;

export function getDB(): DBState {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      db = JSON.parse(raw) as DBState;
      if (!db.outfits) {
        db.outfits = seedDB().outfits;
      }
      return db;
    }
  } catch {
    // corrupted store — reseed
  }
  db = seedDB();
  saveDB();
  return db;
}

export function saveDB(): void {
  if (db) {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      // storage full/blocked — demo still works in-memory
    }
  }
}

export function resetDB(): void {
  localStorage.removeItem(KEY);
  db = null;
}