/**
 * The catalog the app actually renders: the immutable `REAL_PRODUCTS` seed with
 * the owner's edits laid over it, deleted rows removed, and owner-created
 * products merged in.
 *
 * `REAL_PRODUCTS` remains the seed for things that must not shift under the
 * owner's feet — historical order lines, sales analytics, the shop's product
 * index used by TOP_PRODUCTS. Customer-facing surfaces read from here instead.
 */
import { useStore } from "../store/db";
import { catalogStore, type NewProduct, type ProductPatch } from "../store/catalog";
import { stockStore } from "../store/stock";
import { REAL_PRODUCTS } from "./realProducts";
import type { CatalogProduct, CategoryKey, TypeKey } from "./catalog";

/** Placeholder art for an owner-created product saved without a photo. */
const FALLBACK_IMAGE = REAL_PRODUCTS[0].image;

function fromNew(p: NewProduct): CatalogProduct {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    originalPrice: p.originalPrice,
    image: p.imageUri ? { uri: p.imageUri } : FALLBACK_IMAGE,
    rating: 0,
    sold: "0",
    shop: p.shop,
    category: p.category as CategoryKey,
    type: p.type as TypeKey,
    isRecommended: p.recommended,
  } as CatalogProduct;
}

function applyPatch(p: CatalogProduct, patch: ProductPatch | undefined): CatalogProduct {
  if (!patch) return p;
  return {
    ...p,
    ...(patch.name != null ? { name: patch.name } : null),
    ...(patch.price != null ? { price: patch.price } : null),
    ...(patch.originalPrice != null ? { originalPrice: patch.originalPrice } : null),
    ...(patch.recommended != null ? { isRecommended: patch.recommended } : null),
    ...(patch.isFlashSale != null ? { isFlashSale: patch.isFlashSale } : null),
    ...(patch.discountPercent != null ? { discountPercent: patch.discountPercent } : null),
  };
}

/**
 * Merge the seed and the overlay.
 * `closed` (ปิดขาย) and `deleted` both drop the product from the storefront —
 * the console still lists them, reading the overlay directly.
 */
export function mergeCatalog(overlay = catalogStore.get()): CatalogProduct[] {
  const seeded = REAL_PRODUCTS.filter((p) => {
    const patch = overlay.patches[p.id];
    return !patch?.deleted && !patch?.closed;
  }).map((p) => applyPatch(p, overlay.patches[p.id]));

  const added = overlay.added.filter((p) => !p.deleted && !p.closed).map(fromNew);
  // Newest owner-created products lead the storefront.
  return [...added, ...seeded];
}

/** Live storefront catalog. Re-renders when the owner edits anything. */
export function useLiveProducts(): CatalogProduct[] {
  const overlay = useStore(catalogStore);
  return mergeCatalog(overlay);
}

export function useLiveProduct(id: string): CatalogProduct | undefined {
  return useLiveProducts().find((p) => p.id === id);
}

/** Non-reactive lookup for contexts (cart, wishlist, AI) that resolve by id. */
export function liveProductById(id: string): CatalogProduct | undefined {
  return mergeCatalog().find((p) => p.id === id);
}

// ── the storefront rails ───────────────────────────────────────
export const useFlashSaleProducts = (): CatalogProduct[] => useLiveProducts().filter((p) => p.isFlashSale);
export const useRecommendedProducts = (): CatalogProduct[] => useLiveProducts().filter((p) => p.isRecommended);
/** Discounted products for the promo rail (flash-sale excluded to avoid overlap). */
export const usePromoProducts = (): CatalogProduct[] =>
  useLiveProducts().filter((p) => p.discountPercent && !p.isFlashSale);

// ── the owner's console view ───────────────────────────────────
export type OwnerProduct = CatalogProduct & {
  stock: number;
  closed: boolean;
  deleted: boolean;
};

/**
 * Every product the shop owns, including hidden and owner-created ones, with
 * live stock (which now falls as orders come in).
 */
export function useOwnerProducts(shopName: string): OwnerProduct[] {
  const overlay = useStore(catalogStore);
  const stock = useStore(stockStore);

  const seeded = REAL_PRODUCTS.filter((p) => p.shop === shopName).map((p) => {
    const patch = overlay.patches[p.id];
    return {
      ...applyPatch(p, patch),
      stock: stock[p.id] ?? 200,
      closed: Boolean(patch?.closed),
      deleted: Boolean(patch?.deleted),
    };
  });

  const added = overlay.added
    .filter((p) => p.shop === shopName)
    .map((p) => ({
      ...fromNew(p),
      stock: stock[p.id] ?? 0,
      closed: Boolean(p.closed),
      deleted: Boolean(p.deleted),
    }));

  return [...added, ...seeded].filter((p) => !p.deleted);
}
