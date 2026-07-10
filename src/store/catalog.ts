/**
 * Catalog mutations. `REAL_PRODUCTS` stays the immutable seed; everything the
 * shop owner changes is recorded here as an overlay and merged back at read
 * time (src/data/liveCatalog.ts).
 *
 * Before this, AddProductScreen threw the form away on save, and the owner's
 * hide/rename/recommend edits lived in a private `pmOverrides` map that the
 * customer storefront never consulted.
 *
 * Pure TS — the overlay is JSON-safe (new products carry a picked photo `uri`,
 * not a bundler image handle), so it persists across restarts.
 */
import { createStore } from "./db";
import { emit } from "./events";

/** Fields an owner may change on a seeded catalog product. */
export type ProductPatch = {
  name?: string;
  price?: number;
  originalPrice?: number;
  /** "ปิดขาย" — hidden from the storefront but kept in the console. */
  closed?: boolean;
  deleted?: boolean;
  recommended?: boolean;
  isFlashSale?: boolean;
  discountPercent?: number;
};

/** A product the owner created in the app. Photos are picked URIs. */
export type NewProduct = {
  id: string;
  shop: string;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  type: string;
  imageUri?: string;
  createdAt: number;
  closed?: boolean;
  deleted?: boolean;
  recommended?: boolean;
};

export type CatalogOverlay = {
  patches: Record<string, ProductPatch>;
  added: NewProduct[];
};

export const catalogStore = createStore<CatalogOverlay>(
  { patches: {}, added: [] },
  { persistKey: "mh.catalog" },
);

// ── reads ──────────────────────────────────────────────────────
export const patchFor = (id: string): ProductPatch | undefined => catalogStore.get().patches[id];
export const addedProducts = (): NewProduct[] => catalogStore.get().added;
export const isDeleted = (id: string): boolean =>
  Boolean(catalogStore.get().patches[id]?.deleted) ||
  Boolean(catalogStore.get().added.find((p) => p.id === id)?.deleted);

// ── writes ─────────────────────────────────────────────────────
function mutate(id: string, patch: ProductPatch): void {
  const s = catalogStore.get();
  // An added product carries its own fields — patch it in place.
  if (s.added.some((p) => p.id === id)) {
    catalogStore.set({ ...s, added: s.added.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    return;
  }
  catalogStore.set({ ...s, patches: { ...s.patches, [id]: { ...s.patches[id], ...patch } } });
}

export function patchProduct(id: string, patch: ProductPatch): void {
  mutate(id, patch);
}

/** Hide from the storefront ("ปิดขาย") without losing the row. */
export function setProductClosed(id: string, closed: boolean): void {
  mutate(id, { closed });
}

export function setProductRecommended(id: string, recommended: boolean): void {
  mutate(id, { recommended });
}

export function deleteProduct(id: string): void {
  mutate(id, { deleted: true });
}

export function restoreProduct(id: string): void {
  mutate(id, { deleted: false });
}

let addedSeq = 0;
/** Ids sit outside the seed's "1".."45" range so they can never collide. */
export function nextProductId(now = Date.now()): string {
  addedSeq += 1;
  return `new-${now.toString(36)}-${addedSeq}`;
}

export type AddProductInput = Omit<NewProduct, "id" | "createdAt"> & { now?: number };

export function addProduct(input: AddProductInput): NewProduct {
  const { now, ...rest } = input;
  const at = now ?? Date.now();
  const product: NewProduct = { ...rest, id: nextProductId(at), createdAt: at };
  const s = catalogStore.get();
  catalogStore.set({ ...s, added: [product, ...s.added] });
  emit({
    type: "product_added",
    audience: ["shop"],
    at,
    shopName: product.shop,
    productId: product.id,
    title: "เพิ่มสินค้าใหม่",
    body: `${product.name} · ฿${product.price.toLocaleString()}`,
  });
  return product;
}

/** Test helper. */
export function __resetCatalog(): void {
  catalogStore.reset({ patches: {}, added: [] });
  addedSeq = 0;
}
