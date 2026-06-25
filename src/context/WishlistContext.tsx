import { createContext, useContext, useState, type ReactNode } from "react";
import { ALL_PRODUCTS } from "../data/catalog";

type WishlistValue = {
  /** Liked product ids. */
  ids: Set<string>;
  isWishlisted: (id: string) => boolean;
  /** Toggle a product; returns the new liked state. */
  toggle: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  // Seed with a few liked products (matches the previous Wishlist mock).
  const [ids, setIds] = useState<Set<string>>(() => new Set(ALL_PRODUCTS.slice(0, 8).map((p) => p.id)));

  const isWishlisted = (id: string) => ids.has(id);

  const toggle = (id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    return !ids.has(id); // new state (ids is the value at call time)
  };

  return <WishlistContext.Provider value={{ ids, isWishlisted, toggle }}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
