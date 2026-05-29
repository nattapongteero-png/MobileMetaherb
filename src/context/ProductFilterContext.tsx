import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  ALL_PRODUCTS,
  PRICE_RANGES,
  type CatalogProduct,
  type CategoryKey,
  type TypeKey,
} from "../data/catalog";

export type CatFilter = CategoryKey | "all";
export type SortKey = "popular" | "priceAsc" | "priceDesc";

type Ctx = {
  query: string;
  setQuery: (s: string) => void;
  cat: CatFilter;
  setCat: (c: CatFilter) => void;
  types: TypeKey[];
  toggleType: (t: TypeKey) => void;
  priceKey: string;
  setPriceKey: (k: string) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  reset: () => void;
  /** Filtered + sorted result — single source for the list and the count. */
  products: CatalogProduct[];
  /** Number of active narrowing filters (sort excluded). */
  activeCount: number;
};

const FilterContext = createContext<Ctx | null>(null);

/** Shares product-filter state between the Products screen and the native
 *  filter sheet (presented as a separate screen). */
export function ProductFilterProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<CatFilter>("all");
  const [types, setTypes] = useState<TypeKey[]>([]);
  const [priceKey, setPriceKey] = useState("all");
  const [sort, setSort] = useState<SortKey>("popular");

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    const range = PRICE_RANGES.find((r) => r.key === priceKey) ?? PRICE_RANGES[0];
    const list = ALL_PRODUCTS.filter((p) => {
      const inCat = cat === "all" || p.category === cat;
      const inType = types.length === 0 || types.includes(p.type);
      const inPrice = p.price >= range.min && p.price < range.max;
      const inQuery = q.length === 0 || p.name.toLowerCase().includes(q);
      return inCat && inType && inPrice && inQuery;
    });
    const sorted = [...list];
    if (sort === "priceAsc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") sorted.sort((a, b) => b.price - a.price);
    else sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [query, cat, types, priceKey, sort]);

  const activeCount =
    (cat !== "all" ? 1 : 0) + types.length + (priceKey !== "all" ? 1 : 0);

  const value = useMemo<Ctx>(
    () => ({
      query,
      setQuery,
      cat,
      setCat,
      types,
      toggleType: (k) =>
        setTypes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])),
      priceKey,
      setPriceKey,
      sort,
      setSort,
      reset: () => {
        setCat("all");
        setTypes([]);
        setPriceKey("all");
        setSort("popular");
      },
      products,
      activeCount,
    }),
    [query, cat, types, priceKey, sort, products, activeCount],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useProductFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useProductFilter must be used within ProductFilterProvider");
  return ctx;
}
