import { createContext, useContext, useState, type ReactNode } from "react";
import { RAW_PRODUCT_BY_ID, REAL_PRODUCTS, getRealProductImage } from "../data/realProducts";
import { shopForKey } from "../data/shops";

export type CartItem = {
  /** Cart-line key: product id + chosen option ("p-37-0"). Not the product id. */
  id: string;
  /** Catalog product id — what an order line and the stock table key on. */
  productId: string;
  name: string;
  option: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  inStock: boolean;
  image: number | { uri: string };
  shop: string;
};

type AddInput = Omit<CartItem, "quantity" | "inStock" | "shop"> & {
  quantity?: number;
  inStock?: boolean;
  shop?: string;
};

type CartValue = {
  items: CartItem[];
  /** Number of distinct line items — drives the cart badge. */
  count: number;
  addToCart: (item: AddInput) => void;
  updateQty: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  removeMany: (ids: string[]) => void;
  /**
   * The lines the buyer ticked in the cart and carried into checkout. Set by
   * CartScreen before navigating to Payment — the Payment screen used to render
   * a hardcoded 2-item array (data/checkoutItems.ts) no matter what was in the cart.
   */
  checkoutItems: CartItem[];
  beginCheckout: (items: CartItem[]) => void;
  /** Clear the checked-out lines once an order exists for them. */
  finishCheckout: () => void;
};

// Build a cart line straight from a real catalog product (the same source the
// shop / product-detail pages read) so name, price, discount, photo and shop
// all match what the buyer actually sees in store — no drifting mock copies.
// The shop comes from the catalog's own `shop` field (the authoritative owner used
// by the storefront + detail page), falling back to the hash only for ids that are
// merged away / absent from REAL_PRODUCTS — so cart groupings can't drift.
function lineFromProduct(
  id: string,
  opts: { option: string; quantity: number; inStock?: boolean },
): CartItem {
  const p = RAW_PRODUCT_BY_ID[id];
  return {
    id: `c-${id}`,
    productId: id,
    name: p.name,
    option: opts.option,
    price: p.price,
    originalPrice: p.originalPrice,
    quantity: opts.quantity,
    inStock: opts.inStock ?? true,
    image: getRealProductImage(id),
    shop: REAL_PRODUCTS.find((rp) => rp.id === id)?.shop ?? shopForKey(id).name,
  };
}

// Seed the cart with real in-store products spread across three shops — gives
// the supplier-grouped Cart / PR / RFQ views something faithful to render, and
// keeps one out-of-stock line so the "สินค้าหมด" path stays exercised.
const SEED: CartItem[] = [
  lineFromProduct("37", { option: "ขนาด 150 g", quantity: 2 }),        // อบเชยเทศ Cinnamon Varum (Alba) — บ้านสมุนไพรไทย
  lineFromProduct("10", { option: "เซ็ต Aromatic คละกลิ่น", quantity: 1 }), // สมุนไพรหอม Aromatic Herbals — บ้านสมุนไพรไทย
  lineFromProduct("3", { option: "Medium Roast · 9 ซอง", quantity: 1 }),  // กาแฟดริป Signature Blend — METAHERB Store
  lineFromProduct("35", { option: "เม็ดแห้ง 100 g", quantity: 1, inStock: false }), // ลูกจันทน์เทศ Nutmeg — กรีนลีฟ ออร์แกนิก
];

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(SEED);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);

  const addToCart: CartValue["addToCart"] = (input) => {
    const addQty = input.quantity ?? 1;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === input.id);
      if (existing) {
        // Same product + option already in cart → bump its quantity.
        return prev.map((i) =>
          i.id === input.id ? { ...i, quantity: Math.min(99, i.quantity + addQty) } : i,
        );
      }
      const line: CartItem = {
        id: input.id,
        productId: input.productId,
        name: input.name,
        option: input.option,
        price: input.price,
        originalPrice: input.originalPrice,
        quantity: addQty,
        inStock: input.inStock ?? true,
        image: input.image,
        shop: input.shop ?? "METAHERB Store",
      };
      return [line, ...prev]; // newest first
    });
  };

  const updateQty = (id: string, quantity: number) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(99, quantity)) } : i)),
    );

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const removeMany = (ids: string[]) =>
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));

  const beginCheckout = (lines: CartItem[]) => setCheckoutItems(lines);

  const finishCheckout = () => {
    const ids = checkoutItems.map((i) => i.id);
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setCheckoutItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        count: items.length,
        addToCart,
        updateQty,
        removeItem,
        removeMany,
        checkoutItems,
        beginCheckout,
        finishCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
