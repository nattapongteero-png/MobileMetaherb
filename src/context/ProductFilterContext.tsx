import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ALL_PRODUCTS,
  type CatalogProduct,
  type CategoryKey,
} from "../data/catalog";

export type CatFilter = CategoryKey | "all";
export type KindFilter = "all" | "flash" | "promo" | "recommended";
export type SortKey = "newest" | "popular" | "priceAsc" | "priceDesc";

// Price slider bounds — derived from the catalog, rounded up to a tidy ceiling.
export const PRICE_MIN = 0;
export const PRICE_MAX = Math.ceil(Math.max(...ALL_PRODUCTS.map((p) => p.price)) / 10) * 10;

type Ctx = {
  query: string;
  setQuery: (s: string) => void;
  cat: CatFilter;
  setCat: (c: CatFilter) => void;
  kind: KindFilter;
  setKind: (k: KindFilter) => void;
  priceMin: number;
  priceMax: number;
  setPrice: (min: number, max: number) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  reset: () => void;
  /** Filtered + sorted result — single source for the list and the count. */
  products: CatalogProduct[];
  /** Number of active narrowing filters (sort excluded). */
  activeCount: number;
};

const FilterContext = createContext<Ctx | null>(null);

/** Shares product-filter state between the Products screen and the filter sheet. */
export function ProductFilterProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatFilter>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [priceMin, setPriceMin] = useState(PRICE_MIN);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);
  const [sort, setSort] = useState<SortKey>("newest");

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = ALL_PRODUCTS.filter((p) => {
      const inCat = cat === "all" || p.category === cat;
      const inKind =
        kind === "all" ||
        (kind === "flash" && !!p.isFlashSale) ||
        (kind === "promo" && (!!p.discountPercent || !!p.hasCoupon)) ||
        (kind === "recommended" && !!p.isRecommended);
      const inPrice = p.price >= priceMin && p.price <= priceMax;
      const inQuery = q.length === 0 || p.name.toLowerCase().includes(q);
      return inCat && inKind && inPrice && inQuery;
    });
    const sorted = [...list];
    if (sort === "priceAsc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "newest") sorted.sort((a, b) => Number(b.id) - Number(a.id));
    else sorted.sort((a, b) => b.rating - a.rating); // popular
    return sorted;
  }, [query, cat, kind, priceMin, priceMax, sort]);

  const activeCount =
    (cat !== "all" ? 1 : 0) +
    (kind !== "all" ? 1 : 0) +
    (priceMin > PRICE_MIN || priceMax < PRICE_MAX ? 1 : 0);

  const value = useMemo<Ctx>(
    () => ({
      query,
      setQuery,
      cat,
      setCat,
      kind,
      setKind,
      priceMin,
      priceMax,
      setPrice: (min, max) => {
        setPriceMin(min);
        setPriceMax(max);
      },
      sort,
      setSort,
      reset: () => {
        setCat("all");
        setKind("all");
        setPriceMin(PRICE_MIN);
        setPriceMax(PRICE_MAX);
        setSort("newest");
      },
      products,
      activeCount,
    }),
    [query, cat, kind, priceMin, priceMax, sort, products, activeCount],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useProductFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useProductFilter must be used within ProductFilterProvider");
  return ctx;
}
