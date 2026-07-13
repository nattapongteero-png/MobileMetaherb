import { type ReactNode } from "react";
import { useStore } from "../store/db";
import { isWishlisted, prefsStore, toggleWishlist, wishlistIds } from "../store/prefs";

/**
 * Liked products, backed by the persisted preferences store. They used to live
 * in component state, so a heart tapped before closing the app was forgotten.
 */
type WishlistValue = {
  /** Liked product ids. */
  ids: Set<string>;
  isWishlisted: (id: string) => boolean;
  /** Toggle a product; returns the new liked state. */
  toggle: (id: string) => boolean;
};

export function WishlistProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useWishlist(): WishlistValue {
  useStore(prefsStore); // subscribe
  return {
    ids: new Set(wishlistIds()),
    isWishlisted,
    toggle: toggleWishlist,
  };
}
